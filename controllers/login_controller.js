const db = require("../db.js");
const bcrypt = require("bcrypt");
const login_controller = {

    getLogin: function (req, res) {
        res.render("login");
    },

    postVerifyAccount: function(req, res) {
        db.query("SELECT * FROM Accounts WHERE email = '" + req.body.email  + "'", function (err, result) { 
            var account = result[0]
            if (account != null) {
                bcrypt.compare(req.body.psw, account.password, (err, result) => {
                    if (result)
                    {
                        req.session.account = account.accountID;
                        console.log(req.session);
                        res.redirect('/');
                    }
                    else
                    {
                        req.flash('error_msg', 'Invalid login attempt.');
                        res.redirect('/login');
                    }
                });
            }
            else {
                req.flash('error_msg', 'Invalid login attempt.');
                console.log("Invalid login attempt.")
                res.redirect('/login');
            }

        });
    }

}

module.exports = login_controller;