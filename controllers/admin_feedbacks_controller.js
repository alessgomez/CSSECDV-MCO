const { getConnectionFromPool, logPoolStats } = require('../db');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;
const logger = require('../logger');
const { getSessionDataEntry } = require('./login_controller');
const geoip = require('geoip-lite');

const admin_feedbacks_controller = {
    getViewFeedbacks: async (req, res) => {
        const data = {
            style: ["navbar", "index", "adminfeedbacks"],
            script: ["adminfeedbacks"],
            isAdmin: true,
        };
    
        let connection;
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);
            
            const sql = "SELECT feedbackId, subject, message, dateSubmitted FROM feedbacks ORDER BY dateSubmitted DESC;";
            const [results] = await connection.promise().query(sql);
            
            data.feedbacks = results.map((feedback, index) => {
                feedback.incrementedIndex = parseInt(index + 1);
                feedback.feedbackId = DOMPurify.sanitize(feedback.feedbackId);
                feedback.subject = DOMPurify.sanitize(feedback.subject);
                feedback.message = DOMPurify.sanitize(feedback.message);
                feedback.dateSubmitted = DOMPurify.sanitize(feedback.dateSubmitted);
                return feedback;
            });
    
            res.render('adminviewfeedbacks', data);

        } catch (error) {
            if (debug)
                console.error('Error retrieving feedbacks:', error);
            else 
                console.error('An error occurred.')

            logger.error('Error when admin attempted to view feedbacks', {
                meta: {
                    event: 'VIEW_FEEDBACKS_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
            });
            
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
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id)
            const query = 'DELETE FROM feedbacks WHERE feedbackId = ?';
            const [results] = await connection.promise().query(query, [feedbackId]);

            if (results.affectedRows === 0) {
                throw new Error('Feedback not found');
            } else {
                logger.info('Admin successfully deleted feedback', {
                    meta: {
                        event: 'DELETE_FEEDBACK_SUCCESS',
                        method: req.method,
                        url: req.originalUrl,
                        accountId: sessionData.accountId,
                        feedbackId: feedbackId, 
                        sourceIp: req.ip,
                        userAgent: req.headers['user-agent'],
                        hostname: req.hostname,
                        protocol: req.protocol,
                        port: req.socket.localPort,
                        geo:geoip.lookup(req.ip)
                    }
                });

                res.json({ success: true });
            }
        } catch (error) {
            if (debug)
                console.error('Error deleting feedback:', error);
            else 
                console.error('An error occurred.')

            logger.error('Error when admin attempted to delete feedback', {
                meta: {
                    event: 'DELETE_FEEDBACK_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    productId: productId, 
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
            });

            res.status(500).json({ success: false });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

}

module.exports = admin_feedbacks_controller;