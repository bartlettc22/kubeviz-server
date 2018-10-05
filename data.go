package main

import (
	"fmt"
	"net/http"
  "encoding/json"
  // "time"
  // "bytes"
  log "github.com/Sirupsen/logrus"
  // v1 "k8s.io/api/core/v1"
  // metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"github.com/bartlettc22/kube-visualization-agent/pkg/data"
)

// type Cluster struct {
//   Metadata Metadata
//   ResourceList []*metav1.APIResourceList
//   Nodes []v1.Node
//   Namespaces []v1.Namespace
// }
//
// type Metadata struct {
//   ClusterName string
//   KubernetesVersion string
//   AwsAccount string
//   AwsAccountAlias string
//   Region string
//   AgentVersion string
//   RunTime time.Time
//   RunDuration time.Duration
// }

var clusters map[string]data.DataStruct

func InitData() {
  clusters = make(map[string]data.DataStruct)
}

func PostData(w http.ResponseWriter, r *http.Request) {

  var data data.DataStruct

  json.NewDecoder(r.Body).Decode(&data)
  clusters[data.KubernetesResources.Metadata.ClusterName] = data
  log.Info("Data posted")
  fmt.Fprintf(w, "ok");
}
