var express = require('express');
var router = express.Router();
var Discogs = require('disconnect').Client;
var requestData = require('../data/requestData.json');
var fs = require('fs');

/* GET callback. */
router.get('/', function(req, res, next) {
  var oAuth = new Discogs(requestData).oauth();
	oAuth.getAccessToken(
		req.query.oauth_verifier, // Verification code sent back by Discogs
		function(err, accessData){
			// Persist "accessData" here for following OAuth calls
      fs.writeFileSync('./data/accessData.json', JSON.stringify(accessData), 'utf8', (err) => {
        if (err) {
          console.log(err);
        }
        console.log('accessData saved!');
      });
      res.redirect(process.env.HOST + 'items');
		}
	);
});

module.exports = router;
