const express = require('express');
const registration_controller = require('../controllers/registration_controller.js')
const login_controller = require('../controllers/login_controller.js');
const app = express();

// GETs
app.get('/register', controller.isPublic, controller.getRegister);
app.get('/signin', controller.isPublic, controller.getSignIn);
app.get('/', controller.isPrivate, controller.getIndex);
app.get('/menu', controller.isPrivate, controller.getMenu);
app.get('/contact', controller.isPrivate, controller.getContact);
app.get('/orderhistory', controller.isPrivate, controller.getOrderHistoryInd);
app.get('/orderhistory/:ordernum', controller.isPrivate, controller.getOrderHistory);
app.get('/profile', controller.isPrivate, controller.getProfile);
app.get('/addresses', controller.isPrivate, controller.getAddresses);
app.get('/contactnums', controller.isPrivate, controller.getContactNums);
app.get('/id', controller.isPrivate, controller.getID);
app.get('/addtobag/:id', controller.isPrivate, controller.getAddToBag);
app.get('/checkout', controller.isPrivate, controller.getCheckout);
app.get('/confirmation/:orderId', controller.isPrivate, controller.getConfirmation);
app.get('/getProduct', controller.isPrivate, controller.getProduct);
app.get('/getBag', controller.isPrivate, controller.getBag);
app.get('/getAccount', controller.isPrivate, controller.getAccount);
app.get('/getCurrentAccount', controller.isPrivate, controller.getCurrentAccount);
app.get('/getAllOrderItems', controller.isPrivate, controller.getAllOrderItems);
app.get('/getOrderItem', controller.isPrivate, controller.getOrderItem);
app.get('/search', controller.isPrivate, controller.getSearch);
app.get('/logout', controller.isPrivate, controller.getLogout);
app.get('/delete', controller.isPrivate, controller.postDeleteAccount);
app.get('/changepw', controller.isPrivate, controller.getChangePassword);
app.get('/addaddress', controller.isPrivate, controller.getAddAddress);
app.get('/addnumber', controller.isPrivate, controller.getAddNumber);

// POSTs
app.post('/addaccount', controller.postAddAccount);
app.post('/addOrderItem', controller.isPrivate, controller.postAddOrderItem);
app.post('/updateBagItems', controller.isPrivate, controller.postUpdateBagItems);
app.post('/checkout', controller.isPrivate, controller.postCheckout);
app.post('/checkaccount', controller.postCheckAccount);
app.post('/updateDetails', controller.isPrivate, controller.postUpdateDetails);
app.post('/updateelement', controller.isPrivate, controller.postUpdateArrayElement);
app.post('/addQuantity', controller.isPrivate, controller.postAddQuantity);
app.post('/subtractQuantity', controller.isPrivate, controller.postSubtractQuantity);
app.post('/deleteOrderItem', controller.isPrivate, controller.postDeleteOrderItem);
app.post('/addfeedback', controller.isPrivate, controller.postAddFeedback);
app.get('/getItemQuantity', controller.isPrivate, controller.getItemQuantity);
app.get('/getAddOn', controller.isPrivate, controller.getAddOn);
app.get('/about', controller.isPrivate, controller.getAbout);

module.exports = app;