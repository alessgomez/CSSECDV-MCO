const express = require('express');
const registration_controller = require('../controllers/registration_controller.js')
const login_controller = require('../controllers/login_controller.js');

const app = express();

// GETs
app.get('/register', registration_controller.getRegister);
app.get('/signin', login_controller.getSignIn);

// POSTs



module.exports = app;