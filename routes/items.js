var express = require('express');
var router = express.Router();
const discogs = require('../lib/discogs');
const paypal = require('../lib/paypal');

// render items view with list of discogs orders with 'payment received' status
router.get('/', function(req, res, next) {
  const accessData = req.session.accessData;
  
  // Initialize...
  (async function() {
    const paypalAccessToken = await paypal.getAccessToken();
    const paypalTransactions = await paypal.getTransactions(paypalAccessToken);
    const paymentReceivedOrders = await discogs.getOrders(accessData, 'Payment Received', paypalTransactions, next);
    const username = await discogs.getIdentity(accessData, next);
    let message;
    paymentReceivedOrders.length === 0 ? message = 'No new orders found.' : message = null;
    const responseObj = {
      username: username,
      orders: paymentReceivedOrders,
      message: message
    }

    res.render('items', responseObj);
  })();
});

module.exports = router;