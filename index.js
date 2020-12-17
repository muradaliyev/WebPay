// Modules

const cryptoRandomString = require('crypto-random-string');
const crypto = require('crypto');
const express = require('express');
const app = express();
require('dotenv').config();

// static constants

const store = {
    storeId: process.env.STORE_ID,
    storeName: process.env.STORE_NAME,
    storeSecretKey: process.env.STORE_SECRET,
    Version: '2',
    isTest: '1',
    gatewayUrl: 'https://securesandbox.webpay.by'
};

const currencies = [
    { value: "BYN", name: "Belarussian Ruble" },
    { value: "RUB", name: "Russian Ruble" },
    { value: "EUR", name: "Euro" },
    { value: "USD", name: "US Dollar" }
]

const plans = [
    { value: "5", amount: "5.00" },
    { value: "25", amount: "25.00" },
    { value: "50", amount: "50.00" }
]

const paymentTypes = [
    { value: "one_off", name: "One-off" },
    { value: "recurring", name: "Recurring" }
]

const languages = ["russian", "english"]

const staticValues = { currencies, store, plans, paymentTypes, languages };

const port = 80;

// init engine

app.set('view engine', 'ejs');

app.use(express.urlencoded({
    extended: true
}));

// contollers

app.get(['/', '/order'], (req, res) => {
    res.render('order', { stat: staticValues, error: null, form: {} });
});

app.post('/order', (req, res) => {

    let currency = staticValues.currencies.find(c => c.value === req.body['currency']);
    let plan = staticValues.plans.find(c => c.value === req.body['amount']);
    let paymentType = staticValues.paymentTypes.find(c => c.value === req.body['paymentType']);
    let language = staticValues.languages.find(c => c === req.body['language']);
    let firstName = req.body['firstName'];
    let lastName = req.body['lastName'];
    let address = req.body['address'] || 'N/A';
    let email = req.body['email'];
    let phone = req.body['phone'];

    if (!firstName || !lastName || !currency || !plan || !language || !email || !paymentType) {
        return res.render('order', { stat: staticValues, error: 'Mandatory fields are missing', form: req.body });
    }

    let clientId = `${firstName} ${lastName}`.replace(' ', '.');
    let orderId = `order_${clientId}_${Date.now()}`;
    let seed = cryptoRandomString({ length: 10 });


    let signature = crypto
        .createHash('sha1')
        .update(`${seed}${store.storeId}${clientId}${orderId}${store.isTest}${currency.value}${plan.amount}${store.storeSecretKey}`)
        .digest("hex");


    res.render('pay', {
        form: { firstName, lastName, address, currency, plan, language, email, phone, paymentType },
        stat: staticValues,
        calc: { clientId, orderId, seed, signature }
    });
});

/* Notify not implemented */

app.post('/notify', (req, res) => {
    res.send(JSON.stringify(req.body));
});

// start server

app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});
