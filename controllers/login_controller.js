const db = require("../db.js");

const login_controller = {

    getSignIn: function (req, res) {
        res.render("sign-in");
    }
    
}

module.exports = login_controller;