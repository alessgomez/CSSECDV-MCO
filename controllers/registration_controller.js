const { getConnectionFromPool, performQuery } = require('../db');
const bcrypt = require("bcrypt");
const fs = require('fs');

async function registerAccount(connection, newAccount) {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM accounts WHERE email = ?', [newAccount.email], async (error, results) => {
            if (error) {
                reject(error);
            } else {
                if (results.length === 0) {            
                    const config = JSON.parse(fs.readFileSync('config.json'));
                    error, newAccount.pw = await bcrypt.hash(newAccount.pw, config.saltRounds);

                    if (error) {
                        reject(error);
                    } else {
                        const sql = 'INSERT INTO accounts (firstName, lastName, email, password, phoneNumber, role, dateCreated) VALUES (?, ?, ?, ?, ?, ?, ?)';
                        const values = [newAccount.first, newAccount.last, newAccount.email, newAccount.pw, newAccount.number, 'USER', new Date()];

                        connection.query(sql, values, async (error, results) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(results); // Account successfully registered
                            }
                        });
                    }
                } else {
                    resolve(null); // Account with the given email already exists
                }
            }
        })
    });
}

const registration_controller = {
    
    getRegister: function (req, res) {
        res.render("register");
    },

    postAddAccount: async (req, res) => {
        var newAccount = {
            first: req.body.firstname,
            last: req.body.lastname,
            email: req.body.email,
            pw: req.body.psw,
            number: req.body.contactno
            //var profilePhoto = req.body.profilePhoto;
        }

        try {
            let connection = await getConnectionFromPool();
            const account = await registerAccount(connection, newAccount);

            if (account === null) {
                req.flash('error_msg', 'This account already exists.');
                return res.redirect('/register');
            } else {
                req.flash('success_msg', 'Account successfully registered. You may log in.');
                return res.redirect('/login');
            }
        } catch (error) {
            console.error('Error during account registration:', error);
            req.flash('error_msg', 'An error occurred during registration. Please try again.');
            return res.redirect('/login');
        }
    }

}

module.exports = registration_controller;