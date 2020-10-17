var express = require('express');
var router = express.Router();

// get homepage
router.get('/', function(req, res, next) {
  console.log('logout route called');
  req.session.destroy(function(err) {
    if (err) {
      res.send('Error logging out.');
    }
    res.redirect(process.env.HOST + 'items');
  })
});

module.exports = router;
