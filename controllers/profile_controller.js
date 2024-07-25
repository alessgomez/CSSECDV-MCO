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

        let connection = await getConnectionFromPool();

        try {
            const sessionData = getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                connection.query('SELECT firstName, lastName, email, address, phoneNumber, profilePicFilename FROM accounts WHERE accountId = ?', [sessionData.accountId], function(error, results) {
                    if (error) {
                        throw error;
                    } else {
                        profilePageData.accountDetails = results[0];
                        res.render("account", profilePageData);
                    }
                });
            } else {
                res.redirect("/login");
            }
        } catch (error) {
            console.log("Error loading profile page");
            console.log(error);
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

        let connection = await getConnectionFromPool();

        try {
            const sessionData = getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                res.render("account", changePwPageData);
            } else {
                res.redirect("/login");
            }
        } catch (error) {
            console.log("Error loading change password page.");
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }
    },

    postUpdateAccount: async (req, res) => {
        let connection = await getConnectionFromPool();

        try {
            const sessionData = getSessionDataEntry(connection, req.session.id);
            
            if (sessionData) {
                upload(req, res, async (err) => {
                    if (err) {
                        console.error(err);
                        req.flash('error_msg', 'Invalid file name. File name can only contain alphanumeric characters, hypen, underscore, or period.');
                        return res.redirect('/profile');
                    }
                    
                    const newDetails = req.body;
                    const currentDetails = await checkAccountDetails(connection, sessionData.accountId);

                    if (currentDetails) {
                        // START OF RESPONSE VALIDATION
                        if (validateDetails(newDetails)) {
                            if (newDetails.firstName !== currentDetails.firstName || newDetails.lastName !== currentDetails.lastName || 
                                newDetails.address !== currentDetails.address || newDetails.phoneNumber !== currentDetails.phoneNumber) {
                                const sql = 'UPDATE accounts SET firstName = ?, lastName = ?, address = ?, phoneNumber = ?, dateEdited = ? WHERE accountId = ?';
                                connection.query(sql, [newDetails.firstName, newDetails.lastName, newDetails.address, newDetails.phoneNumber, new Date (), sessionData.accountId], function(error, results) {
                                    if (error) {
                                        throw error;
                                    }
                                });
                            }
        
                            if (newDetails.email !== currentDetails.email) {
                                const emailExists = await checkEmailExists(connection, newDetails.email);
        
                                if (emailExists) {
                                    req.flash('error_msg', 'Invalid email.');
                                    return res.redirect('/profile');
                                } else {
                                    connection.query('UPDATE accounts SET email = ?, dateEdited = ? WHERE accountId = ?', [newDetails.email, new Date(), sessionData.accountId], function(error, results) {
                                        if (error) {
                                            throw error;
                                        }
                                    });
                                }
                            }

                            if (!req.file) {
                                req.flash('success_msg', 'Account details successfully updated.');
                                res.redirect("/profile");
                            } else if (req.file) {
                                // 1. File signature 
                                signature = req.file.buffer.toString('hex').toUpperCase();
                                fileMimeType = getMimeType(signature);
                                if (fileMimeType == 'image/jpeg' || fileMimeType == 'image/png'){
                                    // 2. Image rewriting 
                                    sanitizeImage(req.file.buffer)
                                        .then(async sanitizedBuffer => {
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
                    
                                            req.flash('success_msg', 'Account details successfully updated.');
                                            res.redirect("/profile");
                                        })
                                        .catch(error => {
                                            console.error('Image sanitization failed: ', error);
                                            throw new Error("ERROR: Image sanitization failed.");
                                        })
                                }
                                else {
                                    throw new Error("ERROR: Invalid file.")
                                }
                            }
                        } else {
                            req.flash('error_msg', 'Invalid new details.');
                            return res.redirect('/profile');
                        }
                    } else
                        res.redirect("/login");
                })
            }
        } catch (error) {
            req.flash('error_msg', 'An error occurred during profile update. Please relogin and try again.');
            deleteSessionDataEntry(connection, req.session.sessionId);
            return res.redirect('/login');
        } finally {
            if (connection)
                connection.release();
        }
    },

    postUpdatePassword: async (req, res) => {
        let connection = await getConnectionFromPool();

        try {
            const sessionData = getSessionDataEntry(connection, req.session.id);

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

                                deleteSessionDataEntry(connection, sessionData.sessionId);

                                req.session.destroy(() => {
                                    res.clearCookie('thehungrycookie'); 
                                    console.log("Session successfully destroyed.");
                                    res.redirect('/login');
                                });
                            } else {
                                req.flash('error_msg', 'New password cannot be the same as the old password.');
                                return res.redirect('/changePassword');
                            }
                        } else {
                            req.flash('error_msg', 'Invalid new password.');
                            return res.redirect('/changePassword');
                        }
                    } else {
                        req.flash('error_msg', 'Incorrect current password. Please try again.');
                        return res.redirect('/changePassword');
                    }
                } else
                    res.redirect("/login");
            } else {
                res.redirect("/login");
            }
        } catch (error) {
            console.log(error);
            req.flash('error_msg', 'An error occurred during password update. Please try again.');
            return res.redirect('/changePassword');
        } finally {
            if (connection)
                connection.release();
        }
    },

    getDeleteAccount: async (req, res) => {
        let connection = await getConnectionFromPool();

        try {
            const sessionData = getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                connection.query('UPDATE accounts SET isArchived = ?, dateArchived = ? WHERE accountId = ?', [true, new Date(), sessionData.accountId], function(error, results) {
                    if (error) {
                        throw error;
                    }
                });

                deleteSessionDataEntry(connection, sessionData.sessionId);
                
                req.session.destroy(() => {
                    res.clearCookie('thehungrycookie'); 
                    console.log("Session successfully destroyed.");
                    res.redirect('/login');
                });
            } else {
                res.redirect("/login");
            }
        } catch (error) {
            console.log(error);
            req.flash('error_msg', 'An error occurred during account deletion. Please try again.');
            return res.redirect('/profile');
        } finally {
            if (connection)
                connection.release();
        }
    }
}

module.exports = profile_controller;