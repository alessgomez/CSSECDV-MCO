const getConnectionFromPool = require('../db');
const bcrypt = require("bcrypt");
const axios = require('axios');
const RECAPTCHA_SITE_KEY = '6Lf3IPQpAAAAAAQWUdZe0jE85hxo656W11DtnYmS';
const RECAPTCHA_SECRET_KEY = '6Lf3IPQpAAAAAF49syZBYdjIZw08cj2oiwTNU3e_';

async function verifyLogin(connection, email, password) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM accounts WHERE email = ?';
      connection.query(sql, [email], async (error, results) => {
        if (error) {
          reject(error);
        } else {
          if (results.length === 0) {
            resolve(null); // account not found
          } else {
            const account = results[0];
            //const passwordMatch = password === account.password; // REMOVE -> FOR TESTING ONLY
            const passwordMatch = await bcrypt.compare(password, account.password);
            if (passwordMatch) {
              resolve(account); // Passwords match, return account data
            } else {
              resolve(null); // Passwords do not match
            }
          }
        }
      });
    });
}

const login_controller = {

    getLogin: function (req, res) {
        res.render("login", { siteKey: RECAPTCHA_SITE_KEY });
    },

    postVerifyAccount: async (req, res) => {
        try{

            const { 'g-recaptcha-response': recaptchaResponse } = req.body;

            if (!recaptchaResponse) {
                req.flash('error_msg', 'Invalid login attempt. Please try again.');
                return res.redirect('/login');
            }

            const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`;
            const response = await axios.post(verificationUrl);
            const { success } = response.data;

            if (!success) {
                req.flash('error_msg', 'Invalid login attempt. Please try again.');
                return res.redirect('/login');
            }

            // proceed with login verification if reCAPTCHA is successful
            const connection = await getConnectionFromPool();
            const account = await verifyLogin(connection, req.body.email, req.body.psw);
            connection.release();

            if (account) {
                req.session.accountId = account.accountId;
                res.redirect('/');
            }
            else {
                req.flash('error_msg', 'Invalid login attempt. Please try again.');
                res.redirect('/login');
            }

        } catch (error) {
            console.error('Error during login verification:', error);
            req.flash('error_msg', 'An error occurred during login. Please try again.');
            return res.redirect('/login');
        }
    }
}

module.exports = login_controller;