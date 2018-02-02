var express = require('express');
var router = express.Router();

var dialogFlowController = require('../controllers/dialogFlowController');

router.post('/', dialogFlowController.post),

module.exports = router;
