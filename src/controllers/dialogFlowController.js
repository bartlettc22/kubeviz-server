var mongo = require('../models/mongodb');
var request = require('request');
var dataModel = require('../models/data');

exports.post = function(req, res) {

  switch(req.body.result.action) {

    // How many clusters do you know about
    case "input.clusterCount":
      input_clusterCount(req, res);
      break;

    case "input.listClusters":
      input_listClusters(req, res);
      break;

    case "input.allClusterResources":
      input_clusterResources(req, res);
      break;

    case "input.clusterRegion":
      input_clusterRegion(req, res);
      break;

    case "input.audio.websocketCountByCluster":
      input_audioWebsocketCountByCluster(req, res);
      break;
  }
}

function input_clusterCount(req, res) {

  mongo.MongoDbO.collection("rawData").find({}).toArray(function(err, result) {
    dm = new dataModel(result);
    dm.parse();

    count = result.length
    regions = dm.data.filter(o => o.type === "kubernetes.node").map(o => o.metadata["kubernetes.node.region"]).filter(onlyUnique)
    sendResponse(res, "I'm currently tracking "+count+" clusters in "+regions.length+" regions")
  })
}

function input_listClusters(req, res) {

  mongo.MongoDbO.collection("rawData").find({}).toArray(function(err, result) {
    if (err) throw err;

    cluster_list = result.map(o => o.cluster.substr(0, o.cluster.indexOf('.')))

    sendResponse(res, "I'm currently tracking the following clusters: "+cluster_list.join(', '))
  });

}

function input_clusterResources(req, res) {

  var input_cluster = req.body.result.parameters.cluster
  var input_resource = req.body.result.parameters.resource_type

  var cluster = ""
  var cluster_speech = ""
  switch(input_cluster) {
    case "all":
    case "all clusters":
      cluster = "~all~"
      cluster_speech = "across all clusters"
      break;
    default:
      cluster = input_cluster
      cluster_speech = "in the "+cluster+" cluster"
  }

  var resource_type = ""
  switch(input_resource) {
    case "pod":
    case "pods":
      resource_type = "kubernetes.pod"
      break;
    case "namespace":
    case "namespaces":
      resource_type = "kubernetes.namespace"
      break;
    case "deployments":
    case "deployment":
      resource_type = "kubernetes.deployment"
      break;
    case "statefulsets":
    case "statefulset":
      resource_type = "kubernetes.statefulset"
      break;
    case "daemonsets":
    case "daemonset":
      resource_type = "kubernetes.daemonset"
      break;
    case "containers":
    case "container":
      resource_type = "kubernetes.container"
      break;
    case "ingress":
    case "ingresses":
      resource_type = "kubernetes.ingress"
      break;
    case "service":
    case "services":
      resource_type = "kubernetes.service"
      break;
    case "jobs":
    case "job":
      resource_type = "kubernetes.job"
      break;
    case "cron":
    case "crons":
      resource_type = "kubernetes.cron"
      break;
    case "node":
    case "nodes":
      resource_type = "kubernetes.node"
      break;
    case "dns records":
    case "dns record":
      resource_type = "aws.dnsrecord"
      break;
  }

  if(resource_type) {
    mongo.MongoDbO.collection("rawData").find({}).toArray(function(err, result) {
      dm = new dataModel(result);
      dm.parse();

      var resources = dm.data.filter(o => o.type === resource_type)

      if(cluster !== "~all~") {
        resources = resources.filter(o => o.metadata[resource_type+".cluster"].startsWith(cluster))
      }

      sendResponse(res, "There are currently "+resources.length+" "+input_resource+" running "+cluster_speech)
    })
  }
}

function input_clusterRegion(req, res) {

  var input_cluster = req.body.result.parameters.cluster

  mongo.MongoDbO.collection("rawData").find({}).toArray(function(err, result) {
    dm = new dataModel(result);
    dm.parse();

    var resources = dm.data
                    .filter(o => o.type === "kubernetes.node")
                    .filter(o => o.metadata["kubernetes.node.cluster"].startsWith(input_cluster))
                    .map(o => o.metadata["kubernetes.node.region"])

    sendResponse(res, "The "+input_cluster+" cluster is in "+dm.region_map[resources[0]]+" a.k.a. "+resources[0])
  })

}

function input_audioWebsocketCountByCluster(req, res) {

  cluster_name = req.body.result.parameters.cluster
  prometheus_url = req.body.result.parameters.prometheusUrl
  prometheus_stat = req.body.result.parameters.prometheusStat

  getPrometheusMetric(cluster_name, prometheus_url, prometheus_stat, function(result) {
    sendResponse(res, "There are currently "+result+" web socket connections open to the "+cluster_name+" cluster")
  })

}

function sendResponse(res, speech, text) {

  if(!text) {
    text = speech
  }

  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.send('{"speech": "'+speech.replace('"', '\"')+'", "displayText": "'+text.replace('"', '\"')+'", "data": {}, "contextOut": [], "source": "foo"}')
}

function getPrometheusMetric(cluster_name, prometheus_url, prometheus_stat, callback) {

  endEpoch = Math.floor(Date.now() / 1000);
  startEpoch = endEpoch - 300 // Get 5 minutes?

  prometheusUrl = prometheus_url.replace(/\~/g, "")
  query = "query_range?query=sum("+prometheus_stat+")&start="+startEpoch+"&end="+endEpoch+"&step=60"

  request(prometheusUrl+query, { timeout: 5000}, (error, response, body) => {
    if (error) {
      console.log(error);
      callback(error)
    }
    if(response) {
      json_response = JSON.parse(response.body);
      result_values = json_response.data.result[0].values
      last_metric = result_values[result_values.length-1]
      callback(last_metric[1])
    } else {
      callback("error")
    }
  });
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
