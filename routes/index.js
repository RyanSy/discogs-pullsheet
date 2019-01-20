var express = require('express');
var router = express.Router();
var accessData = require('../data/accessData.json');

/* GET home page. */
router.get('/', function(req, res, next) {
  if (accessData.level == 2) {
    res.redirect(process.env.HOST + 'items');
  } else {
    res.render('index', {
      title: 'Discogs Pullsheet',
      host: process.env.HOST
    });
  }
});

module.exports = router;
