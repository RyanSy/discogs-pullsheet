const axios = require('axios');
const qs = require('qs');
const moment = require('moment');
const start_date = moment().subtract(7, 'days').format();
const end_date = moment().format();

// generate PayPal access token
exports.getAccessToken = () => {
    const encodeCredentials = (username, password) => {
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
        // catchError(error);
        res.send(error)
    });
}



// get PayPal transactions
exports.getTransactions = (paypalAccessToken) => {
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
            // catchError(error);
            res.send(error)
        });
}

