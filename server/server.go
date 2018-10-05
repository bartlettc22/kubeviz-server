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

func init() {
  clusters = make(map[string]data.DataStruct)
}

func Start(listenerPort int) {
  log.Info("Starting server")

  router := mux.NewRouter()
  router.HandleFunc("/v1/data", PostData).Methods("POST")
  router.HandleFunc("/v1/metadata", GetMetadata).Methods("GET")

  server := &http.Server {
    Addr: fmt.Sprintf(":%d", listenerPort),
    Handler: router,
  }

  log.Info("Listening on port ", listenerPort)
  log.Fatal(server.ListenAndServe())
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
