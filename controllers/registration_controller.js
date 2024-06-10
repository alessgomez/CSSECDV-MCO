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
                    if (validateDetails(newAccount)) {
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
                        resolve(null); // Invalid account details
                    }
                } else {
                    resolve(null); // Account with the given email already exists
                }
            }
        })
    });
}

function validateDetails(newAccount) {
    // TODO: Backend format validation for name (?)

    const emailRegex = /^(([_-][A-Za-z0-9]+)|[A-Za-z0-9]+)([_.-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*(\.[A-Za-z]{2,})$/
    const emailValid = emailRegex.test(newAccount.email) && newAccount.email.substr(0, newAccount.email.indexOf('@')).length <= 64 && newAccount.email.substr(newAccount.email.indexOf('@')).length <= 255

    const phoneNumberRegex = /^(09|\+639)\d{9}$/;
    const phoneNumberValid = phoneNumberRegex.test(newAccount.number);
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,64}$/;
    const passwordValid = passwordRegex.test(newAccount.pw);

    // TODO: Backend format validation for profile pic (?)

    return emailValid && phoneNumberValid && passwordValid; // TODO: Add validation for name and profile pic once done
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
                req.flash('error_msg', 'Invalid details.');
                return res.redirect('/register');
            } else {
                req.flash('success_msg', 'Account successfully registered. You may log in.');
                return res.redirect('/login');
            }
        } catch (error) {
            req.flash('error_msg', 'An error occurred during registration. Please try again.');
            return res.redirect('/login');
        }
    }

}

module.exports = registration_controller;