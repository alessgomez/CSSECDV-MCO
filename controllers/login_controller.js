const getConnectionFromPool = require('../db');
const bcrypt = require("bcrypt");

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
            //const passwordMatch = password === account.password; --> FOR TESTING ONLY
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
        res.render("login");
    },

    postVerifyAccount: async (req, res) => {
        try{
            const connection = await getConnectionFromPool();
            const account = await verifyLogin(connection, req.body.email, req.body.psw);
            connection.release();

            if (account) {
                req.session.accountId = account.accountId;
                res.redirect('/');
            }
            else {
                req.flash('error_msg', 'Invalid login attempt.');
                res.redirect('/login');
            }

        } catch (error) {
            
        }
    }
}

module.exports = login_controller;