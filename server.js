const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// bring routes
const authRouts = require('./routs/auth');
const ItemRouts = require('./routs/item');
const userRouts = require('./routs/user');
const formRouts = require('./routs/form');


// database connection
mongoose
.connect(process.env.DATABASE_LOCAL, { useNewUrlParser: true, useCreateIndex: true, useFindAndModify: false, useUnifiedTopology: true })
.then(() => console.log('DB Connected'));

mongoose.connection.on('error', err => {
    console.log(`DB connection error: ${err.message}`);
});


// app
const app = express();

// middlewares
app.use(morgan('dev'));
app.use(bodyParser.json()); 
app.use(cookieParser());
//cors
if(process.env.NODE_ENV = 'development'){
    app.use(cors({ origin: `${process.env.CLIENT_URL}` })); 
}


// routes middlewares
app.use('/api', authRouts);
app.use('/api', ItemRouts);
app.use('/api', userRouts);
app.use('/api', formRouts);

// port
const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});