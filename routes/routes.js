const express = require('express');
const general_controller = require('../controllers/general_controller.js');
const registration_controller = require('../controllers/registration_controller.js')
const login_controller = require('../controllers/login_controller.js');
const home_controller = require('../controllers/home_controller.js');

const app = express();

// GETs
app.get('/register', general_controller.isPublic, registration_controller.getRegister);
app.get('/login', general_controller.isPublic, login_controller.getLogin);
app.get('/', general_controller.isPrivate, home_controller.getHome);
app.get('/logout', general_controller.isPrivate, general_controller.getLogout);

// POSTs
app.post('/checkAccount', login_controller.postVerifyAccount);
app.post('/addAccount', registration_controller.postAddAccount);

module.exports = app;