const { getConnectionFromPool, logPoolStats } = require('../db');

const admin_feedbacks_controller = {
    getViewFeedbacks: async (req, res) => {
        const data = {
            style: ["navbar", "index", "adminfeedbacks"],
            isAdmin: true,
        }

        let connection = await getConnectionFromPool();

        try {
            connection.query("SELECT * FROM feedbacks", function(error, results) {
                if (error) {
                    throw error;
                } else {
                    data.feedbacks = results;
                    res.render('adminviewfeedbacks', data);
                }
            });
        } catch (error) {
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }

    },
}

module.exports = admin_feedbacks_controller;