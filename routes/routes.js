const express = require('express');
const { general_controller, verifyRole } = require('../controllers/general_controller.js');
const registration_controller = require('../controllers/registration_controller.js')
const { login_controller } = require('../controllers/login_controller.js');
const profile_controller = require('../controllers/profile_controller.js');

const app = express();

/* NOTE [TO REMOVE]:
In order to include role checking before accessing private pages, make sure to call the respective
general_controller function after calling isPrivate.

Example:
app.get('/profile', general_controller.isPrivate, verifyRole('USER'), profile_controller.getProfile);
app.get('/adminpage', general_controller.isPrivate, verifyRole('ADMIN'), admin_controller.getAdminPage);
*/

// GETs
app.get('/register', general_controller.isPublic, registration_controller.getRegister);
app.get('/login', general_controller.isPublic, login_controller.getLogin);
app.get('/', general_controller.isPrivate, general_controller.getHome);
app.get('/logout', general_controller.isPrivate, general_controller.getLogout);
app.get('/2FA', general_controller.isPrivate2FA, login_controller.get2FA);
app.get('/profile', general_controller.isPrivate, verifyRole('USER'), profile_controller.getProfile);

// POSTs
app.post('/verifyAccount', login_controller.postVerifyAccount);
app.post('/addAccount', registration_controller.postAddAccount);
app.post('/verify2FA', login_controller.postVerify2FA)
app.post('/resendOTC', login_controller.postResendOTC)

module.exports = app;