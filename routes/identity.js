var express = require('express');
var router = express.Router();
var Discogs = require('disconnect').Client;
var accessData = require('../data/accessData.json');

/* GET identity. */
router.get('/', function(req, res, next) {
  var dis = new Discogs('DiscogsPullsheet/0.1', accessData);
  dis.getIdentity(function(err, data){
		res.send(data);
	});
});

module.exports = router;
