# Kubernetes Visualization Server
This repo contains the server component of the kubeviz application. This component can be run from the command line but is optimized to run inside a Kubernetes cluster.

### Helm Install

Checkout the repo:
```bash
git clone https://github.com/bartlettc22/kubeviz-server.git
cd kubeviz-server
```

There are a number of Helm variables that are not set by default that need to be defined (either with the `--set` parameter or by including your own values file) in order for the server to work correctly (see [Helm configuration](#helm-configuration) section below)

```bash
helm install --name vault --namespace vault helm_charts/vault
```

# Helm Configuration
| Parameter               | Description                           | Default                                                    |
| ----------------------- | ----------------------------------    | ---------------------------------------------------------- |
| `ComponentName` | Used for resource names and labeling | `kubeviz-server` |
| `Image` | Container image name | `bartlettc/kubeviz-server` |
| `ImageTag` | Container image tag | `0.1.0` |
| `ImagePullPolicy` | Container pull policy | `IfNotPresent` |
| `Replicas` | Container replicas | `1` |
| `HttpPort` | HTTP listener port | `80` |
| `ApiKey` | API Key for server | `` |
| `AwsAccessKey` | AWS Access Key for posting S3 data | `` |
| `AwsSecretKey` | AWS Secret Access Key for posting S3 data | `` |
| `S3Bucket` | S3 bucket for posting data | `` |
| `S3Key` | S3 path for posting data | `` |
| `ingress.enabled` | Enable ingress for the server | `false` |
| `ingress.hosts` | List of hostnames to attach to ingress | `` |
