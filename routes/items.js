var express = require('express');
var router = express.Router();
var moment = require('moment');
var start_date = moment().subtract(7, 'days').format();
var end_date = moment().format();

const Discogs = require('disconnect').Client;
const paypal = require('../api/paypal');

router.get('/', function(req, res) {
  const accessData = req.session.accessData;
  const dis = new Discogs(accessData);
  const mp = new Discogs(accessData).marketplace();

  // get Discogs orders
  function getDiscogsOrders(status, paypal_transactions) {
    return mp.getOrders({ status: status, created_after: start_date })
      .then(async function (data) {
        var orders = data.orders;
        var ordersArray = [];
        for (var i = 0; i < orders.length; i++) {          
          if (moment(orders[i].created) > moment(start_date)) {
            var order = {};
            var order_id = orders[i].id;
            var paypal_data = {};
            for (var j = 0; j < paypal_transactions.length; j++) {
              if (order_id == paypal_transactions[j].invoice_id) {
                paypal_data = paypal_transactions[j];
              }
            }
            order.id = order_id;
            order.date = orders[i].created;
            order.created = moment(orders[i].created).format('lll');
            order.updated = moment(orders[i].last_activity).format('lll');
            order.buyer = orders[i].buyer.username;
            order.status = orders[i].status;
            order.total = orders[i].total.value;
            order.additional_instructions = orders[i].additional_instructions;
            order.shipping_method = orders[i].shipping.method;
            order.shipping_amount = orders[i].shipping.value;
            order.shipping_address = orders[i].shipping_address;
            order.paypal_data = paypal_data;
            order.messages = await getDiscogsOrderMessages(order_id);
            order.items = [];
            for (var j = 0; j < orders[i].items.length; j++) {
              var item = {};
              item.item_location = orders[i].items[j].item_location;
              item.description = orders[i].items[j].release.description;
              item.price = orders[i].items[j].price.value;
              item.thumbnail = orders[i].items[j].release.thumbnail;
              order.items.push(item);
            }
            ordersArray.push(order);
          }
        }

        return ordersArray;
      })
      .catch(function(error) {
        console.log(`Error getting Discogs ${status} orders.`);
        catchError(error);
        res.send('Server error.');
      });
  }

  // get Discogs order messages
  function getDiscogsOrderMessages(order_id) {
    return mp.getOrderMessages(order_id)
      .then(function(data) {
        var messages = [];
        for (var i = 0; i < data.messages.length; i++) {
          if (data.messages[i].type === 'message') {
            var messageObj = {};
            messageObj.from = data.messages[i].from.username;
            messageObj.message = data.messages[i].message;
            messageObj.timestamp = moment(data.messages[i].timestamp).format('MMM D, YYYY h:mma');
            messages.push(messageObj);
          }
        }
        return messages;
      })
      .catch(function(error) {
        console.log('Error getting Discogs order messages.');
        catchError(error);
        res.send('Server error.');
      });
  }

  // get Discogs username
  function getDiscogsUsername() {
    return dis.getIdentity()
      .then(function(data) {
        var username = data.username;
        return username;
      })
      .catch(function(error) {
        console.log('Error getting Discogs username.');
        catchError(error);
        res.send('Server error.');
      });
  }

  // error handler
  function catchError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(error.response.data);
      console.log(error.response.status);
      //  console.log(error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error', error.message);
      console.log(error);
    }
    console.log(error.config);
  }

  // Initialize...
  (async function() {
    console.log('initializing...');

    const paypalAccessToken = await paypal.getAccessToken();
    const paypalTransactions = await paypal.getTransactions(paypalAccessToken);
    const paymentReceivedOrders = await getDiscogsOrders('Payment Received', paypalTransactions);
    const username = await getDiscogsUsername();
    let message;
    paymentReceivedOrders.length === 0 ? message = 'No new orders found.' : message = null;
    const responseObj = {
      username: username,
      orders: paymentReceivedOrders,
      message: message
    }

    res.render('items', responseObj);
  })();
}); // end items route

module.exports = router;