var express = require('express');
var router = express.Router();
var Discogs = require('disconnect').Client;
var accessData = require('../data/accessData.json');

/* GET identity. */
router.get('/', function(req, res, next) {
  var dis = new Discogs(accessData);
  dis.getIdentity(function(err, data){
    if (err) {
      console.log(err);
      res.send('Error');
    }
		res.send(data);
	});
});

module.exports = router;
