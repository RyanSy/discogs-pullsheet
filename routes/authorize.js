var express = require('express');
var router = express.Router();
var Discogs = require('disconnect').Client;

// get authorization
router.get('/', function(req, res, next) {
  var oAuth = new Discogs().oauth();
	oAuth.getRequestToken(
		process.env.CONSUMER_KEY,
		process.env.CONSUMER_SECRET,
		process.env.HOST + 'callback',
		function(err, requestData){
      if (err) {
        console.log(err);
        res.send("Error");
      }
			// Persist "requestData" here so that the callback handler can
			// access it later after returning from the authorize url
      req.session.requestData = requestData;
			res.redirect(requestData.authorizeUrl);
		}
	);
});

module.exports = router;
