const { getConnectionFromPool } = require('../db');
const { getSessionDataEntry } = require('./login_controller');

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

    postUpdateAccount: async (req, res) => {
        let connection = await getConnectionFromPool();

        try {
            const sessionData = await getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                const newDetails = req.body;
                const currentDetails = await checkAccountDetails(connection, sessionData.accountId);

                if (currentDetails) {
                    // TODO: backend validation for all inputs, only if it passes validation can it proceed below

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

                    // TODO: Changing profile pic

                    res.redirect("/profile");
                } else
                    res.redirect("/login");
            } else {
                res.redirect("/login");
            }
        } catch (error) {
            console.log("Error updating account details");
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }
    }
}

module.exports = profile_controller;