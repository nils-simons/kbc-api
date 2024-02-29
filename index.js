require('dotenv').config()
const express = require('express')
const app = express()


app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
})

require('./api/createSession').createSession(app);

app.listen(process.env.PORT, () => {
  console.log(`KBC API *:${process.env.PORT}`)
})