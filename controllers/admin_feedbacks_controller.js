const { getConnectionFromPool, logPoolStats } = require('../db');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;

const admin_feedbacks_controller = {
    getViewFeedbacks: async (req, res) => {
        const data = {
            style: ["navbar", "index", "adminfeedbacks"],
            script: ["adminfeedbacks"],
            isAdmin: true,
        }

        let connection = await getConnectionFromPool();

        try {
            connection.query("SELECT feedbackId, subject, message FROM feedbacks", function(error, results) {
                if (error) {
                    throw error;
                } else {
                    data.feedbacks = results.map(feedback => {
                        feedback.feedbackId = DOMPurify.sanitize(feedback.feedbackId);
                        feedback.subject = DOMPurify.sanitize(feedback.subject);
                        feedback.message = DOMPurify.sanitize(feedback.message);
                        return feedback;
                    });    
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