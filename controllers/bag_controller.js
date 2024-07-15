const { getConnectionFromPool, logPoolStats } = require('../db');
const { getSessionDataEntry } = require('./login_controller');

const bag_controller = {
    getAddToBag: async (req, res) => {
        const sessionData = await getSessionDataEntry(connection, req.session.id);
        if (sessionData) {
            const accountIdExists = await checkAccountIdExists(connection, sessionData.accountId);
            if (accountIdExists && sessionData.verified) {
                const role = await checkAccountRole(connection, sessionData.accountId);

                if (role === requiredRole) { // Allow access to the requested page
                    let connection = await getConnectionFromPool();
                    
                    try {
                        const sql = "SELECT * FROM products WHERE productId = ?";
                        values = [req.params.id]
                        connection.query(sql, '')
                    } catch(error) {
                        console.log(error);
                    } finally {
                        if (connection)
                            connection.release();
                    }
                } else {
                    res.redirect('/'); // Redirects back to their designated home page
                }
            }
            else {
                res.redirect('/login');
            }
        } else {
            res.redirect('/login');
        }
    }
}

module.exports = bag_controller;