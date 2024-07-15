const { getConnectionFromPool } = require('../db');
const { getSessionDataEntry } = require('./login_controller');

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
                connection.query("SELECT firstName, lastName, email, phoneNumber, profilePicFilename FROM accounts WHERE accountId = ?", [sessionData.accountId], function(error, results) {
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
    }
}

module.exports = profile_controller;