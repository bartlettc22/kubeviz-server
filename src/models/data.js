moment = require('moment')

var Data = function (raw_data) {
  this.raw_data = raw_data;
}

Data.prototype.raw_data = {}
Data.prototype.data = []
Data.prototype.region_map = {
  "us-east-2": "US East (Ohio)",
  "us-east-1":"US East (N. Virginia)",
  "us-west-1":"US West (N. California)",
  "us-west-2":"US West (Oregon)",
  "ap-northeast-1":"Asia Pacific (Tokyo)",
  "ap-northeast-2":"Asia Pacific (Seoul)",
  "ap-south-1":"Asia Pacific (Mumbai)",
  "ap-southeast-1":"Asia Pacific (Singapore)",
  "ap-southeast-2": "Asia Pacific (Sydney)",
  "ca-central-1":"Canada (Central)",
  "cn-north-1": "China (Beijing)",
  "cn-northwest-1": "China (Ningxia)",
  "eu-central-1": "EU (Frankfurt)",
  "eu-west-1": "EU (Ireland)",
  "eu-west-2": "EU (London)",
  "eu-west-3": "EU (Paris)",
  "sa-east-1": "South America (Sao Paulo)"
}

Data.prototype.parse = function () {

  var self = this;

  for(var a=0,alen=this.raw_data.length; a<alen; a++) {
    for(var i=0,ilen=this.raw_data[a].data.length;i<ilen;i++) {
      cluster = this.raw_data[a].cluster
      e = this.raw_data[a].data[i];
      switch(e.kind) {
        case "Namespace":
          self.data.push({
            "type": "kubernetes.namespace",
            "metadata": {
              "kubernetes.namespace.uid": cluster+":"+e.metadata.uid,
              "kubernetes.namespace.cluster": cluster,
            },
            "data": {
              "kubernetes.namespace.name": e.metadata.name
            }
          });
          break;
        case "Cluster":
          self.data.push({
            "type": "kops.cluster",
            "metadata": {
              "kops.cluster.uid": e.metadata.name,
              "kops.cluster.created": fmtDate(e.metadata.creationTimestamp)
            },
            "data": {
              "kops.cluster.name": e.metadata.name,
              "kops.cluster.version": e.spec.kubernetesVersion,
              "kops.cluster.topology": e.spec.topology.masters
            }
          });
          break;
        case "DaemonSet":
          self.data.push({
            "type": "kubernetes.daemonset",
            "metadata": {
              "kubernetes.daemonset.uid": cluster+":"+e.metadata.uid,
              "kubernetes.daemonset.namespace": e.metadata.namespace,
              "kubernetes.daemonset.cluster": cluster,
              "kubernetes.daemonset.created": fmtDate(e.metadata.creationTimestamp)
            },
            "data": {
              "kubernetes.daemonset.name": e.metadata.name
            }
          });
          break;
        case "StatefulSet":
          self.data.push({
            "type": "kubernetes.statefulset",
            "metadata": {
              "kubernetes.statefulset.uid": cluster+":"+e.metadata.uid,
              "kubernetes.statefulset.namespace": e.metadata.namespace,
              "kubernetes.statefulset.cluster": cluster,
              "kubernetes.statefulset.created": fmtDate(e.metadata.creationTimestamp)
            },
            "data": {
              "kubernetes.statefulset.name": e.metadata.name,
              "kubernetes.statefulset.replicas": e.spec.replicas,
              "kubernetes.statefulset.readyReplicas": e.status.readyReplicas
            }
          });
          break;
          case "Deployment":
            self.data.push({
              "type": "kubernetes.deployment",
              "metadata": {
                "kubernetes.deployment.uid": cluster+":"+e.metadata.uid,
                "kubernetes.deployment.cluster": cluster,
                "kubernetes.deployment.namespace": e.metadata.namespace,
                "kubernetes.deployment.created": fmtDate(e.metadata.creationTimestamp)
              },
              "data": {
                "kubernetes.deployment.name": e.metadata.name,
                "kubernetes.deployment.replicas": e.spec.replicas,
                "kubernetes.deployment.availableReplicas": e.status.availableReplicas
              }
            });
            break;
          case "Ingress":
            e.spec.rules.forEach(function(v, k) {
              v.http.paths.forEach(function(v2, k2) {
                self.data.push({
                  "type": "kubernetes.ingressrule",
                  "metadata": {
                    "kubernetes.ingressrule.uid": cluster+":"+e.metadata.uid+":"+v.host+":"+v2.path+":"+v2.backend.serviceName+":"+v2.backend.servicePort,
                    "kubernetes.ingressrule.cluster": cluster,
                    "kubernetes.ingressrule.namespace": e.metadata.namespace,
                    "kubernetes.ingressrule.ingressUid": cluster+":"+e.metadata.uid
                  },
                  "data": {
                    "kubernetes.ingressrule.path": v2.path,
                    "kubernetes.ingressrule.serviceName": v2.backend.serviceName,
                    "kubernetes.ingressrule.servicePort": v2.backend.servicePort,
                    "kubernetes.ingressrule.host": v.host
                  }
                });
              })
            })

            if(e.metadata.annotations) {
              ingressClass = e.metadata.annotations["kubernetes.io/ingress.class"]
            }
            self.data.push({
              "type": "kubernetes.ingress",
              "metadata": {
                "kubernetes.ingress.uid": cluster+":"+e.metadata.uid,
                "kubernetes.ingress.namespace": e.metadata.namespace,
                "kubernetes.ingress.cluster": cluster,
                "kubernetes.ingress.ingressClass": (ingressClass || "")
              },
              "data": {
                "kubernetes.ingress.name": e.metadata.name
              }
            });
            break;
          case "Service":
            if(e.spec.type === "NodePort") {
              for(j=0;j<e.spec.ports.length;j++) {
                // Not sure how else to identify the ingress controller nodePort service
                if(e.metadata.labels && e.metadata.labels.app && e.metadata.labels.app === "nginx-ingress") {
                  self.data.push({
                    "type": "kubernetes.ingresscontroller",
                    "metadata": {
                      "kuberentes.ingresscontroller.uid": cluster+":"+e.metadata.uid+":"+e.spec.ports[j].nodePort,
                      "kubernetes.ingresscontroller.cluster": cluster,
                      "kubernetes.ingresscontroller.class": "nginx"
                    },
                    "data": {
                      "kubernetes.ingresscontroller.nodePort": e.spec.ports[j].nodePort,
                      "kubernetes.ingresscontroller.port": e.spec.ports[j].port,
                      "kubernetes.ingresscontroller.targetPort": e.spec.ports[j].targetPort,
                      "kubernetes.ingresscontroller.protocol": e.spec.ports[j].protocol
                    }
                  });
                } else {
                  self.data.push({
                    "type": "kubernetes.nodePort",
                    "metadata": {
                      "kuberentes.nodePort.uid": cluster+":"+e.metadata.uid+":"+e.spec.ports[j].nodePort,
                      "kubernetes.nodePort.serviceUid": cluster+":"+e.metadata.uid,
                      "kubernetes.nodePort.service_name": e.metadata.name,
                      "kubernetes.nodePort.cluster": cluster
                    },
                    "data": {
                      "kubernetes.nodePort.nodePort": e.spec.ports[j].nodePort,
                      "kubernetes.nodePort.port": e.spec.ports[j].port,
                      "kubernetes.nodePort.targetPort": e.spec.ports[j].targetPort,
                      "kubernetes.nodePort.protocol": e.spec.ports[j].protocol
                    }
                  });
                }
              }
            }
            if(e.spec.ports) {
              for(var x=0,xlen=e.spec.ports.length; x < xlen; x++) {
                portdata = e.spec.ports[x];
                self.data.push({
                  "type": "kubernetes.serviceport",
                  "metadata": {
                    "kubernetes.serviceport.uid": cluster+":"+e.metadata.uid+":"+portdata.port+":"+portdata.protocol+":"+portdata.targetPort,
                    "kubernetes.serviceport.namespace": e.metadata.namespace,
                    "kubernetes.serviceport.cluster": cluster,
                    "kubernetes.serviceport.serviceName": e.metadata.name,
                    "kubernetes.serviceport.serviceUid": cluster+":"+e.metadata.uid
                  },
                  "data": {
                    "kubernetes.serviceport.port": portdata.port,
                    "kubernetes.serviceport.protocol": portdata.protocol,
                    "kubernetes.serviceport.targetPort": portdata.targetPort
                  }
                });
              }
            }
            self.data.push({
              "type": "kubernetes.service",
              "metadata": {
                "kubernetes.service.uid": cluster+":"+e.metadata.uid,
                "kubernetes.service.namespace": e.metadata.namespace,
                "kubernetes.service.cluster": cluster
              },
              "data": {
                "kubernetes.service.name": e.metadata.name,
                "kubernetes.service.clusterIP": e.spec.clusterIP,
                "kubernetes.service.type": e.spec.type
              }
            });
            break;
          case "Endpoints":
            for(var w=0,lenw=e.subsets.length; w < lenw; w++) {
              var addresses = (e.subsets[w].addresses || 0);
              var ports = e.subsets[w].ports;
              for(var x=0,lenx=addresses.length; x < lenx; x++) {
                for(var y=0,leny=ports.length; y < leny; y++) {
                  targetRefUid = ""
                  if(addresses[x].targetRef) {
                    targetRefUid = addresses[x].targetRef.uid
                  }
                  self.data.push({
                    "type": "kubernetes.endpointtarget",
                    "metadata": {
                      "kubernetes.endpointtarget.uid": cluster+":"+e.metadata.uid+":"+addresses[x].ip+":"+ports[y].port+":"+ports[y].protocol,
                      "kubernetes.endpointtarget.containerEndpointUid": cluster+":"+targetRefUid+":"+addresses[x].ip+":"+ports[y].protocol+":"+ports[y].port,
                      "kubernetes.endpointtarget.namespace": e.metadata.namespace,
                      "kubernetes.endpointtarget.cluster": cluster
                    },
                    "data": {
                      "kubernetes.endpointtarget.name": e.metadata.name,
                      "kubernetes.endpointtarget.ip": addresses[x].ip,
                      "kubernetes.endpointtarget.port": ports[y].port,
                      "kubernetes.endpointtarget.protocol": ports[y].protocol
                    }
                  });
                }
              }
            }
            break;
        case "ReplicaSet":
          var createdByUid = "none";
          if(e.metadata.hasOwnProperty("ownerReferences")) {
            createdByUid = e.metadata.ownerReferences[0].uid;
          }
          self.data.push({
            "type": "kubernetes.replicaset",
            "metadata": {
              "kubernetes.replicaset.uid": cluster+":"+e.metadata.uid,
              "kubernetes.replicaset.namespace": e.metadata.namespace,
              "kubernetes.replicaset.cluster": cluster,
              "kubernetes.replicaset.createdByUid": cluster+":"+createdByUid,
              "kubernetes.replicaset.created": fmtDate(e.metadata.creationTimestamp)
            },
            "data": {
              "kubernetes.replicaset.name": e.metadata.name,
            }
          });
          break;
        case "Node":
          self.data.push({
            "type": "kubernetes.node",
            "metadata": {
              "kubernetes.node.uid": cluster+":"+e.metadata.uid,
              "kubernetes.node.cluster": cluster,
              "kubernetes.node.region": e.metadata.labels["failure-domain.beta.kubernetes.io/region"],
              "kubernetes.node.az": e.metadata.labels["failure-domain.beta.kubernetes.io/zone"],
              "kubernetes.node.created": fmtDate(e.metadata.creationTimestamp)
            },
            "data": {
              "kubernetes.node.name": e.metadata.name,
              "kubernetes.node.publicIp": e.status.addresses.map(function (a) { if (a.type === "ExternalIP") return a.address; return undefined;})[0],
              "kubernetes.node.privateIp": e.status.addresses.map(function (a) { if (a.type === "InternalIP") return a.address; return undefined;})[0],
              "kubernetes.node.machineType": e.metadata.labels["beta.kubernetes.io/instance-type"],
              "kubernetes.node.kernelVersion": e.status.nodeInfo.kernelVersion,
              "kubernetes.node.osImage": e.status.nodeInfo.osImage,
              "kubernetes.node.role": e.metadata.labels["kubernetes.io/role"]
            }
          });
          break;
        case "Pod":
          var createdByUid = "none";
          var createdByJob = false
          if(e.metadata.hasOwnProperty("annotations") && e.metadata.annotations.hasOwnProperty("kubernetes.io/created-by")) {
            createdByObj = JSON.parse(e.metadata.annotations["kubernetes.io/created-by"]);
            createdByUid = createdByObj.reference.uid;
            if(createdByObj.reference.kind == "Job") {
              createdByJob = true;
            }
          }
          hostNetwork = "false"
          if(e.spec.hostNetwork) {
            hostNetwork = "true"
          }
          numReady = 0
          numRestarts = 0
          state = [];
          e.status.containerStatuses.forEach(function (v, k) {
            if(v.ready === true) {
              numReady++
            }
            numRestarts += v.restartCount
            // state = $.map(v.state, function(v, k) {
            // 	state.
            // })
          })



          self.data.push({
            "type": "kubernetes.pod",
            "metadata": {
              "kubernetes.pod.uid": cluster+":"+e.metadata.uid,
              "kubernetes.pod.createdByUid": cluster+":"+createdByUid,
              "kubernetes.pod.namespace": e.metadata.namespace,
              "kubernetes.pod.node": e.spec.nodeName,
              "kubernetes.pod.cluster": cluster,
              "kubernetes.pod.numContainers": e.spec.containers.length,
              "kubernetes.pod.numReadyContainers": numReady,
              "kubernetes.pod.numContainerRestarts": numRestarts,
              "kubernetes.pod.createdByJob": createdByJob
            },
            "data": {
              "kubernetes.pod.name": e.metadata.name,
              "kubernetes.pod.hostNetwork": hostNetwork,
              "kubernetes.pod.podIP": e.status.podIP
            }
          });
          for(j=0;j<e.spec.containers.length;j++) {
            c = e.spec.containers[j];

            containerEndpoints = {}
            if(c.ports) {
              containerEndpoints=c.ports.map(function(v,k) {
                ep = e.status.podIP+":"+v.protocol+":"+v.containerPort
                self.data.push({
                  "type": "kubernetes.containerendpoint",
                  "metadata": {
                    "kubernetes.containerendpoint.uid": cluster+":"+e.metadata.uid+":"+ep,
                    "kubernetes.containerendpoint.containerUid": cluster+":"+e.metadata.uid+":"+c.name,
                  },
                  "data": {
                    "kubernetes.containerendpoint.endpoint": e.status.podIP+":"+v.protocol+":"+v.containerPort
                  }
                });
                // return e.status.podIP+":"+v.protocol+":"+v.containerPort;
              });
            }

            // Look up conatiner status for this container
            containerStatus = e.status.containerStatuses.filter(o => o.name === c.name);
            containerState = [];
            for(k in containerStatus[0].state) {
              var state = JSON.parse(JSON.stringify(containerStatus[0].state[k]));
              state.state = k
              containerState.push(state);
            }
            // containerState = .map(function (v, k) {
            //   var state = $.extend({}, v);
            //   state.state = k
            //   return state
            // })

            self.data.push({
              "type": "kubernetes.container",
              "joindata": {
                "kubernetes.container.podUid": cluster+":"+e.metadata.uid
              },
              "metadata": {
                "kubernetes.container.uid": cluster+":"+e.metadata.uid+":"+c.name,
                "kubernetes.container.cluster": cluster,
                "kubernetes.container.namespace": e.metadata.namespace
              },
              "data": {
                "kubernetes.container.name": c.name,
                "kubernetes.container.image": c.image,
                "kubernetes.container.ready": containerStatus[0].ready,
                "kubernetes.container.restartCount": containerStatus[0].restartCount,
                "kubernetes.container.state": containerState[0].state,
                "kubernetes.container.stateStartedAt": containerState[0].startedAt,
                "kubernetes.container.stateReason": containerState[0].reason,
                "kubernetes.container.stateFinishedAt": containerState[0].finishedAt,
                "kubernetes.container.stateExitCode": containerState[0].exitCode,

              }
            });
          }
          break;
        case "DnsRecord":
          // isPrivateZone = $.map(json, function(e) {
          //   if(e.kind == "HostedZone") {
          //     return e.HostedZone.Config.PrivateZone
          //   } else {
          //     return undefined
          //   }
          // })
          var targets = []
          if(e.AliasTarget) {
            targets = [e.AliasTarget.DNSName.substring(0, e.AliasTarget.DNSName.length - 1)]
          } else {
            targets = e.ResourceRecords.map(function(v, k) {
              return v.Value
            });
          }
          for(var x=0,xlen=targets.length;x < xlen; x++) {
            self.data.push({
              "type": "aws.dnsrecordtarget",
              "joindata": {
                "aws.dnsrecordtarget.cluster": cluster
              },
              "metadata": {
                "aws.dnsrecordtarget.uid": e.hostedZoneId+":"+e.Name+":"+targets[x],
                "aws.dnsrecordtarget.dnsRecordUid": e.hostedZoneId+":"+e.Name,
              },
              "data": {
                "aws.dnsrecordtarget.target": targets[x]
              }
            });
          }
          self.data.push({
            "type": "aws.dnsrecord",
            "joindata": {
              "aws.dnsrecord.cluster": cluster
            },
            "metadata": {
              "aws.dnsrecord.uid": e.hostedZoneId+":"+e.Name,
              // "aws.dnsrecord.targets": targets,
              "aws.dnsrecord.type": e.Type
            },
            "data": {
              "aws.dnsrecord.name": e.Name.replace(/\.$/, ""),
              "aws.dnsrecord.ttl": e.TTL,
              "aws.dnsrecord.hostedZoneId": e.hostedZoneId
              // "aws.dnsrecord.isPrivate": isPrivateZone[0]
            }
          });
          break;
        case "LoadBalancer":
          for(j=0;j<e.ListenerDescriptions.length;j++) {
            listener = e.ListenerDescriptions[j].Listener
            self.data.push({
              "type": "aws.loadbalancerlistener",
              "metadata": {
                "aws.loadbalancerlistener.uid": e.LoadBalancerName+""+listener.LoadBalancerPort,
                "aws.loadbalancerlistener.port": listener.LoadBalancerPort,
                "aws.loadbalancerlistener.protocol": listener.Protocol,
                "aws.loadbalancerlistener.lb_name": e.LoadBalancerName,
                "aws.loadbalancerlistener.instanceProtocol": listener.InstanceProtocol,
                "aws.loadbalancerlistener.instancePort": listener.InstancePort,
                "aws.loadbalancerlistener.cluster": cluster,
              },
              "data": {
                "aws.loadbalancerlistener.ident": listener.Protocol+":"+listener.LoadBalancerPort
              }
            });
          }
          self.data.push({
            "id": e.DNSName,
            "type": "aws.loadbalancer",
            "metadata": {
              "aws.loadbalancer.dns": e.DNSName,
              "aws.loadbalancer.createdTime": fmtDate(e.CreatedTime),
              "aws.loadbalancer.cluster": cluster,
            },
            "data": {
              "aws.loadbalancer.type": "classic",
              "aws.loadbalancer.name": e.LoadBalancerName,
              "aws.loadbalancer.scheme": e.Scheme
            }
          });
          break;
        case "LoadBalancerV2":
          self.data.push({
            "id": e.LoadBalancerArn,
            "type": "aws.loadbalancer",
            "metadata": {
              "aws.loadbalancer.arn": e.LoadBalancerArn,
              "aws.loadbalancer.dns": e.DNSName,
              "aws.loadbalancer.createdTime": fmtDate(e.CreatedTime),
              "aws.loadbalancer.cluster": cluster,
            },
            "data": {
              "aws.loadbalancer.type": e.Type,
              "aws.loadbalancer.name": e.LoadBalancerName,
              "aws.loadbalancer.scheme": e.Scheme
            }
          });
          break;
        case "LoadBalancerListener":
          self.data.push({
            "type": "aws.loadbalancerlistener",
            "metadata": {
              "aws.loadbalancerlistener.arn": e.ListenerArn,
              "aws.loadbalancerlistener.lb_arn": e.LoadBalancerArn,
              "aws.loadbalancerlistener.port": e.Port,
              "aws.loadbalancerlistener.protocol": e.Protocol,
              "aws.loadbalancerlistener.numCerts": e.Certificates.length,
              "aws.loadbalancerlistener.instanceProtocol": "",
              "aws.loadbalancerlistener.instancePort": "",
              "aws.loadbalancerlistener.cluster": cluster,
            },
            "data": {
              "aws.loadbalancerlistener.ident": e.Protocol+":"+e.Port
            }
          });
          break;
        case "ListenerRule":
          var hostHeader = "";
          var action = "";
          if(e.Actions) {
            var action = e.Actions[0].TargetGroupArn
          }
          for(j=0;j<e.Conditions.length;j++) {
            if(e.Conditions[j].Field == "host-header") {
              hostHeader = e.Conditions[j].Values[0]
            }
          }

          self.data.push({
            "type": "aws.listenerrule",
            "metadata": {
              "aws.listenerrule.arn": e.RuleArn,
              "aws.listenerrule.priority": e.Priority,
              "aws.listenerrule.isDefault": e.IsDefault,
              "aws.listenerrule.action": action,
              "aws.listenerrule.cluster": cluster,
              "aws.listenerrule.listener_arn": e.RuleArn.split("/")[0].replace(/listener-rule/, "listener")+
                                                    "/"+e.RuleArn.split("/")[1]+
                                                    "/"+e.RuleArn.split("/")[2]+
                                                    "/"+e.RuleArn.split("/")[3]+
                                                    "/"+e.RuleArn.split("/")[4]
            },
            "data": {
              "aws.listenerrule.hostHeader": hostHeader
            }
          });
          break;
        case "TargetGroup":
          self.data.push({
            "id": e.TargetGroupArn,
            "type": "aws.targetgroup",
            "metadata": {
              "aws.targetgroup.arn": e.TargetGroupArn,
              "aws.targetgroup.loadBalancerArns": e.LoadBalancerArns,
              "aws.targetgroup.cluster": cluster
            },
            "data": {
              "aws.targetgroup.name": e.TargetGroupName,
              "aws.targetgroup.protocol": e.Protocol,
              "aws.targetgroup.port": e.Port,
            }
          });
          break;
        case "AutoscalingGroup":
          instances = e.Instances.map(function(v, k) {
            return [v.InstanceId]
          });
          self.data.push({
            "id": e.AutoScalingGroupARN,
            "type": "aws.autoscalinggroup",
            "metadata": {
              "aws.autoscalinggroup.loadBalancerNames": e.LoadBalancerNames,
              "aws.autoscalinggroup.targetGroupARNs": e.TargetGroupARNs,
              "aws.autoscalinggroup.instances": instances
            },
            "data": {
              "aws.autoscalinggroup.name": e.AutoScalingGroupName,
              "aws.autoscalinggroup.minSize": e.MinSize,
              "aws.autoscalinggroup.maxSize": e.MaxSize,
              "aws.autoscalinggroup.desiredCapacity": e.DesiredCapacity
            }
          });
          break;
        case "InstanceGroup":
          self.data.push({
            "id": cluster+"-"+e.metadata.name,
            "type": "kops.instancegroup",
            "data": {
              "kops.instancegroup.name": e.metadata.name,
              "kops.instancegroup.cluster": e.metadata.labels["kops.k8s.io/cluster"],
              "kops.instancegroup.role": e.spec.role,
              "kops.instancegroup.ami": e.spec.image,
              "kops.instancegroup.minSize": e.spec.minSize,
              "kops.instancegroup.maxSize": e.spec.maxSize,
              "kops.instancegroup.machineType": e.spec.machineType,
              "kops.instancegroup.cluster": cluster
            }
          });
          break;
        case "Instance":
          self.data.push({
            "id": e.InstanceId,
            "type": "aws.instance",
            "metadata": {
              "aws.instance.launchTime": fmtDate(e.LaunchTime)
            },
            "data": {
              "aws.instance.id": e.InstanceId,
              "aws.instance.instanceType": e.InstanceType,
              "aws.instance.privateIpAddress": e.PrivateIpAddress
            }
          });

          break;
        default:
          break;
      }
    }
  }

}

function fmtDate(json_date) {
  return moment.utc(json_date).local().format('MM/DD/YY, h:mm a')
}

module.exports = Data;
