const { getConnectionFromPool, logPoolStats } = require('../db');
const bcrypt = require("bcrypt");
const axios = require('axios');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const RECAPTCHA_SITE_KEY = '6Lf3IPQpAAAAAAQWUdZe0jE85hxo656W11DtnYmS';
const RECAPTCHA_SECRET_KEY = '6Lf3IPQpAAAAAF49syZBYdjIZw08cj2oiwTNU3e_';

const rateLimiter = new RateLimiterMemory({
    points: 5, // Maximum number of attempts within the duration
    duration: 180, // Timeframe in seconds for the rate limiting
    blockDuration: 300, // Block duration in seconds after exceeding attempts
  });

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
      let connection;
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

          const ip = req.ip; // Extract IP address from request
          const rateLimitKey = `login_attempt_${ip}`;

          // Check if the IP has exceeded the maximum number of failed login attempts
          const rateLimitStatus = await rateLimiter.get(rateLimitKey);
          if (rateLimitStatus && rateLimitStatus.consumedPoints >= rateLimiter.points) {
              console.log("NO MORE ATTEMPTS CAN BE MADE")
              console.log(rateLimitStatus)
              req.flash('error_msg', 'Too many login attempts. Please try again later.');
              return res.redirect('/login');
          }

          // Proceed with login verification if reCAPTCHA and rate limiting ARE successful
          console.log("awaiting connection")
          connection = await getConnectionFromPool();
          logPoolStats()

          const account = await verifyLogin(connection, req.body.email, req.body.psw);

          // checking if account is null
          if (account) {
              req.session.accountId = account.accountId;
              res.redirect('/');
          }
          else {     
              let rateLimitResponse;
              try {
                  rateLimitResponse = await rateLimiter.consume(rateLimitKey);
              } catch (rateLimitError) {
                  console.log('Rate limit exceeded:', rateLimitError);
                  req.flash('error_msg', 'Too many login attempts. Please try again later.');
                  return res.redirect('/login');
              }

              console.log('rate limit points: ' + rateLimitResponse.remainingPoints)
              
              req.flash('error_msg', 'Invalid login attempt. Please try again.');
              res.redirect('/login');
          }

      } catch (error) {
          console.error('Error during login verification:', error);
          req.flash('error_msg', 'An error occurred during login. Please try again.');
          return res.redirect('/login');
      }
      finally {
        console.log('finally')
        if (connection) {
          console.log("Releasing connection");
          connection.release();
          logPoolStats(); 
        }
      }
    }
}

module.exports = login_controller;