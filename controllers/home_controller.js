const {getConnectionFromPool} = require('../db');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const { getSessionDataEntry } = require('./login_controller');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const debug = process.env.DEBUG;
const geoip = require('geoip-lite');

const home_controller = {

    getUserHome: async (req, res) => {
        const userPageData = {
            style: ["navbar", "index"],
            script: ["index"], 
            bestSellers: [],
            bag: req.bag
        }
        
        let connection;
        let sessionData;

        try  {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            const query = "SELECT * FROM products WHERE isBestSeller = 1;";

            const results = await new Promise ((resolve, reject) => {
                connection.query(query, async(error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        for(let i = 0; i < results.length; i++) {
                            userPageData.bestSellers.push({
                                productId: DOMPurify.sanitize(results[i].productId),
                                imageFilename: DOMPurify.sanitize(results[i].imageFilename),
                                name: DOMPurify.sanitize(results[i].name),
                                price: parseFloat(DOMPurify.sanitize(results[i].price))
                            })
                        }

                        resolve(results);
                    }
                })
            })
            res.render("index", userPageData);
        } catch(error) {
            if (debug)
                console.error('Error fetching user home data:', error);
            else 
                console.error('An error occurred.')

            logger.error('Error when user attempted to view home', {
                meta: {
                    event: 'VIEW_HOME_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    errorMessage: error.message, 
                    errorStack: error.stack, 
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
            });
            res.status(500).send('Internal Server Error');
        } finally{
            if (connection)
                connection.release();
        }
    },

    getAdminHome: async (req, res) => {
        const adminPageData = {
            style: ["navbar", "index"],
            isAdmin: true
        };
    
        let connection;
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            const query = `
                SELECT firstName, lastName, email, phoneNumber, dateCreated, dateEdited, dateArchived
                FROM accounts
                WHERE role = 'USER'
                ORDER BY dateCreated ASC
            `;
    
            const results = await new Promise((resolve, reject) => {
                connection.query(query, (error, results) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(results);
                });
            });
    
            adminPageData.users = results.map(user => {
                return {
                    firstName: DOMPurify.sanitize(user.firstName),
                    lastName: DOMPurify.sanitize(user.lastName),
                    email: DOMPurify.sanitize(user.email),
                    phoneNumber: DOMPurify.sanitize(user.phoneNumber),
                    dateCreated: DOMPurify.sanitize(user.dateCreated),
                    dateEdited: DOMPurify.sanitize(user.dateEdited),
                    dateArchived: DOMPurify.sanitize(user.dateArchived),
                };
            });
    
            res.render("admin", adminPageData);
    
        } catch (error) {
            if (debug)
                console.error('Error fetching admin home data:', error);
            else 
                console.error('An error occurred.')

            logger.error('Error when admin attempted to view users', {
                meta: {
                    event: 'VIEW_USERS_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    errorMessage: error.message, 
                    errorStack: error.stack, 
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
    }
}

module.exports = home_controller;