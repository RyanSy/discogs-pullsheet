var express = require('express');
var router = express.Router();
var Discogs = require('disconnect').Client;
var moment = require('moment');
const axios = require('axios');
var dotenv = require('dotenv');
dotenv.load();

router.get('/', function(req, res, next) {
  console.log('\nitems route called\n');
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

  /* generate access token */
  var paypal_access_token;
  axios({
      method: 'post',
      url:'https://api.paypal.com/v1/oauth2/token',
      headers: {
        'Authorization': `Bearer ${process.env.PAYPAL_ACCESS_TOKEN}` ,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
  })
    .then(function(response) {
      paypal_access_token = response.access_token;
    })
    .catch(function(error) {
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
     }
      console.log(error.config);
    });

  /* GET items. */
  var mp = new Discogs(accessData).marketplace();

  // get paypal transaction id and shipping address
  var paypal_transactions_arr = [];
  var start_date = moment().subtract(7, 'days').format();
  var end_date = moment().format();
  axios({
    method: 'get',
    url: 'https://api.paypal.com/v1/reporting/transactions',
    headers: {
      'Authorization': `Bearer ${paypal_access_token}`,
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
      for (var i = 0; i < (response.data.transaction_details).length; i++) {
        var paypal_transaction_data = {
          transaction_id: response.data.transaction_details[i].transaction_info.transaction_id,
          invoice_id: response.data.transaction_details[i].transaction_info.invoice_id,
          name: response.data.transaction_details[i].shipping_info.name,
          address_line1: response.data.transaction_details[i].shipping_info.address.line1,
          address_line2: response.data.transaction_details[i].shipping_info.address.line2,
          city: response.data.transaction_details[i].shipping_info.address.city,
          state: response.data.transaction_details[i].shipping_info.address.state,
          country_code: response.data.transaction_details[i].shipping_info.address.country_code,
          postal_code: response.data.transaction_details[i].shipping_info.address.postal_code
        };
        paypal_transactions_arr.push(paypal_transaction_data);
      }
    })
    .catch(function(error) {
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
     }
      console.log(error.config);
    });
    // end get Paypal Transaction Info

  /* Payment Pending orders */
  mp.getOrders({status: 'Payment Pending'}, function(err, data) {
    console.log('\ngetting payment pending orders\n');
    if (err) {
      console.log(err);
      res.send('Error, please refresh this page.');
    }
    var orders = data.orders;
    var paymentPenddingArr = [];
    for (var i = 0; i < orders.length; i++) {
      if (moment(orders[i].created) > moment('2019-12-31T23:59:59-08:00')) {
        var order = {};
        var order_id = orders[i].id;
        order.id = order_id;
        order.date = orders[i].created;
        order.created = moment(orders[i].created).format('lll');
        order.status = orders[i].status;
        order.additional_instructions = orders[i].additional_instructions;
        order.shipping_address = orders[i].shipping_address;
        for (var j = 0; j < paypal_transactions_arr.length; j++) {
          if (order_id == paypal_transactions_arr[j].invoice_id) {
            order.paypal_data = paypal_transactions_arr[j];
          }
        }
        order.items = [];
        for (var j = 0; j < orders[i].items.length; j++) {
          var item = {};
          item.item_location = orders[i].items[j].item_location;
          item.description = orders[i].items[j].release.description;
          item.thumbnail = orders[i].items[j].release.thumbnail;
          order.items.push(item);
        }
        paymentPenddingArr.push(order);
      }
    }

    /* Payment Received orders */
    mp.getOrders({status: 'Payment Received'}, function(err, data) {
      console.log('\ngetting payment received orders\n');
      if (err) {
        console.log(err);
        res.send('Error, please refresh this page.');
      }
      var orders = data.orders;
      var paymentReceivedArr = [];
      for (var i = 0; i < orders.length; i++) {
        if (moment(orders[i].created) > moment('2019-12-31T23:59:59-08:00')) {
          var order = {};
          var order_id = orders[i].id;
          order.id = order_id;
          order.date = orders[i].created;
          order.created = moment(orders[i].created).format('lll');
          order.status = orders[i].status;
          order.additional_instructions = orders[i].additional_instructions;
          order.shipping_address = orders[i].shipping_address;
          for (var j = 0; j < paypal_transactions_arr.length; j++) {
            if (order_id == paypal_transactions_arr[j].invoice_id) {
              order.paypal_data = paypal_transactions_arr[j];
            }
          }
          order.items = [];
          for (var j = 0; j < orders[i].items.length; j++) {
            var item = {};
            item.item_location = orders[i].items[j].item_location;
            item.description = orders[i].items[j].release.description;
            item.thumbnail = orders[i].items[j].release.thumbnail;
            order.items.push(item);
          }
          paymentReceivedArr.push(order);
        }
      }

      // create payment pending array and join
      var allOrdersArr = paymentPenddingArr.concat(paymentReceivedArr);
       res.render('items', {username: username, orders: allOrdersArr});
    }); // end get 'Payment Received'
  }); // end get 'Payment Pending'
}); // end items route

module.exports = router;
