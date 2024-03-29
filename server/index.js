require("dotenv").config()
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const copyFrom = require('pg-copy-streams').from;

const express = require('express')
const app = express()
const port = 3000

app.use((req, res, next) => {
    res.setHeader('X-Server-ID', 'Server1'); 
    next();
 });

//app.use(express.static(path.join(__dirname,'../public/')));


const reviewsRoutes = require('./routes/reviewsRoutes');
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use('/reviews', reviewsRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
