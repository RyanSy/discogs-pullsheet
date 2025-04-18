const moment = require('moment');
const Discogs = require('disconnect').Client;
const start_date = moment().subtract(7, 'days').format();
const { logError } = require('../lib/logError');

// get orders
exports.getOrders = (access_data, status, paypal_transactions, next) => {
    const mp = new Discogs(access_data).marketplace();

    return mp.getOrders({ status: status, created_after: start_date })
        .then(async function(data) {
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
                    order.messages = await getOrderMessages(access_data, order_id);
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
            logError(error);
            next(error);
        });
}

// get order messages
const getOrderMessages = (access_data, order_id, next) => {
    const mp = new Discogs(access_data).marketplace();

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
            logError(error);
            next(error);
        });
}

// get username
exports.getIdentity = (access_data, next) => {
    const dis = new Discogs(access_data);

    return dis.getIdentity()
        .then(function(data) {
            var username = data.username;
            return username;
        })
        .catch(function(error) {
            console.log('Error getting Discogs username.');
            logError(error);
            next(error);
            return 'Error getting username.'
        });
}
