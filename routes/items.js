var express = require('express');
var router = express.Router();
var Discogs = require('disconnect').Client;
var moment = require('moment');

router.get('/', function(req, res, next) {
  var accessData = req.session.accessData;

  /* GET identity */
  var dis = new Discogs(accessData);
  var username;
  dis.getIdentity(function(err, data) {
    if (err) {
      console.log(err);
      res.send('Error - You must authenticate to access this resource.');
    }
		username = data.username;
	});

  /* GET items. */
  var mp = new Discogs(accessData).marketplace();
  mp.getOrders({status: 'Payment Received' || 'Payment Pending'}, function(err, data) {
    if (err) {
      console.log(err);
      res.send('Error, please refresh this page.');
    }
    var orders = data.orders;
    var ordersArray = [];
    for (var i = 0; i < orders.length; i++) {
      var order = {};
      order.id = orders[i].id;
      order.created = moment(orders[i].created).format('lll');
      order.status = orders[i].status;
      order.items = [];
      for (var j = 0; j < orders[i].items.length; j++) {
        var item = {};
        item.item_location = orders[i].items[j].item_location;
        item.description = orders[i].items[j].release.description;
        item.thumbnail = orders[i].items[j].release.thumbnail;
        order.items.push(item);
      }
      ordersArray.push(order);
    }
    res.render('items', {username: username, orders: ordersArray});
  });
});

module.exports = router;
