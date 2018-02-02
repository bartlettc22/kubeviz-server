var mongo = require('../models/mongodb');

exports.sendStats = function(req, res) {

  mongo.MongoDbO.collection("rawData").find({}).toArray(function(err, result) {
    if (err) throw err;

    res.status(200);
    res.send("hey")
  });

};
