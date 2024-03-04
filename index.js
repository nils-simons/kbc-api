require('dotenv').config()
const fs = require("fs");
const admin = require("firebase-admin");
const express = require('express')
const app = express()

admin.initializeApp({
  credential: admin.credential.cert(require("./configs/kbc-api-nilssimons-firebase-adminsdk.json"))
});

if (!fs.existsSync("./tmp")) {
  fs.mkdirSync("./tmp");
}

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
})

app.use(require('./utils/auth').auth)

require('./api/createSession').createSession(app);
require('./api/getAccounts').getAccounts(app);
require('./api/getAccount').getAccount(app);

app.listen(process.env.PORT, () => {
  console.log(`KBC API *:${process.env.PORT}`)
})