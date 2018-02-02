var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://"+process.env.MONGODB_HOST+":27017/";
var MongoDb
var MongoDbO

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  MongoDb = db
  MongoDbO = db.db("kubeviz");

  MongoDbO.createCollection("rawData")

  exports.MongoDb = MongoDb
  exports.MongoDbO = MongoDbO

  exports.set = function(collection, query, data) {

    // Upsert the raw data
    MongoDbO.collection(collection).update(query, data, {"upsert": true}, function(err, res) {
      if (err) throw err;
      console.log(res.result);
    });
  }

});
