var express = require('express');
var router = express.Router();

// get homepage
router.get('/', function(req, res, next) {
  if (!req.session.accessData) {
    res.render('index', {
      host: process.env.HOST,
    });
  } else {
    res.redirect(process.env.HOST + '/items');
  }
});

module.exports = router;
