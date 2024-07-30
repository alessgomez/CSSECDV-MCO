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
const admin_orders_controller = require('../controllers/admin_orders_controller.js');
const { add_product_controller } = require('../controllers/add_product_controller.js');
const { edit_product_controller } = require('../controllers/edit_product_controller.js');
const admin_feedbacks_controller = require('../controllers/admin_feedbacks_controller.js');
const {bag_controller} = require('../controllers/bag_controller.js');
const checkout_controller = require('../controllers/checkout_controller.js');
const search_controller = require('../controllers/search_controller.js');
const confirmation_controller = require('../controllers/confirmation_controller.js');
const order_history_controller = require('../controllers/order_history_controller.js');

const app = express();

// GETs
app.get('/', general_controller.isPrivate, general_controller.getHome);
app.get('/register', general_controller.isPublic, registration_controller.getRegister);
app.get('/login', general_controller.isPublic, login_controller.getLogin);
app.get('/logout', general_controller.isPrivate, general_controller.getLogout);
app.get('/2FA', general_controller.isPrivate2FA, login_controller.get2FA);
app.get('/profile', general_controller.isPrivate, verifyRole('USER'), bag_controller.getBag, profile_controller.getProfile);
app.get('/changePassword', general_controller.isPrivate, verifyRole('USER'), bag_controller.getBag, profile_controller.getChangePassword);
app.get('/deleteAccount', general_controller.isPrivate, verifyRole('USER'), profile_controller.getDeleteAccount);
app.get('/viewProductsPage', general_controller.isPrivate, verifyRole('ADMIN'), admin_products_controller.getViewProducts)
app.get('/addProductPage', general_controller.isPrivate, verifyRole('ADMIN'), add_product_controller.getAddProduct) 
app.get('/editProductPage/:id', general_controller.isPrivate, verifyRole('ADMIN'), edit_product_controller.getEditProduct)
app.get('/getProduct', general_controller.isPrivate, verifyRole('ADMIN'), edit_product_controller.getProduct) 
app.get('/viewOrdersPage', general_controller.isPrivate, verifyRole('ADMIN'), admin_orders_controller.getViewOrders)
app.get('/viewFeedbacksPage', general_controller.isPrivate, verifyRole('ADMIN'), admin_feedbacks_controller.getViewFeedbacks)
app.get('/search', general_controller.isPrivate, verifyRole('USER'), search_controller.getSearchPage);
app.get('/menu', general_controller.isPrivate, verifyRole('USER'), bag_controller.getBag, menu_controller.getMenu);
app.get('/about', general_controller.isPrivate, verifyRole('USER'), bag_controller.getBag, about_controller.getAbout);
app.get('/addtobag/:id', general_controller.isPrivate, verifyRole('USER'), bag_controller.getBag, addtobag_controller.getAddToBag);
app.get('/checkout', general_controller.isPrivate, verifyRole('USER'), checkout_controller.getCheckout);
app.get('/contact', general_controller.isPrivate, verifyRole('USER'), bag_controller.getBag, contact_controller.getContact);
app.get('/getItemQuantity', general_controller.isPrivate, verifyRole('USER'), bag_controller.getItemQuantity);
app.get('/getBagTotal', general_controller.isPrivate, verifyRole('USER'), bag_controller.getBagTotal);
app.get('/confirmation/:id', general_controller.isPrivate, verifyRole('USER'), bag_controller.getBag, confirmation_controller.getConfirmation);
app.get('/orderhistory', general_controller.isPrivate, verifyRole('USER'), order_history_controller.getOrderHistory);
app.get('/orderhistory/:index', general_controller.isPrivate, verifyRole('USER'), order_history_controller.getOrderDetails);


// POSTs
app.post('/verifyAccount', login_controller.postVerifyAccount);
app.post('/addAccount', registration_controller.postAddAccount);
app.post('/verify2FA', login_controller.postVerify2FA)
app.post('/resendOTC', login_controller.postResendOTC)
app.post('/updateAccount', general_controller.isPrivate, verifyRole('USER'), profile_controller.postUpdateAccount);
app.post('/updatePassword', general_controller.isPrivate, verifyRole('USER'), profile_controller.postUpdatePassword);
app.post('/archiveProduct', general_controller.isPrivate, verifyRole('ADMIN'), admin_products_controller.postArchiveProduct)
app.post('/unarchiveProduct', general_controller.isPrivate, verifyRole('ADMIN'), admin_products_controller.postUnarchiveProduct) 
app.post('/addBestseller', general_controller.isPrivate, verifyRole('ADMIN'), admin_products_controller.postAddBestseller)
app.post('/removeBestseller', general_controller.isPrivate, verifyRole('ADMIN'), admin_products_controller.postRemoveBestseller)
app.post('/deleteFeedback', general_controller.isPrivate, verifyRole('ADMIN'), admin_feedbacks_controller.postDeleteFeedback)
app.post('/addProduct', general_controller.isPrivate, verifyRole('ADMIN'), add_product_controller.postAddProduct) 
app.post('/editProduct', general_controller.isPrivate, verifyRole('ADMIN'), edit_product_controller.postEditProduct)
app.post('/checkout', general_controller.isPrivate, verifyRole('USER'), checkout_controller.postCheckout);
app.post('/addfeedback', general_controller.isPrivate, verifyRole('USER'), contact_controller.postAddFeedback);
app.post('/addBagItem', general_controller.isPrivate, verifyRole('USER'), bag_controller.postAddBagItem);
app.post('/addQuantity', general_controller.isPrivate, verifyRole('USER'), bag_controller.postAddQuantity);
app.post('/subtractQuantity', general_controller.isPrivate, verifyRole('USER'), bag_controller.postSubtractQuantity);
app.post('/deleteBagItem', general_controller.isPrivate, verifyRole('USER'), bag_controller.postDeleteBagItem);

module.exports = app;