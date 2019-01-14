var express = require('express');
var router = express.Router();
var Discogs = require('disconnect').Client;
var dotenv = require('dotenv');
dotenv.load();
var fs = require('fs');

/* GET authorization. */
router.get('/', function(req, res, next) {
  var oAuth = new Discogs().oauth();
	oAuth.getRequestToken(
		process.env.CONSUMER_KEY,
		process.env.CONSUMER_SECRET,
		'http://localhost:3000/callback',
		function(err, requestData){
			// Persist "requestData" here so that the callback handler can
			// access it later after returning from the authorize url
      console.log('========== requestData ==========');
      console.log(requestData);
      console.log('=================================');
      fs.writeFile('./data/requestData.json', JSON.stringify(requestData), 'utf8', (err) => {
        if (err) throw err;
        console.log('requestData saved!');
      })
			res.redirect(requestData.authorizeUrl);
		}
	);
});

module.exports = router;
