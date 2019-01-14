var express = require('express');
var router = express.Router();
var Discogs = require('disconnect').Client;
var accessData = require('../data/accessData.json');

/* GET items. */
router.get('/', function(req, res, next) {
  var mp = new Discogs(accessData).marketplace();
  mp.getOrders({status: 'Payment Pending'}, function(err, data) {
    if (err) {
      console.log(err);
      res.send('Error');
    }

    // Since we have 15 old orders with Pyment Pending statuses that cannot be changed, start from there
    var allOrders = data.orders;
    var currentOrders = [];
    for (var i = 15; i < allOrders.length; i++) {
      currentOrders.push(allOrders[i]);
    }

    var items = [];
    for (var j = 0; j < currentOrders.length; j++) {
      items.push(currentOrders[j].items);
    }

    // Send JSON for now, worry about rendering .hbs view later
    res.send(items);
  });
});

module.exports = router;
