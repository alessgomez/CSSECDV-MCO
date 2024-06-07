const db = require("../db.js");
const Product = require("../models/ProductModel.js");

const controller = {

    getFavicon: function (req, res) {
        res.status(204);
    },

    getSignIn: function (req, res) {
        res.render("sign-in");
    },

    getRegister: function (req, res) {
        res.render("register");
    },

    postAddAccount: function (req, res) {
    var first = req.body.firstname;
    var last = req.body.lastname;
    var email = req.body.email;
    var pw = req.body.psw;
    var number = req.body.contactno;
    var address = req.body.address;
    //var profilePhoto = req.body.profilePhoto;
    const saltRounds = 10;

    //db.query()

    // db.findMany(Account, {}, "", function(result){
    //     id = result.length+1;
    //     db.findOne(Account, {email: email}, {email: 1}, function(result) {
    //         if (result == null)
    //         {
    //             bcrypt.hash(pw, saltRounds, (err, hashed) => {
    //                 if (!err)
    //                     Account.create({userID: id, firstName: first, lastName: last, email: email, password: hashed,
    //                     contactNumber: number, completeAddress: address, seniorID: senior, pwdID: pwd}, function(error, result) {
    //                         req.session.user = result.userID;
    //                         req.session.name = result.firstName + " " + result.lastName;

    //                         console.log(req.session);

    //                         //add new bag for new user
    //                         var bag = {
    //                             userId: req.session.user,
    //                             orderItems: [],
    //                             subtotal: 0,
    //                             deliveryFee: 50,
    //                             total: 0 
    //                         }
                            
    //                         db.insertOne(Bag, bag, function(){});

    //                         res.redirect('/');
    //                     });
    //             });
    //         }
    //         else
    //         {
    //             req.flash('error_msg', 'This account already exists.');
    //             res.redirect('/register');
    //         }
    //     });
    // });
    }

}

module.exports = controller;