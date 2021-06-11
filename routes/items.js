var express = require('express');
var router = express.Router();
const axios = require('axios');
var qs = require('qs');
var Discogs = require('disconnect').Client;
var moment = require('moment');
var start_date = moment().subtract(31, 'days').format();
var end_date = moment().format();
var async = require('async');

router.get('/', function(req, res, next) {
  console.log('items route called');
  var accessData = req.session.accessData;
  var dis = new Discogs(accessData);
  var mp = new Discogs(accessData).marketplace();

  start();

  async function start() {
    let paypalAccessToken = await getPayPalAccessToken();
    let paypalTransactionsArr = await getPayPalTransactions(paypalAccessToken);
    let paymentPendingOrders = await getDiscogsOrders('Payment Pending', paypalTransactionsArr);
    let paymentReceivedOrders = await getDiscogsOrders('Payment Received', paypalTransactionsArr);
    let orders = paymentPendingOrders.concat(paymentReceivedOrders);
    let username = await getUsername();
    let responseObj = {
      username: username,
      orders: orders
    }
    res.render('items', responseObj);
  }

  // generate PayPal access token
  function getPayPalAccessToken() {
    return axios({
      method: 'post',
      url:'https://api.paypal.com/v1/oauth2/token',
      headers: {
        'Authorization': `Basic ${process.env.PAYPAL_AUTHORIZATION_TOKEN}` ,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: qs.stringify({ grant_type: 'client_credentials' })
    })
    .then(function(response) {
      let paypalAccessToken = response.data.access_token;
      return paypalAccessToken;
    })
    .catch(function(error) {
      console.log('error getting paypal access token');
      catchError(error);
      res.send('Server error.')
    });
  } // end generate PayPal access token

  // get PayPal transactions
  function getPayPalTransactions(paypalAccessToken) {
    return axios({
      method: 'get',
      url: 'https://api.paypal.com/v1/reporting/transactions',
      headers: {
        'Authorization': `Bearer ${paypalAccessToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        transaction_type: 'T0007',
        start_date: start_date,
        end_date: end_date,
        fields: 'shipping_info'
      }
    })
    .then(function(response) {
      var paypalTransactionsArr = [];
      for (var i = 0; i < (response.data.transaction_details).length; i++) {
        var paypal_transaction_data = {
          transaction_id: response.data.transaction_details[i].transaction_info.transaction_id,
          invoice_id: response.data.transaction_details[i].transaction_info.invoice_id,
          name: response.data.transaction_details[i].shipping_info.name,
          address_line1: (response.data.transaction_details[i].shipping_info.address.line1),
          address_line2: response.data.transaction_details[i].shipping_info.address.line2,
          city: response.data.transaction_details[i].shipping_info.address.city,
          state: response.data.transaction_details[i].shipping_info.address.state,
          country_code: response.data.transaction_details[i].shipping_info.address.country_code,
          postal_code: response.data.transaction_details[i].shipping_info.address.postal_code
        };
        paypalTransactionsArr.push(paypal_transaction_data);
      }
      return paypalTransactionsArr;
    })
    .catch(function(error) {
      console.log('error getting PayPal transactions');
      catchError(error);
      res.send('Server error.')
    });
  }  // end get PayPal transactions

  // get Discogs orders
  function getDiscogsOrders(status, paypal_transactions_arr) {
    return mp.getOrders({status: status})
      .then(async function(data) {
        var orders = data.orders;
        var ordersArray = [];
        for (var i = 0; i < orders.length; i++) {
          if (moment(orders[i].created) > moment('2019-12-31T23:59:59-08:00')) {
            var order = {};
            var order_id = orders[i].id;
            var paypal_data = {};
            for (var j = 0; j < paypal_transactions_arr.length; j++) {
              if (order_id == paypal_transactions_arr[j].invoice_id) {
                paypal_data = paypal_transactions_arr[j];
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
        console.log(`error getting Discogs ${status} orders`);
        catchError(error);
        res.send('Server error.');
      });
  } // end get Discogs orders

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
        console.log('error getting Discogs order messages');
        catchError(error);
        res.send('Server error.');
      });
  } // end get Discogs order messages

  // get Discogs username
  function getUsername() {
    return dis.getIdentity()
      .then(function(data) {
        var username = data.username;
        return username;
      })
      .catch(function(error) {
        console.log('error getting Discogs username');
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
     console.log(error.response.headers);
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
}); // end items route

module.exports = router;
