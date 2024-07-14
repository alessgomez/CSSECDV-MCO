const {getConnectionFromPool} = require('../db');
const { getSessionDataEntry } = require('./login_controller');

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
            connection.query("SELECT * FROM accounts WHERE role = 'USER' ORDER BY dateCreated ASC", function(error, results) {
                if (error) {
                    throw error;
                } else {
                    adminPageData.users = results;
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