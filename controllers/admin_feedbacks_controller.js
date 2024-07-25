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
        };
    
        let connection;
        
        try {
            connection = await getConnectionFromPool();
            
            const sql = "SELECT feedbackId, subject, message FROM feedbacks";
            const [results] = await connection.promise().query(sql);
            
            data.feedbacks = results.map(feedback => {
                feedback.feedbackId = DOMPurify.sanitize(feedback.feedbackId);
                feedback.subject = DOMPurify.sanitize(feedback.subject);
                feedback.message = DOMPurify.sanitize(feedback.message);
                return feedback;
            });
    
            res.render('adminviewfeedbacks', data);

        } catch (error) {
            if (debug)
                console.error('Error retrieving feedbacks:', error);
            else 
                console.error('An error occurred.')
            res.status(500).send('Internal Server Error');
        } finally {
            if (connection) {
                connection.release();
            }
        }

    },

    postDeleteFeedback: async (req, res) => {
        const feedbackId = req.body.feedbackId;
        let connection;

        try {
            connection = await getConnectionFromPool();
            const query = 'DELETE FROM feedbacks WHERE feedbackId = ?';
            const [results] = await connection.promise().query(query, [feedbackId]);

            if (results.affectedRows === 0) {
                throw new Error('Feedback not found');
            } else {
                res.json({ success: true });
            }
        } catch (error) {
            if (debug)
                console.error('Error deleting feedback:', error);
            else 
                console.error('An error occurred.')
            res.status(500).json({ success: false });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

}

module.exports = admin_feedbacks_controller;