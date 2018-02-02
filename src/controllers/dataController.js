// var mc = require('../models/memcached');
var mongo = require('../models/mongodb');
var dataModel = require('../models/data');

exports.getParsed = function(req, res) {

  mongo.MongoDbO.collection("rawData").find({}).toArray(function(err, result) {
    if (err) throw err;
    dm = new dataModel(result);
    dm.parse();
    res.status(200);
    res.send(dm.data)
  });

};

exports.get = function(req, res) {

  mongo.MongoDbO.collection("rawData").find({}).toArray(function(err, result) {
    if (err) throw err;
    res.status(200);
    res.send(result)
  });

};

exports.post = function(req, res) {
  try {
      setRawData(req.query.cluster, req.body)

      data = new dataModel.Data(req.body);
  } catch(e) {
      console.log(e);
      res.sendStatus(500);
  }

  res.sendStatus(200);
};

function setRawData(cluster, data) {

  // Set raw cluster data
  mongo.set("rawData", {"cluster": cluster}, {"cluster": cluster, "data": data})

}
