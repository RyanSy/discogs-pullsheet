var express = require('express');
var router = express.Router();
const axios = require('axios');
var qs = require('qs');
var Discogs = require('disconnect').Client;
var moment = require('moment');
const { log } = require('async');
var start_date = moment().subtract(7, 'days').format();
var end_date = moment().format();
console.log(start_date);



router.get('/', function(req, res) {
  var accessData = req.session.accessData;
  var dis = new Discogs(accessData);
  var mp = new Discogs(accessData).marketplace();



  // generate PayPal access token
  function getPayPalAccessToken() {
    function encodeCredentials(username, password) {
      const credentials = `${username}:${password}`;
      const buffer = Buffer.from(credentials);
      const base64 = buffer.toString('base64');
      return base64;
    }

    const username = process.env.PAYPAL_CLIENT_ID;
    const password = process.env.PAYPAL_CLIENT_SECRET;
    const encoded = encodeCredentials(username, password);

    return axios({
      method: 'post',
      url: 'https://api-m.paypal.com/v1/oauth2/token',
      headers: {
        'Authorization': `Basic ${encoded}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: qs.stringify({ grant_type: 'client_credentials' })
    })
      .then(function(response) {
        const paypalAccessToken = response.data.access_token;
        return paypalAccessToken;
      })
      .catch(function(error) {
        console.log('Error getting paypal access token.');
        catchError(error);
        res.send(error)
      });
  }



  // get PayPal transactions
  function getPayPalTransactions(paypalAccessToken) {
    return axios({
      method: 'get',
      url: 'https://api-m.paypal.com/v1/reporting/transactions',
      headers: {
        'Authorization': `Bearer ${paypalAccessToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        transaction_type: 'T0006',
        start_date: start_date,
        end_date: end_date,
        fields: 'shipping_info'
      }
    })
      .then(function(response) {
        var paypalTransactionDetails = response.data.transaction_details;
        var paypalTransactionsArr = [];
        for (var i = 0; i < paypalTransactionDetails.length; i++) {
          var transaction_id = paypalTransactionDetails[i].transaction_info.transaction_id;
          var invoice_id = paypalTransactionDetails[i].transaction_info.invoice_id;
          var name = paypalTransactionDetails[i].shipping_info.name;
          if (paypalTransactionDetails[i].shipping_info.address == null) {
            var address_line1 = 'n/a';
            var address_line2 = 'n/a';
            var city = 'n/a';
            var state = 'n/a';
            var country_code = 'n/a';
            var postal_code = 'n/a';
          } else {
            var address_line1 = paypalTransactionDetails[i].shipping_info.address.line1;
            var address_line2 = paypalTransactionDetails[i].shipping_info.address.line2
            var city = paypalTransactionDetails[i].shipping_info.address.city;
            var state = paypalTransactionDetails[i].shipping_info.address.state;
            var country_code = paypalTransactionDetails[i].shipping_info.address.country_code;
            var postal_code = paypalTransactionDetails[i].shipping_info.address.postal_code;
          }
          var paypal_transaction_data = {
            transaction_id: transaction_id,
            invoice_id: invoice_id,
            name: name,
            address_line1: address_line1,
            address_line2: address_line2,
            city: city,
            state: state,
            country_code: country_code,
            postal_code: postal_code
          };
          paypalTransactionsArr.push(paypal_transaction_data);
        }

        return paypalTransactionsArr;
      })
      .catch(function(error) {
        console.log('Error getting PayPal transactions.');
        catchError(error);
        res.send(error)
      });
  }



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
  function getUsername() {
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



  async function start() {
    console.log('initiating...');

    const paypalAccessToken = await getPayPalAccessToken();
    const paypalTransactions = await getPayPalTransactions(paypalAccessToken);
    const paymentReceivedOrders = await getDiscogsOrders('Payment Received', paypalTransactions);
    const username = await getUsername();
    let message;
    paymentReceivedOrders.length === 0 ? message = 'No new orders found.' : message = null;
    const responseObj = {
      username: username,
      orders: paymentReceivedOrders,
      message: message
    }

    res.render('items', responseObj);
  }

  start();
}); // end items route

module.exports = router;