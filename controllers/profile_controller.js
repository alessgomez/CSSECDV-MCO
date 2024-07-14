const { getConnectionFromPool, logPoolStats } = require('../db');

const profile_controller = {
    getProfile: async (req, res) => {
        const profilePageData = {
            style: ["navbar", "profile"],
            script: ["profileDetails"],
            partialName: ["profileDetails"],
            accountDetails: {}
        }

        res.render("profile", profilePageData);

        // let connection = await getConnectionFromPool();

        // try {
        //     connection.query("SELECT * FROM accounts WHERE accountId = ?", [req.session.accountId], function(error, results) {
        //         if (error) {
        //             throw error;
        //         } else {
        //             profilePageData.accountDetails = results[0];
        //             res.render("profile", profilePageData);
        //         }
        //     });
        // } catch (error) {
        //     console.log(error);
        // } finally {
        //     if (connection)
        //         connection.release();
        // }
    }
}

module.exports = profile_controller;