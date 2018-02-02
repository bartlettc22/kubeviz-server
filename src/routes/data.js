var express = require('express');
var router = express.Router();

var data_controller = require('../controllers/dataController');

router.get('/', data_controller.get);
router.post('/', data_controller.post);
router.get('/parsed', data_controller.getParsed);

module.exports = router;
