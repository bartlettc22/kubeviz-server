package reports

import (
  "fmt"
  "encoding/json"
  log "github.com/Sirupsen/logrus"
  "github.com/bartlettc22/kubeviz-server/aws"
  "github.com/bartlettc22/kubeviz-agent/pkg/data"
)

type ClusterInstanceTypes struct {
	Types map[string]*NodeTypeCount
}

type NodeTypeCount struct {
  Masters int
  Nodes int
  Unknown int
}

var TypeData map[string]ClusterInstanceTypes

func init() {
	TypeData = make(map[string]ClusterInstanceTypes)
}

func ProcessInstanceType(data *data.DataStruct) {

  var clusterInstanceTypes ClusterInstanceTypes
  clusterInstanceTypes.Types = make(map[string]*NodeTypeCount)

  for _, p := range data.KubernetesResources.Nodes {
    instanceType := "unknown"
    nodeType := "unknown"
    for labelKey, labelValue := range p.ObjectMeta.Labels {
      if labelKey == "beta.kubernetes.io/instance-type" {
        instanceType = labelValue
      }
      if labelKey == "kubernetes.io/role" {
        nodeType = labelValue
      }

    }

    if _, ok := clusterInstanceTypes.Types[instanceType]; !ok {
      clusterInstanceTypes.Types[instanceType] = &NodeTypeCount{Masters:0,Nodes:0,Unknown:0}
    }

    if nodeType == "master" {
      clusterInstanceTypes.Types[instanceType].Masters++
    } else if nodeType == "node" {
      clusterInstanceTypes.Types[instanceType].Nodes++
    } else {
      clusterInstanceTypes.Types[instanceType].Unknown++
      log.Info("blah")
    }
  }

  TypeData[data.KubernetesResources.Metadata.ClusterName] = clusterInstanceTypes
}

func PostInstanceType(awsClient *aws.Client) {

  output, err := json.Marshal(TypeData)
  if err != nil {
    log.Error("Unable to create JSON output", err)
  }

  go awsClient.PostToS3(output, "instance_type.json")
}
