const {getConnectionFromPool} = require('../db');
const { getSessionDataEntry } = require('./login_controller');

const home_controller = {

    getHome: async (req, res) => {
        const userPageData = {
            style: ["navbar", "index"],
            script: ["index"], 
            bestSellers: [],
            bag: {}
        }

        const adminPageData = {
            style: ["navbar", "index"],
            isAdmin: true,
        }

        let connection = await getConnectionFromPool();

        try {
            sessionData = await getSessionDataEntry(connection, req.session.id)
            if (sessionData.accountId) {
                connection.query("SELECT * FROM accounts WHERE accountId = ?", [sessionData.accountId], function(err, results) {
                    if (err) throw err;
        
                    if (results[0].role === "ADMIN") {
                        connection.query("SELECT * FROM accounts WHERE role = 'USER' ORDER BY dateCreated ASC", function(error, results) {
                            if (error) {
                                throw error;
                            } else {
                                adminPageData.users = results;
                                res.render("admin", adminPageData);
                            }
                        });
                    }
                    else
                        res.render("index", userPageData);
                });
            }
        } catch (error) {
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }
    }
}

module.exports = home_controller;