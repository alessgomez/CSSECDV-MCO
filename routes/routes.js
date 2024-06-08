const express = require('express');
const registration_controller = require('../controllers/registration_controller.js')
const login_controller = require('../controllers/login_controller.js');
const home_controller = require('../controllers/home_controller.js');

const app = express();

// GETs
app.get('/register', registration_controller.getRegister);
app.get('/login', login_controller.getLogin);
app.get('/', home_controller.getHome);

// POSTs
app.post('/checkAccount', login_controller.postVerifyAccount);

module.exports = app;