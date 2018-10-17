package reports

import (
  "encoding/json"
  "strings"
  "time"
  log "github.com/Sirupsen/logrus"
  "github.com/bartlettc22/kubeviz-agent/pkg/data"
  "github.com/bartlettc22/kubeviz-server/aws"
  v1 "k8s.io/api/core/v1"
)

type Metadata struct {
	ClusterName string
	Region string
	K8sVersion string
	K8sNumNodes int
	AwsAccount string
  RbacEnabled bool
  TillerVersion string
  IngressControllerVersion string
  AsOf time.Time
}

var SummaryData map[string]Metadata

func init() {
	SummaryData = make(map[string]Metadata)
}

func ProcessSummary(data *data.DataStruct) {
  SummaryData[data.KubernetesResources.Metadata.ClusterName] = Metadata{
    ClusterName: data.KubernetesResources.Metadata.ClusterName,
    Region: data.KubernetesResources.Metadata.Region,
    K8sVersion: data.KubernetesResources.Metadata.KubernetesVersion,
    K8sNumNodes: len(data.KubernetesResources.Nodes),
    AwsAccount: data.AwsResources.Metadata.AwsAccountAlias + "(" + data.AwsResources.Metadata.AwsAccount + ")",
    RbacEnabled: isRbacEnabled(&data.KubernetesResources.Pods),
    TillerVersion: getTillerVersion(&data.KubernetesResources.Pods),
    IngressControllerVersion: getIngressControllerVersion(&data.KubernetesResources.Pods),
    AsOf: data.Metadata.RunTime,
  }
}

func PostSummary(awsClient *aws.Client) {
  var outputMap []Metadata
  for _, v := range SummaryData {
    outputMap = append(outputMap, v)
  }

  output, err := json.Marshal(outputMap)
  if err != nil {
    log.Error("Unable to create JSON output", err)
  }

  go awsClient.PostToS3(output, "summary.json")
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

func getIngressControllerVersion(pods *[]v1.Pod) string {
	for _, p := range *pods {
    for labelKey, labelValue := range p.ObjectMeta.Labels {
      if(labelKey == "app" && labelValue=="nginx-ingress") {
        for _, c := range p.Spec.Containers {
          if (c.Name == "nginx-ingress-controller") {
            imageParts := strings.Split(c.Image, ":")
            return imageParts[1]
          }
        }
      }
    }
	}
  return ""
}
