const express = require('express')
const app = express()
var Memcached = require('memcached');
var extend = require('node.extend');
var bodyParser     =        require("body-parser");
var memcached = new Memcached('localhost:11211', {"maxValue": 5242880});
var clusters = []
var cluster_stats = {}

app.use(bodyParser.json({limit: 1024102420, type:'application/json'}));
app.use(logErrors)
// bodyParser.urlencoded({limit: 50000000, extended: false })
// app.use(bodyParser);
// app.use(bodyParser);

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range,X-KubeViz-Token");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
  next();
 });

app.get('/data', function (req, res, next) {
  if(req.header("X-KubeViz-Token") === process.env.X_KUBEVIZ_TOKEN) {
    res.status(200);
    sendData(res);
  } else {
    res.sendStatus(401);
  }
})

app.post('/data', function (req, res, next) {
  if(req.header("X-KubeViz-Token") === process.env.X_KUBEVIZ_TOKEN) {
    try {
        setData(req.query.cluster, req.body)
    } catch(e) {
        console.log(e);
        res.sendStatus(500);
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(401);
  }
})

app.get('/stats', function (req, res, next) {
  if(req.header("X-KubeViz-Token") === process.env.X_KUBEVIZ_TOKEN) {
    res.status(200);
    res.send(cluster_stats);
  } else {
    res.sendStatus(401);
  }
})

app.options("/*", function(req, res, next){
  res.send(200);
});

app.listen(80, () => console.log('App listening on port 80!'))

function sendData(res) {
  memcached.getMulti(clusters, function (err, data) {
    if(err) {
      console.log(err);
    } else {
      res.send(data)
    }
  });
}

function setData(cluster, data) {

  // Add cluster to cluster list if not already there
  if (clusters.indexOf(cluster) === -1) {
      clusters.push(cluster);
  }

  var stats = data.find(o => o.kind === 'agentStats');
  cluster_stats[cluster] = stats
  cluster_stats[cluster].num_records = data.length

  // Set main cluster data
  memcached.set(cluster, data, 3600, function (err) {
    if(err) {
      console.log(err)
    }
  });
}

function logErrors (err, req, res, next) {
  if(req.query.cluster) {
    console.log("Error with data from cluster: "+req.query.cluster);
    console.error(err.stack)
  }
  next(err)
}
