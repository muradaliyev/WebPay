// Modules

const cryptoRandomString = require('crypto-random-string');
const crypto = require('crypto');
const express = require('express');
const app = express();
const randomName = require('random-name')
require('dotenv').config();
const sql = require('mssql')

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DB,
}

// static constants

const store = {
    storeId: process.env.STORE_ID,
    storeName: process.env.STORE_NAME,
    storeSecretKey: process.env.STORE_SECRET,
    notifyUrl: process.env.NOTIFY_URL,
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
    let firstName = randomName.first();
    let lastName = randomName.last();
    let email = `${firstName}.${lastName}@example.com`
    res.render('order', { stat: staticValues, error: null, form: { firstName, lastName, email } });
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

    let clientId = cryptoRandomString({ length: 10 });//`${firstName} ${lastName}`.replace(' ', '.');
    let orderId = `order_${clientId}_${Date.now()}`;
    let seed = cryptoRandomString({ length: 10 });

    let sigData = (paymentType.value == 'recurring') ?
        `${seed}${store.storeId}${clientId}${orderId}${store.isTest}${currency.value}${plan.amount}recurring_bind${store.storeSecretKey}`
        :
        `${seed}${store.storeId}${clientId}${orderId}${store.isTest}${currency.value}${plan.amount}${store.storeSecretKey}`


    let signature = crypto.createHash('sha1').update(sigData).digest("hex");

    sql
        .connect(sqlConfig)
        .then(pool => {
            const form = { firstName, lastName, address, currency, plan, language, email, phone, paymentType, birthday: randomDate(new Date(1960, 0, 1), new Date(1985, 11, 31)) };
            const calc = { clientId, orderId, seed, signature };
            pool.request()
                .input('data', sql.NVarChar(2048), JSON.stringify({ ...form, ...calc }))
                .query("insert into common.Log ([LogType],[LogData]) select 'webpay.order', @data")
                .then(result => {
                    res.render('pay', {
                        form,
                        stat: staticValues,
                        calc
                    });
                });
        })


});

/* Notify not implemented */

app.post('/notify', (req, res) => {
    res.send(JSON.stringify(req.body));
});

// start server

app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}