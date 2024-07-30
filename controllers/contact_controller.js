const { getConnectionFromPool } = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const debug = process.env.DEBUG;
const logger = require('../logger');

const MAX_LENGTH_SUBJECT = 50; 
const MAX_LENGTH_MESSAGE = 500; 

async function checkFeedbackUuidExists(connection, newId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM feedbacks WHERE feedbackId = ?';
        connection.query(sql, [newId], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.length > 0);
            }
        });
    });
}


function whiteListValidation(text) { // TODO: double check if correct 
    const unicodeCategories = {
        lowercase: /\p{Ll}/u,  // Lowercase letters
        uppercase: /\p{Lu}/u,  // Uppercase letters
        digit: /\p{Nd}/u,      // Decimal digits
        symbol: /\p{Po}/u,     // Other punctuation
        punctuation: /\p{Zs}/u // Space separator 
    };
    
    for (let char of text) {
        let isValid = false;
        for(let category in unicodeCategories) {
            if (unicodeCategories[category].test(char)) {
                isValid = true;
                break;
            }
        }

        if (!isValid) {
            return false;
        }
    }
    return true;
}

function validateDetails(newFeedback) {
    // validate subject
    newFeedback.subject = newFeedback.subject.normalize('NFKC');

    if (!(newFeedback.subject.length > 0 && newFeedback.subject.length <= MAX_LENGTH_SUBJECT)) 
        return false;

    if (!whiteListValidation(newFeedback.subject)) 
        return false;

    // validate message
    newFeedback.message = newFeedback.message.normalize('NFKC');

    if (!(newFeedback.message.length > 0 && newFeedback.message.length <= MAX_LENGTH_MESSAGE)) 
        return false;

    if (!whiteListValidation(newFeedback.message)) 
        return false;

    return true;
}

const contact_controller = {
    getContact: async (req, res) => {
        const data = {
            style: ["navbar", "contact"],
            script: ["contact"],
            bag: req.bag
        }
        res.render("contact", data);
    },

    postAddFeedback: async (req, res) => {
        let connection;
        let sessionData;

        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            const newFeedback = {
                feedbackId: null,
                accountId: null,
                subject: DOMPurify.sanitize(req.body.subject),
                message: DOMPurify.sanitize(req.body.message),
                dateSubmitted: null
            }

            if (!validateDetails(newFeedback)) {
                throw new Error("Invalid feedback details.");
            }

            let newId;
            let uuidExists = true;

            while(uuidExists) {
                newId = uuidv4();
                uuidExists = await checkFeedbackUuidExists(connection, newId);
            }

            newFeedback.feedbackId = newId;
            newFeedback.accountId = sessionData.accountId;
            newFeedback.dateSubmitted = new Date();

            const result = await new Promise((resolve, reject) => {
                const sql = 'INSERT INTO feedbacks (feedbackId, accountId, subject, message, dateSubmitted) VALUES (?, ?, ?, ?, ?)';
                const values = [newFeedback.feedbackId, newFeedback.accountId, newFeedback.subject, newFeedback.message, newFeedback.dateSubmitted];
                connection.query(sql, values, async(error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(newId);
                    }
                })
            })

            if (result === null) {
                res.json({success: false})
            }

            logger.info('User successfully added a new feedback', {
                meta: {
                    event: 'ADD_FEEDBACK_SUCCESS',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    feedbackId: result,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            })

            res.json({ success: true });
        } catch(error) {
            if (debug) 
                console.error('Error adding a feedback: ', error);
            else
                console.error('An error occurred.');

            logger.error('Error when user attempted to add new feedback', {
                meta: {
                    event: 'ADD_FEEDBACK_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            })
            res.json({success: false})
        } finally {
            if (connection) 
                connection.release();
        }
    }
}

module.exports = contact_controller;