const {getConnectionFromPool} = require('../db');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;

const home_controller = {

    getUserHome: async (req, res) => {
        const userPageData = {
            style: ["navbar", "index"],
            script: ["index"], 
            bestSellers: [],
            bag: {}
        }
        
        res.render("index", userPageData);
    },

    getAdminHome: async (req, res) => {
        const adminPageData = {
            style: ["navbar", "index"],
            isAdmin: true
        };
    
        let connection;
    
        try {
            connection = await getConnectionFromPool();
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
            res.status(500).send('Internal Server Error');
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
}

module.exports = home_controller;