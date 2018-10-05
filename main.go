package main

import (
	"net/http"
  log "github.com/Sirupsen/logrus"
  mux "github.com/gorilla/mux"
	"github.com/spf13/viper"
)

func main() {

  InitData()

  router := mux.NewRouter()

  server := &http.Server {
    Addr: ":8080",
    Handler: router,
  }

  router.HandleFunc("/v1/data", PostData).Methods("POST")
  router.HandleFunc("/v1/metadata", GetMetadata).Methods("GET")

  log.Fatal(server.ListenAndServe())
}
