const { getConnectionFromPool, logPoolStats } = require('../db');

const admin_feedbacks_controller = {
    getViewFeedbacks: async (req, res) => {
        const data = {
            style: ["navbar", "index", "adminfeedbacks"],
            script: ["adminfeedbacks"],
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

    postDeleteFeedback: async (req, res) => {
        const feedbackId = req.body.feedbackId;

        let connection = await getConnectionFromPool();

        try {
            const query = 'DELETE FROM feedbacks WHERE feedbackId = ?';
            connection.query(query, [feedbackId], (error, results) => {
                if (error) {
                    console.error('Error deleting feedback:', error);
                    res.json({ success: false, error: 'Error deleting feedback' });
                  } else {
                    res.json({ success: true });
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