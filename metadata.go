package main

import (
	// "fmt"
	"net/http"
  "encoding/json"
  // log "github.com/Sirupsen/logrus"
  // mux "github.com/gorilla/mux"
)

func GetMetadata(w http.ResponseWriter, r *http.Request) {
  json.NewEncoder(w).Encode(clusters)
}
