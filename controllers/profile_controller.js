const { get } = require('mongoose');
const { getConnectionFromPool } = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const bcrypt = require("bcrypt");
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));

async function checkAccountDetails(connection, accountId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT firstName, lastName, email, password, phoneNumber, profilePicFilename FROM accounts WHERE accountId = ?';
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
    
    const phoneNumberRegex = /^(09|\+639)\d{9}$/;
    const phoneNumberValid = phoneNumberRegex.test(newDetails.phoneNumber);

    return nameValid && emailValid && phoneNumberValid;
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
            const sessionData = await getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                connection.query('SELECT firstName, lastName, email, phoneNumber, profilePicFilename FROM accounts WHERE accountId = ?', [sessionData.accountId], function(error, results) {
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
            const sessionData = await getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                res.render("account", changePwPageData);
            } else {
                res.redirect("/login");
            }
        } catch (error) {
            console.log("Error loading change password page");
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }
    },

    postUpdateAccount: async (req, res) => {
        let connection = await getConnectionFromPool();

        try {
            const sessionData = await getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                const newDetails = req.body;
                const currentDetails = await checkAccountDetails(connection, sessionData.accountId);

                if (currentDetails) {
                    // TODO: Changing & backend validation of profile pic

                    if (validateDetails(newDetails)) {
                        if (newDetails.firstName !== currentDetails.firstName || newDetails.lastName !== currentDetails.lastName || newDetails.phoneNumber !== currentDetails.phoneNumber) {
                            const sql = 'UPDATE accounts SET firstName = ?, lastName = ?, phoneNumber = ? WHERE accountId = ?';
                            connection.query(sql, [newDetails.firstName, newDetails.lastName, newDetails.phoneNumber, sessionData.accountId], function(error, results) {
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
                                connection.query('UPDATE accounts SET email = ? WHERE accountId = ?', [newDetails.email, sessionData.accountId], function(error, results) {
                                    if (error) {
                                        throw error;
                                    }
                                });
                            }
                        }

                        req.flash('success_msg', 'Account details successfully updated.');
                        res.redirect("/profile");
                    } else {
                        req.flash('error_msg', 'Invalid new details.');
                        return res.redirect('/profile');
                    }
                } else
                    res.redirect("/login");
            } else {
                res.redirect("/login");
            }
        } catch (error) {
            console.log(error);
            req.flash('error_msg', 'An error occurred during profile update. Please try again.');
            return res.redirect('/profile');
        } finally {
            if (connection)
                connection.release();
        }
    },

    postUpdatePassword: async (req, res) => {
        let connection = await getConnectionFromPool();

        try {
            const sessionData = await getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                const passwordDetails = req.body;
                const currentAccount = await checkAccountDetails(connection, sessionData.accountId);

                if (currentAccount) {
                    const oldPasswordMatch = await bcrypt.compare(passwordDetails.oldPsw, currentAccount.password);

                    if (oldPasswordMatch) {
                        if (validatePassword(passwordDetails.newPsw)) {
                            const newPasswordIsNotOld = await bcrypt.compare(passwordDetails.newPsw, currentAccount.password);

                            if (!newPasswordIsNotOld) {
                                const hashedPassword = await bcrypt.hash(passwordDetails.newPsw, config.saltRounds);

                                connection.query('UPDATE accounts SET password = ? WHERE accountId = ?', [hashedPassword, sessionData.accountId], function(error, results) {
                                    if (error) {
                                        throw error;
                                    }

                                    req.flash('success_msg', 'Password successfully changed.');
                                    res.redirect("/profile");
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
    }
}

module.exports = profile_controller;