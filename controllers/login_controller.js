const { getConnectionFromPool, logPoolStats } = require('../db');
const bcrypt = require("bcrypt");
const axios = require('axios');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const RECAPTCHA_SITE_KEY = '6Lf3IPQpAAAAAAQWUdZe0jE85hxo656W11DtnYmS';
const RECAPTCHA_SECRET_KEY = '6Lf3IPQpAAAAAF49syZBYdjIZw08cj2oiwTNU3e_';

// Rate limiter for IP addresses
const ipRateLimiter = new RateLimiterMemory({
  points: 5, // Maximum number of attempts within the duration
  duration: 900000, // Timeframe in milliseconds for the rate limiting
  blockDuration: 900000, // Block duration in milliseconds after exceeding attempts
});

// Rate limiter for emails
const emailRateLimiter = new RateLimiterMemory({
  points: 3, // Maximum number of attempts within the duration
  duration: 900000, // Timeframe in milliseconds for the rate limiting
  blockDuration: 900000, // Block duration in milliseconds after exceeding attempts
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
            const passwordMatch = password === account.password; // REMOVE -> FOR TESTING ONLY
            //const passwordMatch = await bcrypt.compare(password, account.password);
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

          const ip = req.ip;
          const email = req.body.email;
          const ipRateLimitKey = `login_attempt_ip_${ip}`;
          const emailRateLimitKey = `login_attempt_email_${email}`;

          // Check if the IP has exceeded the maximum number of failed login attempts
          const ipRateLimitStatus = await ipRateLimiter.get(ipRateLimitKey);
          if (ipRateLimitStatus && ipRateLimitStatus.consumedPoints >= ipRateLimiter.points) {
              console.log("IP RATE LIMIT REACHED")
              console.log("ms before next: " + ipRateLimitStatus.msBeforeNext)
              req.flash('error_msg', 'Too many login attempts.<br>Please try again after <strong>15 minutes</strong>.');
              return res.redirect('/login');
          }

          // Check if the email has exceeded the maximum number of failed login attempts
          const emailRateLimitStatus = await emailRateLimiter.get(emailRateLimitKey);
          if (emailRateLimitStatus && emailRateLimitStatus.consumedPoints >= emailRateLimiter.points) {
              console.log("EMAIL RATE LIMIT REACHED")
              console.log("ms before next: " + emailRateLimitStatus.msBeforeNext)
              req.flash('error_msg', 'Username and/or password incorrect.<br><br>' +  
                        'Alternatively, the account may have been locked because of too many failed logins. If this is the case, please try again after <strong>15 minutes</strong>.');

              // Consume points from IP rate limiter even if email rate limit is reached
              const ipRateLimitResponse = await ipRateLimiter.consume(ipRateLimitKey);
              console.log('IP rate limit points: ' + ipRateLimitResponse.remainingPoints);
              
              return res.redirect('/login');
          }

          // Proceed with login verification if reCAPTCHA and rate limiting ARE successful
          connection = await getConnectionFromPool();
          //logPoolStats()

          const account = await verifyLogin(connection, req.body.email, req.body.psw);

          // checking if account is null
          if (account) {
              req.session.accountId = account.accountId;
              res.redirect('/');
          }
          else {     
              let ipRateLimitResponse;
              let emailRateLimitResponse
              try {
                // Update rate limiters
                [ipRateLimitResponse, emailRateLimitResponse] = await Promise.all([
                  ipRateLimiter.consume(ipRateLimitKey),
                  emailRateLimiter.consume(emailRateLimitKey)
                ]);
              } catch (rateLimitError) {
                console.log(rateLimitError);
                return res.redirect('/login');
              }
            
              console.log("INVALID LOGIN ATTEMPT")
              console.log('IP rate limit points: ' + ipRateLimitResponse.remainingPoints)
              console.log('Email rate limit points: ' + emailRateLimitResponse.remainingPoints)
              
              req.flash('error_msg', 'Username and/or password incorrect.<br><br>' +  
                'Alternatively, the account may have been locked because of too many failed logins. If this is the case, please try again after <strong>15 minutes</strong>.');
              res.redirect('/login');
          }

      } catch (error) {
          console.error('Error during login verification:', error);
          req.flash('error_msg', 'An error occurred during login. Please try again.');
          return res.redirect('/login');
      }
      finally {
        if (connection) {
          connection.release();
          //logPoolStats(); 
        }
      }
    }
}

module.exports = login_controller;