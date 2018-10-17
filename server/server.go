package server

import (
  "fmt"
  "time"
  "net/http"
  "encoding/json"
  "github.com/gorilla/mux"
  log "github.com/Sirupsen/logrus"
  "github.com/bartlettc22/kubeviz-agent/pkg/data"
  "github.com/bartlettc22/kubeviz-server/aws"
  "github.com/bartlettc22/kubeviz-server/server/reports"
)

// var clusters map[string]data.DataStruct
var authToken string
var awsClient *aws.Client

func Start(listenerPort int, token string, bucket string, key string) {
  log.Info("Starting server")

  authToken = token

  awsClient, _ = aws.NewClient(&aws.Config {
    S3Bucket: bucket,
    S3Key: key,
  })

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

  reports.ProcessSummary(&data)
  reports.ProcessInstanceType(&data)

  log.Info("[POST] Data")
  fmt.Fprintf(w, "ok");
}

func GetMetadata(w http.ResponseWriter, r *http.Request) {
  log.Info("[GET] Metadata")
	w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(reports.SummaryData)
}

func runPoster() {
  sleepInt := 10 * time.Second
	log.Info("Starting poster go routine every ", sleepInt)
  for {

		reports.PostSummary(awsClient)
    reports.PostInstanceType(awsClient)
    time.Sleep(sleepInt)
  }
}
