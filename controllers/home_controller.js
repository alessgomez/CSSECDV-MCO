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
            isAdmin: true,
        }

        let connection = await getConnectionFromPool();

        try {
            connection.query(`SELECT firstName, lastName, email, phoneNumber, dateCreated, dateEdited, dateArchived
                             FROM accounts WHERE role = 'USER' ORDER BY dateCreated ASC`, function(error, results) {
                if (error) {
                    throw error;
                } else {
                    adminPageData.users = results.map(user => {
                        user.firstName = DOMPurify.sanitize(user.firstName);
                        user.lastName = DOMPurify.sanitize(user.lastName);
                        user.email = DOMPurify.sanitize(user.email);
                        user.phoneNumber = DOMPurify.sanitize(user.phoneNumber);
                        user.dateCreated = DOMPurify.sanitize(user.dateCreated);
                        user.dateEdited = DOMPurify.sanitize(user.dateEdited);
                        user.dateArchived = DOMPurify.sanitize(user.dateArchived);
                        return user;
                    });    

                    res.render("admin", adminPageData);
                }
            });
        } catch (error) {
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }
    }
}

module.exports = home_controller;