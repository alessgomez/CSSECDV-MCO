const { getConnectionFromPool, logPoolStats } = require('../db');
const bcrypt = require("bcrypt");
const fs = require('fs');
const axios = require('axios');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const config = JSON.parse(fs.readFileSync('config.json'));
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const debug = config.DEBUG;
const logger = require('../logger');

// Rate limiter for IP addresses
const ipRateLimiter = new RateLimiterMemory({
  points: 5, // Maximum number of attempts within the duration
  duration: 300, // Timeframe in seconds for the rate limiting
  blockDuration: 300, // Block duration in seconds after exceeding attempts
});

// Rate limiter for emails
const emailRateLimiter = new RateLimiterMemory({
  points: 3, // Maximum number of attempts within the duration
  duration: 300, // Timeframe in seconds for the rate limiting
  blockDuration: 300, // Block duration in seconds after exceeding attempts
});

async function verifyLogin(connection, email, password) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM accounts WHERE email = ? AND isArchived = ?'; 
    connection.query(sql, [email, false], async (error, results) => {
      if (error) {
        reject(error);
      } else {

        if (results.length === 0) {
          resolve(null); // account not found
        } 

        const account = results[0];
        const passwordMatch = await bcrypt.compare(password, account.password);

        if (passwordMatch) {
          resolve(account.accountId); // Passwords match, return account data
        } else {
          resolve(null); // Passwords do not match
        }
      }
    });
  });
}

async function getEmail(connection, accountId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM accounts WHERE accountId = ?'; 
    connection.query(sql, [accountId], async (error, results) => {
      if (error) {
        reject(error);
      } else {
        if (results.length === 0) {
          resolve(null); // account not found
        } 
        resolve( results[0].email); 
      }
    });
  });
}

async function createSessionDataEntry(connection, sessionId, accountId, pendingOTC, pendingOTCTimestamp, verified) {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO sessiondata (sessionId, accountId, verified, pendingOTC, pendingOTCTimestamp) VALUES (?, ?, ?, ?, ?)';
    const values = [sessionId, accountId, verified, pendingOTC, pendingOTCTimestamp];
      connection.query(sql, values, async (error, results) => {
          if (error) {
              reject(error);
          } else {
              resolve(results); // session data entry successfully created
          }
      });
  });
}

async function updateSessionDataEntry(connection, sessionId, accountId, pendingOTC, pendingOTCTimestamp, verified) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE sessiondata SET accountId = ?, pendingOTC = ?, pendingOTCTimestamp = ?, verified = ? WHERE sessionId = ?';
    const values = [accountId, pendingOTC, pendingOTCTimestamp, verified, sessionId];
    connection.query(sql, values, async (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results.affectedRows > 0)
      }
    });
  });
}


async function getSessionDataEntry(connection, sessionId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM sessiondata WHERE sessionId = ?'; 
    connection.query(sql, [sessionId], async (error, results) => {
      if (error) {
        reject(error);
      } else {
        if (results.length === 0) {
          resolve(null); // session data not found
        } else {
          resolve(results[0]); 
        }
      }
    });
  });
}

async function updateSessionDataOTC(connection, sessionId, newPendingOTC, newPendingOTCTimestamp) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE sessiondata SET pendingOTC = ?, pendingOTCTimestamp = ? WHERE sessionId = ?';
    const values = [newPendingOTC, newPendingOTCTimestamp, sessionId];
    connection.query(sql, values, async (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results.affectedRows > 0)
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
    try {
        const { 'g-recaptcha-response': recaptchaResponse } = req.body;
        const email = req.body.email;
        const pw = req.body.psw;
        const ip = req.ip;
        const ipRateLimitKey = `login_attempt_ip_${ip}`;
        const emailRateLimitKey = `login_attempt_email_${email}`;

        // Check if the IP has exceeded the maximum number of failed login attempts
        const ipRateLimitStatus = await ipRateLimiter.get(ipRateLimitKey);
        if (ipRateLimitStatus && ipRateLimitStatus.consumedPoints >= ipRateLimiter.points) {
          logger.info('Failedd login attempt due to blocked IP', {
            meta: {
              event: 'LOGIN_PHASE_1_FAILURE',
              method: req.method,
              url: req.originalUrl,
              email: email,
              sourceIp: req.ip,
              userAgent: req.headers['user-agent'],
              sessionId: req.session.id 
            }
          });

            req.flash('error_msg', 'Invalid login attempt.<br><br>' +  
              'Alternatively, the account/IP may have been blocked because of too many failed logins. If this is the case, please try again after <strong>5 minutes</strong>.');
            return res.redirect('/login');
        }

        // Check if the email has exceeded the maximum number of failed login attempts
        const emailRateLimitStatus = await emailRateLimiter.get(emailRateLimitKey);
        if (emailRateLimitStatus && emailRateLimitStatus.consumedPoints >= emailRateLimiter.points) {
          logger.info('Failed login attempt due to blocked email', {
            meta: {
              event: 'LOGIN_PHASE_1_FAILURE',
              method: req.method,
              url: req.originalUrl,
              email: email,
              sourceIp: req.ip,
              userAgent: req.headers['user-agent'],
              sessionId: req.session.id 
            }
          });
            // Consume points from IP rate limiter even if email rate limit is reached
            await ipRateLimiter.consume(ipRateLimitKey);
            req.flash('error_msg', 'Invalid login attempt.<br><br>' +  
              'Alternatively, the account/IP may have been blocked because of too many failed logins. If this is the case, please try again after <strong>5 minutes</strong>.');
            return res.redirect('/login');
        }

        if (!recaptchaResponse) {
          logger.info('Failed login attempt due to missing CAPTCHA', {
            meta: {
              event: 'LOGIN_PHASE_1_FAILURE',
              method: req.method,
              url: req.originalUrl,
              email: email,
              sourceIp: req.ip,
              userAgent: req.headers['user-agent'],
              sessionId: req.session.id 
            }
          });

          await Promise.all([
            ipRateLimiter.consume(ipRateLimitKey),
            emailRateLimiter.consume(emailRateLimitKey)
          ]);

          req.flash('error_msg', 'Invalid login attempt.<br><br>' +  
            'Alternatively, the account/IP may have been blocked because of too many failed logins. If this is the case, please try again after <strong>5 minutes</strong>.');
          return res.redirect('/login');
        }

        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${config.RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`;
        const response = await axios.post(verificationUrl);
        const { success } = response.data;

        if (!success || !validateEmail(email) | !validatePW(pw)) {
          logger.info('Failed login attempt due to invalid login credentials or failed CAPTCHA', {
            meta: {
              event: 'LOGIN_PHASE_1_FAILURE',
              method: req.method,
              url: req.originalUrl,
              email: email,
              sourceIp: req.ip,
              userAgent: req.headers['user-agent'],
              sessionId: req.session.id 
            }
          });

          await Promise.all([
            ipRateLimiter.consume(ipRateLimitKey),
            emailRateLimiter.consume(emailRateLimitKey)
          ]);

          req.flash('error_msg', 'Invalid login attempt.<br><br>' +  
            'Alternatively, the account/IP may have been blocked because of too many failed logins. If this is the case, please try again after <strong>5 minutes</strong>.');
          return res.redirect('/login');
        }

        // Proceed with login verification if input validation, reCAPTCHA, and rate limiting ARE successful
        connection = await getConnectionFromPool();
        const accountId = await verifyLogin(connection, email, pw);

        if (accountId) {
            const oneTimeCode = generateOneTimeCode();
            const sessionDataEntry = await getSessionDataEntry(connection, req.session.id)

            if (!sessionDataEntry) {
              await createSessionDataEntry(connection, req.session.id, accountId, oneTimeCode, new Date(), false);
            } else {
              await updateSessionDataEntry(connection, req.session.id, accountId, oneTimeCode, new Date(), false);
            }

            sendOneTimeCode(req.body.email, oneTimeCode);

            logger.info('User login credentials verified, first phase of login successful ', {
              meta: {
                event: 'LOGIN_PHASE_1_SUCCESS',
                method: req.method,
                url: req.originalUrl,
                accountId: accountId, 
                email: email,
                sourceIp: req.ip,
                userAgent: req.headers['user-agent'],
                sessionId: req.session.id 
              }
            });

            return res.redirect('/2FA');
        }
        else {     
          logger.info('Failed login attempt due to incorrect login credentials', {
            meta: {
              event: 'LOGIN_PHASE_1_FAILURE',
              method: req.method,
              url: req.originalUrl,
              email: email,
              sourceIp: req.ip,
              userAgent: req.headers['user-agent'],
              sessionId: req.session.id 
            }
          });

          await Promise.all([
            ipRateLimiter.consume(ipRateLimitKey),
            emailRateLimiter.consume(emailRateLimitKey)
          ]);
          req.flash('error_msg', 'Invalid login attempt.<br><br>' +  
            'Alternatively, the account may have been locked because of too many failed logins. If this is the case, please try again after <strong>5 minutes</strong>.');
          res.redirect('/login');
        }
    } catch (error) {
        if (debug)
          console.error('Error during first phase of login verification:', error);
        else  
          console.error('An error occurred.');

        logger.error('Error occurred during first phase of login verification', {
          meta: {
              event: 'LOGIN_PHASE_1_ERROR',
              method: req.method,
              url: req.originalUrl,
              email: email,
              error: error,
              sourceIp: req.ip,
              userAgent: req.headers['user-agent'],
              sessionId: req.session.id 
          }
        });

        req.flash('error_msg', 'An error occurred during login. Please try again.');
        return res.redirect('/login');
    }
    finally {
      if (connection) {
        connection.release();
      }
    }
  },

  get2FA: function (req, res) {
    res.render("2FA");
  },

  postVerify2FA: async (req, res) => {
    let connection;
    let sessionData;
    try {
      const otc = req.body.otc;
      connection = await getConnectionFromPool();
      sessionData = await getSessionDataEntry(connection, req.session.id);

      if (!sessionData) {
          req.flash('error_msg', 'Session expired. Please log in again.');
          return res.redirect('/login');
      }

      const { pendingOTC, pendingOTCTimestamp, accountId } = sessionData;
      const oldSessionId = sessionData.sessionId;

      // Check if the OTC has expired
      const now = Date.now();
      const otcExpiry = 2 * 60 * 1000; // 2 minutes
      if (now - pendingOTCTimestamp > otcExpiry) {
        logger.info('Failed 2FA verification attempt due to expired OTC', {
          meta: {
            event: 'LOGIN_PHASE_2_FAILURE',
            method: req.method,
            url: req.originalUrl,
            accountId: accountId,
            sourceIp: req.ip,
            userAgent: req.headers['user-agent'],
            sessionId: req.session.id 
          }
        });

        req.flash('error_msg', 'Invalid one-time code. Please try again or request a new code.');
        return res.redirect('/2FA');
      }

      if (otc !== pendingOTC) {
        logger.info('Failed 2FA verification attempt due to incorrect OTC', {
          meta: {
            event: 'LOGIN_PHASE_2_FAILURE',
            method: req.method,
            url: req.originalUrl,
            accountId: accountId,
            sourceIp: req.ip,
            userAgent: req.headers['user-agent'],
            sessionId: req.session.id 
          }
        });

        req.flash('error_msg', 'Invalid one-time code. Please try again or request a new code.');
        return res.redirect('/2FA');
      }

      // Regenerate session and wait for the operation to complete
      await new Promise((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) 
              return reject(error);
            resolve();
        });
      });

      // Save new session
      await new Promise((resolve, reject) => {
          req.session.save((error) => {
              if (error) 
                return reject(error);
              resolve();
          });
      });

      // Create new session data entry
      await createSessionDataEntry(connection, req.session.id, accountId, null, null, true);

      // Destroy the old session
      await new Promise((resolve, reject) => {
          req.sessionStore.destroy(oldSessionId, (error) => {
              if (error) 
                return reject(error);
              resolve();
          });
      });

      logger.info('User OTC verified, second phase of login successful', {
        meta: {
          event: 'LOGIN_PHASE_2_SUCCESS',
          method: req.method,
          url: req.originalUrl,
          accountId: accountId, 
          sourceIp: req.ip,
          userAgent: req.headers['user-agent'],
          sessionId: req.session.id 
        }
      });
      
      res.redirect('/');

    } catch (error) {
        if (debug)
          console.error('Error during second phase of login verification:', error);
        else
          console.error('An error occurred.');

        logger.error('Error occurred during second phase of login verification', {
          meta: {
              event: 'LOGIN_PHASE_2_ERROR',
              method: req.method,
              url: req.originalUrl,
              accountId: sessionData.accountId,
              error: error,
              sourceIp: req.ip,
              userAgent: req.headers['user-agent'],
              sessionId: req.session.id 
          }
        });

        req.flash('error_msg', 'An error occurred during 2FA verification. Please try again.');
        return res.redirect('/2FA');
    } finally {
        if (connection) {
            connection.release();
        }
    }
  },

  postResendOTC: async (req, res) => {
    let connection;
    let sessionData;
    try {
        connection = await getConnectionFromPool();
        sessionData = await getSessionDataEntry(connection, req.session.id);

        if (!sessionData || !sessionData.accountId) {     
            req.flash('error_msg', 'Session expired. Please log in again.');
            return res.redirect('/login');
        }

        const { pendingOTCTimestamp, accountId } = sessionData;
        const email = await getEmail(connection, accountId);

        const now = Date.now();
        const resendCooldown = 2 * 60 * 1000; // 2 minutes

        if (pendingOTCTimestamp && now - pendingOTCTimestamp < resendCooldown) {
          logger.info('OTC resend request failed due to unfinished cooldown period', {
            meta: {
              event: 'OTC_RESEND_FAILURE',
              method: req.method,
              url: req.originalUrl,
              accountId: accountId, 
              sourceIp: req.ip,
              userAgent: req.headers['user-agent'],
              sessionId: req.session.id 
            }
          });

          req.flash('error_msg', 'You can request a new code after 2 minutes.');
          return res.redirect('/2FA');
        }

        const oneTimeCode = generateOneTimeCode();
        sendOneTimeCode(email, oneTimeCode);

        await updateSessionDataOTC(connection, req.session.id, oneTimeCode, now);

        logger.info('Login OTC successfully resent', {
          meta: {
            event: 'OTC_RESEND_SUCCESS',
            method: req.method,
            url: req.originalUrl,
            accountId: accountId, 
            sourceIp: req.ip,
            userAgent: req.headers['user-agent'],
            sessionId: req.session.id 
          }
        });

        req.flash('success_msg', 'A new verification code has been sent to your email.');
        res.redirect('/2FA');
    } catch (error) {
        if (debug)
          console.error('Error during resend OTC:', error);
        else
          console.error('An error occurred')

        logger.error('Error occurred when trying to resend OTC', {
          meta: {
              event: 'OTC_RESEND_ERROR',
              method: req.method,
              url: req.originalUrl,
              accountId: sessionData.accountId,
              error: error,
              sourceIp: req.ip,
              userAgent: req.headers['user-agent'],
              sessionId: req.session.id 
          }
        });

        req.flash('error_msg', 'An error occurred while sending the one-time code. Please try again.');
        return res.redirect('/2FA');
    } finally {
        if (connection) {
            connection.release();
        }
    }  
  }
}

module.exports = {
  login_controller,
  getSessionDataEntry
};