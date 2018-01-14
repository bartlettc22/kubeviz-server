const express = require('express')
const app = express()
var Memcached = require('memcached');
var extend = require('node.extend');
var bodyParser     =        require("body-parser");
var memcached = new Memcached('localhost:11211');
var clusters = []


app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: false }));

app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
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
  if (clusters.indexOf(cluster) === -1) {
      clusters.push(cluster);
  }

  memcached.set(cluster, data, 3600, function (err) {
    if(err) {
      console.log(err)
    }
  });
}
