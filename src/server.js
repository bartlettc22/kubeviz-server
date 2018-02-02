var express         = require('express')
var app             = express()
var extend          = require('node.extend');
var bodyParser      = require("body-parser");

// Authenticate all incoming requests
app.use(function(req, res, next) {
  if (req.header("X-KubeViz-Token") !== process.env.X_KUBEVIZ_TOKEN) {
    return res.sendStatus(401);
  }
  next();
});

// Parse json bodies
app.use(bodyParser.json({limit: 1024102420, type:'application/json'}));

// On error log in a centralized way
app.use(logErrors)

// Add access control headers (CORS) to all responses
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range,X-KubeViz-Token");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
  next();
 });

// Routes
var data = require('./routes/data');
app.use('/data', data);
var stats = require('./routes/stats');
app.use('/stats', stats);
var dialogFlow = require('./routes/dialogFlow');
app.use('/dialogFlow', dialogFlow);

// Respond to OPTIONS requests
app.options("/*", function(req, res, next){
  res.send(200);
});

app.listen(80, () => console.log('App listening on port 80!'))

function logErrors (err, req, res, next) {
  if(req.query.cluster) {
    console.log("Error with data from cluster: "+req.query.cluster);
    console.error(err.stack)
  }
  next(err)
}
