var express = require('express');
var router = express.Router();

var stats_controller = require('../controllers/statsController');

router.get('/', stats_controller.sendStats)

module.exports = router;
