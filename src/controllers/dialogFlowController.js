var mongo = require('../models/mongodb');
var request = require('request');

exports.post = function(req, res) {

  switch(req.body.result.action) {

    // How many clusters do you know about
    case "input.clusterCount":
      input_clusterCount(req, res);
      break;

    case "input.listClusters":
      input_listClusters(req, res);
      break;

    case "input.audio.websocketCountByCluster":
      input_audioWebsocketCountByCluster(req, res);
      break;

  }

}

function input_clusterCount(req, res) {

  mongo.MongoDbO.collection("rawData").count(function(err, count) {
    if (err) throw err;
    sendResponse(res, "I'm currently tracking "+count+" clusters in x regions")
  });

}

function input_listClusters(req, res) {

  mongo.MongoDbO.collection("rawData").find({}).toArray(function(err, result) {
    if (err) throw err;

    cluster_list = result.map(o => o.cluster.substr(0, o.cluster.indexOf('.')))

    sendResponse(res, "I'm currently tracking the following clusters: "+cluster_list.join(', '))
  });

}

function input_audioWebsocketCountByCluster(req, res) {

  cluster_name = req.body.result.parameters.cluster
  prometheus_stat = req.body.result.parameters.prometheusStat

  getPrometheusMetric(cluster_name, function(result) {
    sendResponse(res, "There are currently "+result+" web socket connections open to the "+cluster_name+" ")
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

function getPrometheusMetric(cluster_name, prometheus_stat, callback) {

  prometheusUrl = ""
  query = "query_range?query=sum("+prometheus_stat+")&start=1517541376&end=1517543176&step=5"

  request(prometheusUrl+query, { timeout: 5000}, (error, response, body) => {
    if (error) {
      console.log(error);
      callback(error)
    }
    if(response) {

      json_response = JSON.parse(body);
      result_values = json_response.data.result.values
      last_metric = result_values[result_values.length-1]
      callback(last_metric[1])
    } else {
      callback("error")
    }
  });
}
