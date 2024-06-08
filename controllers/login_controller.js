const db = require("../db.js");

const login_controller = {

    getLogin: function (req, res) {
        res.render("login");
    },

    postCheckAccount: function(req, res) {
        db.query("SELECT * FROM Accounts WHERE email = '" + req.body.email  + "'", function (err, result) { 
            if (result[0] != null) {
                // bcrypt.compare(req.body.psw, user.password, (err, result) => {
                //     if (result)
                //     {
                //         req.session.user = user.userID;
                //         console.log(req.session);
                //         res.redirect('/');
                //     }
                //     else
                //     {
                //         req.flash('error_msg', 'Invalid login attempt.');
                //         res.redirect('/signin');
                //     }
                // });
            }
            else {
                //req.flash('error_msg', 'Invalid login attempt.');
                console.log("Invalid login attempt.")
                res.redirect('/login');
            }

        });
    }

}

module.exports = login_controller;