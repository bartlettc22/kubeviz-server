package server

import (
	"fmt"
	"net/http"
	"encoding/json"
  "github.com/gorilla/mux"
  log "github.com/Sirupsen/logrus"
	"github.com/bartlettc22/kubeviz-agent/pkg/data"
)

var clusters map[string]data.DataStruct
var authToken string

func init() {
  clusters = make(map[string]data.DataStruct)
}

func Start(listenerPort int, token string) {
  log.Info("Starting server")

	authToken = token

  router := mux.NewRouter()
  router.HandleFunc("/v1/data", PostData).Methods("POST")
  router.HandleFunc("/v1/metadata", GetMetadata).Methods("GET")
	router.Use(AuthMiddleware)

  server := &http.Server {
    Addr: fmt.Sprintf(":%d", listenerPort),
    Handler: router,
  }

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
				}
    })
}

func PostData(w http.ResponseWriter, r *http.Request) {

  var data data.DataStruct

  json.NewDecoder(r.Body).Decode(&data)
  clusters[data.KubernetesResources.Metadata.ClusterName] = data
  log.Info("[POST] Data")
  fmt.Fprintf(w, "ok");

}

func GetMetadata(w http.ResponseWriter, r *http.Request) {
  log.Info("[GET] Metadata")
	json.NewEncoder(w).Encode(clusters)
}
