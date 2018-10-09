package server

import (
  "fmt"
  "time"
  "strings"
  "net/http"
  "encoding/json"
  "github.com/gorilla/mux"
  log "github.com/Sirupsen/logrus"
  "github.com/bartlettc22/kubeviz-agent/pkg/data"
  "github.com/bartlettc22/kubeviz-server/aws"
  v1 "k8s.io/api/core/v1"
)

// var clusters map[string]data.DataStruct
var authToken string
var s3Bucket string
var s3Key string

type Metadata struct {
	ClusterName string
	Region string
	K8sVersion string
	K8sNumNodes int
	AwsAccount string
  RbacEnabled bool
  TillerVersion string
}

var summaryData map[string]Metadata

func init() {
  // clusters = make(map[string]data.DataStruct)
	summaryData = make(map[string]Metadata)
}

func Start(listenerPort int, token string, bucket string, key string) {
  log.Info("Starting server")

  authToken = token
	s3Bucket = bucket
	s3Key = key

  router := mux.NewRouter()
  router.HandleFunc("/v1/data", PostData).Methods("POST")
  router.HandleFunc("/v1/metadata", GetMetadata).Methods("GET")
  router.Use(AuthMiddleware)

  server := &http.Server {
    Addr: fmt.Sprintf(":%d", listenerPort),
    Handler: router,
  }

	go runPoster()

  log.Info("Listening on port ", listenerPort)
  log.Fatal(server.ListenAndServe())


}

func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("X-Kubeviz-Token")

        if authToken != "" {
          // Auth is required
          if (token != "" && token == authToken) {
            // Pass down the request to the next middleware (or final handler)
            next.ServeHTTP(w, r)
          } else {
            // Write an error and stop the handler chain
            http.Error(w, "", http.StatusForbidden)
          }
        } else {
					next.ServeHTTP(w, r)
				}
    })
}

func PostData(w http.ResponseWriter, r *http.Request) {

  var data data.DataStruct

  json.NewDecoder(r.Body).Decode(&data)
  // clusters[data.KubernetesResources.Metadata.ClusterName] = data

	summaryData[data.KubernetesResources.Metadata.ClusterName] = Metadata{
		ClusterName: data.KubernetesResources.Metadata.ClusterName,
		Region: data.KubernetesResources.Metadata.Region,
		K8sVersion: data.KubernetesResources.Metadata.KubernetesVersion,
		K8sNumNodes: len(data.KubernetesResources.Nodes),
		AwsAccount: data.AwsResources.Metadata.AwsAccountAlias + "(" + data.AwsResources.Metadata.AwsAccount + ")",
    RbacEnabled: isRbacEnabled(&data.KubernetesResources.Pods),
    TillerVersion: getTillerVersion(&data.KubernetesResources.Pods),
	}

  log.Info("[POST] Data")
  fmt.Fprintf(w, "ok");
}

func GetMetadata(w http.ResponseWriter, r *http.Request) {
  log.Info("[GET] Metadata")
	w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(summaryData)
}

func runPoster() {
  sleepInt := 10 * time.Second
	log.Info("Starting poster go routine every ", sleepInt)
  for {

		var outputMap []Metadata
		// outputMap = make(map[]Metadata)
		for _, v := range summaryData {
    	outputMap = append(outputMap, v)
    }

		output, err := json.Marshal(outputMap)
		if err != nil {
			log.Error("Unable to create JSON output", err)
		}

		go aws.PostToS3(output, s3Bucket, s3Key)
    time.Sleep(sleepInt)
  }
}

func isRbacEnabled(pods *[]v1.Pod) bool {
	for _, p := range *pods {
		for labelKey, labelValue := range p.ObjectMeta.Labels {
      if labelKey == "k8s-app" && labelValue == "kube-apiserver" {
        for _, c := range p.Spec.Containers {
          if (c.Name == "kube-apiserver") {
            for _, com := range c.Command {
              if (strings.Contains(com, "authorization-mode=RBAC")) {
                return true
              }
            }
            return false
          }
        }
      }
    }
	}
  return false
}

func getTillerVersion(pods *[]v1.Pod) string {
	for _, p := range *pods {
    if p.GetNamespace() == "kube-system" {
      for labelKey, labelValue := range p.ObjectMeta.Labels {
        if(labelKey == "name" && labelValue=="tiller") {
          for _, c := range p.Spec.Containers {
            if (c.Name == "tiller") {
              imageParts := strings.Split(c.Image, ":")
              return imageParts[1]
            }
          }
        }
      }
    }
	}
  return ""
}
