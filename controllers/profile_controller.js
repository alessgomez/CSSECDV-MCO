const { getConnectionFromPool } = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const { deleteSessionDataEntry } = require('./general_controller.js');
const { fileFilter, getMimeType, sanitizeImage } = require('./registration_controller.js')
const bcrypt = require("bcrypt");
const multer = require('multer');
const storage = multer.memoryStorage();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;
const logger = require('../logger');

const checkUuidExists = (connection, newId) => {
    return new Promise((resolve, reject) => {
        let sql = 'SELECT * FROM accounts WHERE profilePicFilename = ?';
        
        connection.query(sql, [newId], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.length > 0);
            }
        });
    });
};

// Initialize upload middleware and add file size limit
const upload = multer({
    storage: storage,
    limits: { fileSize: 3 * 1024 * 1024}, // 3 MB file size limit
    fileFilter: fileFilter
}).single('inputFile');

async function checkAccountDetails(connection, accountId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT firstName, lastName, email, password, address, phoneNumber, profilePicFilename FROM accounts WHERE accountId = ?';
        connection.query(sql, [accountId], (error, results) => {
            if (error) {
                reject(error);
            } else {
                if (results.length === 0)
                    resolve(null);
                else
                    resolve(results[0]);
            }
        });
    });
}

async function checkEmailExists(connection, email) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT accountId FROM accounts WHERE email = ?';
        connection.query(sql, [email], (error, results) => {
            if (error) {
                reject(error);
            } else {
                if (results.length === 0)
                    resolve(false);
                else
                    resolve(true);
            }
        });
    });
}

function validateDetails(newDetails) {
    const nameRegex = /^(?!.*[,'-]{2})(?!.* [,'-])(?![,'-])(?=.{1,45}$)[A-Za-z]+(?:[ ,'-][A-Za-z]+)*(?:, [A-Za-z]+)*\.?$/;
    const nameValid = nameRegex.test(newDetails.firstName) && nameRegex.test(newDetails.lastName);

    const emailRegex = /^(([_-][A-Za-z0-9]+)|[A-Za-z0-9]+)([_.-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*(\.[A-Za-z]{2,})$/
    const emailValid = emailRegex.test(newDetails.email) && newDetails.email.substr(0, newDetails.email.indexOf('@')).length <= 64 && newDetails.email.substr(newDetails.email.indexOf('@')).length <= 255
    
    const addressRegex = /^([0-9a-zA-Z ,.#-]+),\s*([0-9a-zA-Z ,.#-]+),\s*([0-9a-zA-Z ,.#-]+),\s*([0-9]{4})$/;
    const addressValid = addressRegex.test(newDetails.address) && newDetails.address.length <= 160;

    const phoneNumberRegex = /^(09|\+639)\d{9}$/;
    const phoneNumberValid = phoneNumberRegex.test(newDetails.phoneNumber);

    return nameValid && emailValid && addressValid && phoneNumberValid;
}

function validatePassword(newPassword) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,64}$/;
    return passwordRegex.test(newPassword);
}

const profile_controller = {
    getProfile: async (req, res) => {
        const profilePageData = {
            style: ["navbar", "accountdetails", "profile"],
            script: ["profile"],
            partialName: ["profile"],
            accountDetails: {}
        }

        let connection;
        let sessionData;

        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                connection.query('SELECT firstName, lastName, email, address, phoneNumber, profilePicFilename FROM accounts WHERE accountId = ?', [sessionData.accountId], function(error, results) {
                    if (error) {
                        throw error;
                    } else {
                        profilePageData.accountDetails = results[0];
                        res.render("account", profilePageData);
                    }
                });
            } else
                throw new Error('Session data not found.');
        } catch (error) {
            if (debug)
                console.error('Error loading profile page:', error);
            else
                console.error('An error occurred when loading profile page.');

            logger.error('Error when user attempted to view profile', {
                meta: {
                    event: 'VIEW_PROFILE_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });

            req.flash('error_msg', 'An error occurred. Please try again.');
            res.redirect('/');
        } finally {
            if (connection)
                connection.release();
        }
    },

    getChangePassword: async (req, res) => {
        const changePwPageData = {
            style: ["navbar", "accountdetails", "profile"],
            script: ["changepw"],
            partialName: ["changepw"]
        }

        let connection;
        let sessionData;

        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                res.render("account", changePwPageData);
            } else
                throw new Error('Session data not found.');
        } catch (error) {
            if (debug)
                console.error('Error loading change password page:', error);
            else
                console.error('An error occurred when loading change password page.');

            logger.error('Error when user attempted to view change password page', {
                meta: {
                    event: 'VIEW_CHANGE_PASSWORD_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });

            req.flash('error_msg', 'An error occurred. Please try again.');
            res.redirect('/profile');
        } finally {
            if (connection)
                connection.release();
        }
    },

    postUpdateAccount: async (req, res) => {
        let connection;
        let sessionData;

        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);
            
            if (sessionData) {
                upload(req, res, async (err) => {
                    try {
                        if (err)
                            throw error;
                        
                        const newDetails = req.body;
                        const currentDetails = await checkAccountDetails(connection, sessionData.accountId);

                        if (currentDetails) {
                            // START OF RESPONSE VALIDATION
                            if (validateDetails(newDetails)) {
                                if (newDetails.email !== currentDetails.email) {
                                    const emailExists = await checkEmailExists(connection, newDetails.email);
            
                                    if (emailExists) {
                                        throw new Error('Email already exists.');
                                    } else {
                                        connection.query('UPDATE accounts SET email = ?, dateEdited = ? WHERE accountId = ?', [newDetails.email, new Date(), sessionData.accountId], function(error, results) {
                                            if (error) {
                                                throw error;
                                            }
                                        });
                                    }
                                }

                                if (req.file) {
                                    // 1. File signature 
                                    signature = req.file.buffer.toString('hex').toUpperCase();
                                    fileMimeType = getMimeType(signature);
                                    if (fileMimeType == 'image/jpeg' || fileMimeType == 'image/png'){
                                        // 2. Image rewriting 
                                        let sanitizedBuffer = await sanitizeImage(req.file.buffer);
                                        
                                        // 3. save to folder - filename!
                                        let newFileName;
                                        let uuidExists = true;
                                        filePath = './public/uploads/';
                                        fileExtension = fileMimeType.split("/")[1];

                                        while (uuidExists) {
                                            newFileName = uuidv4() + "." + fileExtension;
                                            uuidExists = await checkUuidExists(connection, newFileName);
                                        }
                                        fs.writeFileSync(filePath + newFileName, sanitizedBuffer);
                                        newDetails['profilePicFilename'] = newFileName;
            
                                        // 4. update profile picture in DB.
                                        if (newDetails.profilePicFilename !== currentDetails.profilePicFilename) {
                                            connection.query('UPDATE accounts SET profilePicFilename = ?, dateEdited = ? WHERE accountId = ?', [newDetails.profilePicFilename, new Date(), sessionData.accountId], function(error, results) {
                                                if (error) {
                                                    throw error;
                                                }
                                            });
                                        }
                                    } else
                                        throw new Error('Invalid file.');
                                }

                                if (newDetails.firstName !== currentDetails.firstName || newDetails.lastName !== currentDetails.lastName || 
                                    newDetails.address !== currentDetails.address || newDetails.phoneNumber !== currentDetails.phoneNumber) {
                                    const sql = 'UPDATE accounts SET firstName = ?, lastName = ?, address = ?, phoneNumber = ?, dateEdited = ? WHERE accountId = ?';
                                    connection.query(sql, [newDetails.firstName, newDetails.lastName, newDetails.address, newDetails.phoneNumber, new Date (), sessionData.accountId], function(error, results) {
                                        if (error) {
                                            throw error;
                                        }
                                    });
                                }

                                logger.info('User successfully updated account details', {
                                    meta: {
                                      event: 'UPDATE_ACCOUNT_SUCCESS',
                                      method: req.method,
                                      url: req.originalUrl,
                                      accountId: sessionData.accountId,
                                      sourceIp: req.ip,
                                      userAgent: req.headers['user-agent']
                                    }
                                });

                                req.flash('success_msg', 'Account details successfully updated.');
                                res.redirect('/profile');
                            } else
                                throw new Error('Invalid new account details.');
                        } else
                            throw new Error('Current account details not found.');
                    } catch (error) {
                        if (debug)
                            console.error('Error updating account details:', error);
                        else
                            console.error('An error occurred during profile update.');

                        logger.error('Error when user attempted to update account details', {
                            meta: {
                                event: 'UPDATE_ACCOUNT_ERROR',
                                method: req.method,
                                url: req.originalUrl,
                                accountId: sessionData.accountId,
                                error: error,
                                sourceIp: req.ip,
                                userAgent: req.headers['user-agent']
                            }
                        });
        
                        req.flash('error_msg', 'An error occurred during profile update. Please try again.');
                        return res.redirect('/profile');
                    } finally {
                        if (connection)
                            connection.release();
                    }
                })
            } else
                throw new Error('Session data not found.');
        } catch (error) {
            if (debug)
                console.error('Error updating account details:', error);
            else
                console.error('An error occurred during profile update.');

            logger.error('Error when user attempted to update account details', {
                meta: {
                    event: 'UPDATE_ACCOUNT_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'] 
                }
            });

            req.flash('error_msg', 'An error occurred during profile update. Please try again.');
            return res.redirect('/profile');
        } finally {
            if (connection)
                connection.release();
        }
    },

    postUpdatePassword: async (req, res) => {
        let connection;
        let sessionData;

        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                const passwordDetails = req.body;
                const currentAccount = await checkAccountDetails(connection, sessionData.accountId);

                if (currentAccount) {
                    if (await bcrypt.compare(passwordDetails.oldPsw, currentAccount.password)) {
                        if (validatePassword(passwordDetails.newPsw)) {
                            if (!await bcrypt.compare(passwordDetails.newPsw, currentAccount.password)) {
                                const hashedPassword = await bcrypt.hash(passwordDetails.newPsw, config.saltRounds);

                                connection.query('UPDATE accounts SET password = ?, dateEdited = ? WHERE accountId = ?', [hashedPassword, new Date(), sessionData.accountId], function(error, results) {
                                    if (error) {
                                        throw error;
                                    }
                                });

                                logger.info('User successfully updated password', {
                                    meta: {
                                      event: 'UPDATE_PASSWORD_SUCCESS',
                                      method: req.method,
                                      url: req.originalUrl,
                                      accountId: sessionData.accountId,
                                      sourceIp: req.ip,
                                      userAgent: req.headers['user-agent']
                                    }
                                });

                                await deleteSessionDataEntry(connection, sessionData.sessionId);

                                req.session.destroy(err => {
                                    if (err) {
                                        if (debug)
                                            console.error('Error destroying session:', err);
                                        else 
                                            console.error('An error occurred.')
                                        return res.redirect('/login'); 
                                    }
                                    res.clearCookie('thehungrycookie');
                                    
                                    logger.info('User successfully logged out', {
                                        meta: {
                                          event: 'USER_LOGOUT_SUCCESS',
                                          method: req.method,
                                          url: req.originalUrl,
                                          accountId: sessionData.accountId, 
                                          sourceIp: req.ip,
                                          userAgent: req.headers['user-agent']
                                        }
                                    });
                        
                                    res.redirect('/login');
                                });
                            } else
                                throw new Error('New password is the same as the old password.');
                        } else
                            throw new Error('Invalid new password.');
                    } else
                        throw new Error('Incorrect current password.');
                } else
                    throw new Error('Current account details not found.');
            } else
                throw new Error('Session data not found.');
        } catch (error) {
            if (debug)
                console.error('Error updating password:', error);
            else
                console.error('An error occurred during password update.');

            logger.error('Error when user attempted to update password', {
                meta: {
                    event: 'UPDATE_PASSWORD_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });
            
            req.flash('error_msg', 'An error occurred during password update. Please try again.');
            return res.redirect('/changePassword');
        } finally {
            if (connection)
                connection.release();
        }
    },

    getDeleteAccount: async (req, res) => {
        let connection;
        let sessionData;

        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                connection.query('UPDATE accounts SET isArchived = ?, dateArchived = ? WHERE accountId = ?', [true, new Date(), sessionData.accountId], function(error, results) {
                    if (error) {
                        throw error;
                    }
                });

                logger.info('User successfully deleted account', {
                    meta: {
                      event: 'DELETE_ACCOUNT_SUCCESS',
                      method: req.method,
                      url: req.originalUrl,
                      accountId: sessionData.accountId, 
                      sourceIp: req.ip,
                      userAgent: req.headers['user-agent']
                    }
                });

                await deleteSessionDataEntry(connection, sessionData.sessionId);
                
                req.session.destroy(err => {
                    if (err) {
                        if (debug)
                            console.error('Error destroying session:', err);
                        else 
                            console.error('An error occurred.')
                        return res.redirect('/login'); 
                    }
                    res.clearCookie('thehungrycookie');
                    
                    logger.info('User successfully logged out', {
                        meta: {
                          event: 'USER_LOGOUT_SUCCESS',
                          method: req.method,
                          url: req.originalUrl,
                          accountId: sessionData.accountId, 
                          sourceIp: req.ip,
                          userAgent: req.headers['user-agent']
                        }
                    });
        
                    res.redirect('/login');
                });
            } else
                throw new Error('Session data not found.');
        } catch (error) {
            if (debug)
                console.error('Error deleting account:', error);
            else
                console.error('An error occurred during account deletion.');

            logger.error('Error when user attempted to delete account', {
                meta: {
                    event: 'DELETE_ACCOUNT_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });

            req.flash('error_msg', 'An error occurred during account deletion. Please try again.');
            return res.redirect('/profile');
        } finally {
            if (connection)
                connection.release();
        }
    }
}

module.exports = profile_controller;