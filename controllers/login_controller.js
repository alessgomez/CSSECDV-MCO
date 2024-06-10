const { getConnectionFromPool, logPoolStats } = require('../db');
const bcrypt = require("bcrypt");
const fs = require('fs');
const axios = require('axios');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const config = JSON.parse(fs.readFileSync('config.json'));
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

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

// Function to send email with one-time code
async function sendOneTimeCode(email, code) {
   // Create a transporter using SMTP transport
   const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    secure: false,//true
    port: 587,//465
    auth: {
        user: config.user, 
        pass: config.pass 
    }
});
  const mailOptions = {
      from: config.user,
      to: email,
      subject: 'One-Time Code for Login',
      text: `Your one-time code for login is: ${code}`
  };

  return transporter.sendMail(mailOptions);
}

// Function to generate a random one-time code
function generateOneTimeCode() {
  return uuidv4().substring(0, 6).toUpperCase(); // Generate a 6-character alphanumeric code
}

const login_controller = {

    getLogin: function (req, res) {
        res.render("login", { siteKey: config.RECAPTCHA_SITE_KEY });
    },

    postVerifyAccount: async (req, res) => {

        function validateEmail(email){
            const emailRegex = /^(([_-][A-Za-z0-9]+)|[A-Za-z0-9]+)([_.-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*(\.[A-Za-z]{2,})$/
            return emailRegex.test(email) && email.substr(0, email.indexOf('@')).length <= 64 && email.substr(email.indexOf('@')).length <= 255
        }

      function validatePW (pw) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,64}$/;
        return passwordRegex.test(pw);
      }
      
      let connection;
      try{
          const { 'g-recaptcha-response': recaptchaResponse } = req.body;
          const email = req.body.email;
          const pw = req.body.psw;
          const ip = req.ip;
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
              req.flash('error_msg', 'Invalid login attempt.<br><br>' +  
                        'Alternatively, the account may have been locked because of too many failed logins. If this is the case, please try again after <strong>15 minutes</strong>.');

              // Consume points from IP rate limiter even if email rate limit is reached
              const ipRateLimitResponse = await ipRateLimiter.consume(ipRateLimitKey);
              console.log('IP rate limit points: ' + ipRateLimitResponse.remainingPoints);
              
              return res.redirect('/login');
          }

          if (!recaptchaResponse) {
              const ipRateLimitResponse = await ipRateLimiter.consume(ipRateLimitKey);
              const emailRateLimitResponse = await emailRateLimiter.consume(emailRateLimitKey);
              console.log('IP rate limit points: ' + ipRateLimitResponse.remainingPoints);
              console.log('email rate limit points: ' + emailRateLimitResponse.remainingPoints);
              req.flash('error_msg', 'Invalid login attempt.<br><br>' +  
                'Alternatively, the account may have been locked because of too many failed logins. If this is the case, please try again after <strong>15 minutes</strong>.');
              return res.redirect('/login');
          }

          const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${config.RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`;
          const response = await axios.post(verificationUrl);
          const { success } = response.data;

          if (!success) {
              const ipRateLimitResponse = await ipRateLimiter.consume(ipRateLimitKey);
              const emailRateLimitResponse = await emailRateLimiter.consume(emailRateLimitKey);
              console.log('IP rate limit points: ' + ipRateLimitResponse.remainingPoints);
              console.log('email rate limit points: ' + emailRateLimitResponse.remainingPoints);
              req.flash('error_msg', 'Invalid login attempt.<br><br>' +  
                'Alternatively, the account may have been locked because of too many failed logins. If this is the case, please try again after <strong>15 minutes</strong>.');
              return res.redirect('/login');
          }

          if(!validateEmail(email)) {
            const ipRateLimitResponse = await ipRateLimiter.consume(ipRateLimitKey);
            const emailRateLimitResponse = await emailRateLimiter.consume(emailRateLimitKey);
            console.log('IP rate limit points: ' + ipRateLimitResponse.remainingPoints);
            console.log('email rate limit points: ' + emailRateLimitResponse.remainingPoints);
            req.flash('error_msg', 'Invalid login attempt.<br><br>' +  
              'Alternatively, the account may have been locked because of too many failed logins. If this is the case, please try again after <strong>15 minutes</strong>.');
            return res.redirect('/login');
          } 

          if(!validatePW(pw)) {
            const ipRateLimitResponse = await ipRateLimiter.consume(ipRateLimitKey);
            const emailRateLimitResponse = await emailRateLimiter.consume(emailRateLimitKey);
            console.log('IP rate limit points: ' + ipRateLimitResponse.remainingPoints);
            console.log('email rate limit points: ' + emailRateLimitResponse.remainingPoints);
            req.flash('error_msg', 'Invalid login attempt.<br><br>' +  
              'Alternatively, the account may have been locked because of too many failed logins. If this is the case, please try again after <strong>15 minutes</strong>.');
            return res.redirect('/login');
          } 

          // Proceed with login verification if input validation, reCAPTCHA, and rate limiting ARE successful
          connection = await getConnectionFromPool();
          //logPoolStats()

          const account = await verifyLogin(connection, req.body.email, req.body.psw);

          // checking if account is null
          if (account) {

              //req.session.accountId = account.accountId; // REMOVE AFTER IMPLEMENTING 2FA
              //return res.redirect('/'); // REMOVE AFTER IMPLEMENTING 2FA

              const oneTimeCode = generateOneTimeCode();
              await sendOneTimeCode(req.body.email, oneTimeCode);
              req.session.pendingOTC = oneTimeCode;
              req.session.pendingOTCTimestamp = Date.now();
              req.session.pendingAccount = account;

              console.log("OTP Sent")
              console.log("OTP: " + req.session.pendingOTC)
              return res.redirect('/2FA');
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
              
              req.flash('error_msg', 'Invalid login attempt.<br><br>' +  
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
    },

    get2FA: function (req, res) {
      res.render("2FA");
    },

    postVerify2FA: async (req, res) => {
      try {
          const otc = req.body.otc;
          const { pendingOTC, pendingOTCTimestamp, pendingAccount } = req.session;

          if (!pendingOTC || !pendingAccount) {
              req.flash('error_msg', 'Session expired. Please log in again.');
              return res.redirect('/login');
          }

          // Check if the OTC has expired
          const now = Date.now();
          const otcExpiry = 2 * 60 * 1000; // 2 minutes
          if (now - pendingOTCTimestamp > otcExpiry) {
              req.flash('error_msg', 'The one-time code has expired. Please request a new code.');
              return res.redirect('/2FA');
          }

          if (otc !== pendingOTC) {
              console.log("entered OTC: "  + otc)
              console.log('pending OTC: ' + pendingOTC)
              req.flash('error_msg', 'Invalid one-time code. Please try again.');
              return res.redirect('/2FA');
          }

          req.session.accountId = pendingAccount.accountId;
          delete req.session.pendingOTC;
          delete req.session.pendingOTCTimestamp;
          delete req.session.pendingAccount;
          res.redirect('/');
      } catch (error) {
          console.error('Error during 2FA verification:', error);
          req.flash('error_msg', 'An error occurred during verification. Please try again.');
          return res.redirect('/2FA');
      }
  },

  postResendOTC: async (req, res) => {
      try {
          const { pendingAccount, pendingOTCTimestamp } = req.session;

          if (!pendingAccount) {     
              req.flash('error_msg', 'Session expired. Please log in again.');
              return res.redirect('/login');
          }

          const now = Date.now();
          const resendCooldown = 2 * 60 * 1000; // 2 minutes

          if (pendingOTCTimestamp && now - pendingOTCTimestamp < resendCooldown) {
              req.flash('error_msg', 'You can request a new code after 2 minutes.');
              return res.redirect('/2FA');
          }

          const oneTimeCode = generateOneTimeCode();
          await sendOneTimeCode(pendingAccount.email, oneTimeCode);
          req.session.pendingOTC = oneTimeCode;
          req.session.pendingOTCTimestamp = now;

          req.flash('success_msg', 'A new verification code has been sent to your email.');
          res.redirect('/2FA');
      } catch (error) {
          console.error('Error during resend OTC:', error);
          req.flash('error_msg', 'An error occurred while sending the one-time code. Please try again.');
          return res.redirect('/2FA');
      }
  }
}

module.exports = login_controller;