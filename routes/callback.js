var express = require('express');
var router = express.Router();
var Discogs = require('disconnect').Client;

// get callback
router.get('/', function(req, res, next) {
  var requestData = req.session.requestData;
  var oAuth = new Discogs(requestData).oauth();
	oAuth.getAccessToken(
		req.query.oauth_verifier, // Verification code sent back by Discogs
		function(err, accessData){
			// Persist "accessData" here for following OAuth calls
      req.session.accessData = accessData;
      res.redirect(process.env.HOST + 'items');
		}
	);
});

module.exports = router;
