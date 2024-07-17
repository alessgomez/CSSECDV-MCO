const express = require('express');
const { general_controller, verifyRole } = require('../controllers/general_controller.js');
const { registration_controller } = require('../controllers/registration_controller.js')
const { login_controller } = require('../controllers/login_controller.js');
const profile_controller = require('../controllers/profile_controller.js');
const menu_controller = require('../controllers/menu_controller.js');
const contact_controller = require('../controllers/contact_controller.js');
const about_controller = require('../controllers/about_controller.js');
const addtobag_controller = require('../controllers/addtobag_controller.js');
const admin_products_controller = require('../controllers/admin_products_controller.js');
const add_product_controller = require('../controllers/add_product_controller.js');
const { edit_product_controller } = require('../controllers/edit_product_controller.js');
const admin_feedbacks_controller = require('../controllers/admin_feedbacks_controller.js');
const {bag_controller} = require('../controllers/bag_controller.js');
const checkout_controller = require('../controllers/checkout_controller.js');

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
app.get('/changePassword', general_controller.isPrivate, verifyRole('USER'), profile_controller.getChangePassword);
app.get('/deleteAccount', general_controller.isPrivate, verifyRole('USER'), profile_controller.getDeleteAccount);
app.get('/menu', general_controller.isPrivate, verifyRole('USER'), bag_controller.getBag, menu_controller.getMenu);
app.get('/contact', contact_controller.getContact);
app.get('/about', about_controller.getAbout);
app.get('/addtobag/:id', addtobag_controller.getAddToBag);
app.get('/viewproductspage', general_controller.isPrivate, verifyRole('ADMIN'), admin_products_controller.getViewProducts) 
app.get('/addproductpage', general_controller.isPrivate, verifyRole('ADMIN'), admin_products_controller.getAddProduct) 
//app.get('/editproductpage', general_controller.isPrivate, verifyRole('ADMIN'), admin_products_controller.getEditProduct)
app.get('/viewfeedbackspage', general_controller.isPrivate, verifyRole('ADMIN'), admin_feedbacks_controller.getViewFeedbacks)
app.get('/getItemQuantity', bag_controller.getItemQuantity);
app.get('/checkout', checkout_controller.getCheckout);


// POSTs
app.post('/verifyAccount', login_controller.postVerifyAccount);
app.post('/addAccount', registration_controller.postAddAccount);
app.post('/verify2FA', login_controller.postVerify2FA)
app.post('/resendOTC', login_controller.postResendOTC)
app.post('/updateAccount', general_controller.isPrivate, verifyRole('USER'), profile_controller.postUpdateAccount);
app.post('/updatePassword', general_controller.isPrivate, verifyRole('USER'), profile_controller.postUpdatePassword);
app.post('/archiveproduct', admin_products_controller.postArchiveProduct) // FIX: ADD VERIFY ROLE
app.post('/unarchiveproduct', admin_products_controller.postUnarchiveProduct) // FIX: ADD VERIFY ROLE
app.post('/addbestseller', admin_products_controller.postAddBestseller) // FIX: ADD VERIFY ROLE
app.post('/removebestseller', admin_products_controller.postRemoveBestseller) // FIX: ADD VERIFY ROLE
app.post('/deleteFeedback', admin_feedbacks_controller.postDeleteFeedback) // FIX: ADD VERIFY ROLE
app.post('/addproduct', admin_products_controller.postAddProduct) // FIX: ADD VERIFY ROLE

module.exports = app;