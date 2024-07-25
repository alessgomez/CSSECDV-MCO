const { getConnectionFromPool, logPoolStats } = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const home_controller = require('./home_controller');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;

async function checkAccountIdExists(connection, accountId) {
    try {
        const [rows] = await connection.query('SELECT 1 FROM accounts WHERE accountId = ? AND isArchived = FALSE', [accountId]);
        return rows.length > 0;
    } catch (error) {
        throw error;
    }
}

async function checkAccountRole(connection, accountId) {
    try {
        const [rows] = await connection.query('SELECT role FROM accounts WHERE accountId = ?', [accountId]);
        if (rows.length === 0) {
            return null;
        }
        return rows[0].role;
    } catch (error) {
        throw error; 
    }
}

async function deleteSessionDataEntry(connection, sessionId) {
    try {
        const [results] = await connection.query('DELETE FROM sessiondata WHERE sessionId = ?', [sessionId]);
        return results.affectedRows > 0;
    } catch (error) {
        throw error;
    }
}

const verifyRole = (requiredRole) => {
    return async (req, res, next) => {
        if (!req.session) {
            return res.redirect('/login');
        }

        let connection;
        try {
            connection = await getConnectionFromPool();

            const sessionData = getSessionDataEntry(connection, req.session.id);

            if (!sessionData || !sessionData.verified) {
                return res.redirect('/login');
            }

            const accountIdExists = checkAccountIdExists(connection, sessionData.accountId);

            if (!accountIdExists) {
                return res.redirect('/login');
            }

            const role = checkAccountRole(connection, sessionData.accountId);

            if (role === requiredRole) {
                return next();
            } else {
                return res.redirect('/'); // Redirects back to the user's designated home page
            }

        } catch (error) {
            if (debug)
                console.error('Error in verifyRole middleware:', error);
            else
                console.error('An error occurred')
            return res.redirect('/login'); 
        } finally {
            if (connection) {
                connection.release();
            }
        }
    };
};

const general_controller = {

    isPrivate: async function(req, res, next) {
        if (!req.session) {
            return res.redirect('/login');
        }
    
        let connection;
        try {
            connection = await getConnectionFromPool();
            
            const sessionData = getSessionDataEntry(connection, req.session.id);

            if (!sessionData || !sessionData.verified) {
                return res.redirect('/login');
            }

            const accountIdExists = checkAccountIdExists(connection, sessionData.accountId);

            if (accountIdExists) {
                return next(); 
            } else {
                return res.redirect('/login'); 
            }
            
        } catch (error) {
            if (debug)
                console.error('Error in isPrivate middleware:', error);
            else
                console.error('An error occurred.')
            return res.redirect('/login'); 
        } finally {
            if (connection) {
                connection.release(); 
            }
        }
    },

    isPrivate2FA: async function(req, res, next) {
        if (!req.session) {
            return res.redirect('/login');
        }
    
        let connection;
        try {
            connection = await getConnectionFromPool();
            
            const sessionData = getSessionDataEntry(connection, req.session.id);
    
            if (!sessionData) {
                return res.redirect('/login'); 
            }
    
            const accountIdExists = checkAccountIdExists(connection, sessionData.accountId);
            if (!accountIdExists) {
                return res.redirect('/login'); 
            }
    
            if (sessionData.verified) {
                return res.redirect('/'); // Redirect to home if already verified
            } else {
                return next(); // Proceed to 2FA verification if not verified
            }
    
        } catch (error) {
            if (debug)
                console.error('Error in isPrivate2FA middleware:', error);
            else    
                console.error('An error occurred.')
            return res.redirect('/login'); 
        } finally {
            if (connection) {
                connection.release(); 
            }
        }
    },

    isPublic: async function(req, res, next) {
        if (!req.session) {
            return next();
        }
    
        let connection;
        try {
            connection = await getConnectionFromPool();
    
            const sessionData = getSessionDataEntry(connection, req.session.id);
    
            if (sessionData) {
                const accountIdExists = checkAccountIdExists(connection, sessionData.accountId);
                if (accountIdExists && sessionData.verified) {
                    // Redirect authenticated and verified users away from public routes
                    return res.redirect('/');
                }
            }
            
            return next();
    
        } catch (error) {
            if (debug)
                console.error('Error in isPublic middleware:', error);
            else
                console.error('An error occurred.')
            return next();
        } finally {
            if (connection) {
                connection.release(); 
            }
        }
    },

    getHome: async function(req, res, next) {
        if (!req.session) {
            return res.redirect('/login');
        }
    
        let connection;
        try {
            connection = await getConnectionFromPool();
    
            const sessionData = getSessionDataEntry(connection, req.session.id);
    
            if (sessionData) {
                const accountIdExists = checkAccountIdExists(connection, sessionData.accountId);
                if (accountIdExists && sessionData.verified) {
                    const role = checkAccountRole(connection, sessionData.accountId);
    
                    switch (role) {
                        case 'USER':
                            return home_controller.getUserHome(req, res);
                        case 'ADMIN':
                            return home_controller.getAdminHome(req, res);
                        default:
                            return res.redirect('/login');
                    }
                }
            }
            return res.redirect('/login');
    
        } catch (error) {
            if (debug)
                console.error('Error in getHome middleware:', error);
            else
                console.error('An error occurred.')
            return res.redirect('/login'); 
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    getLogout: async function(req, res) {
        if (!req.session) {
            return res.redirect('/login'); 
        }

        let connection;
        try {
            connection = await getConnectionFromPool();

            // Attempt to delete session data from the database
            deleteSessionDataEntry(connection, req.session.id);

        } catch (error) {
            if (debug)
                console.error('Error deleting session data:', error);
            else
                console.error('An error occurred.')
        } finally {
            if (connection) {
                connection.release();
            }
        }

        // Destroy the session and clear the cookie
        req.session.destroy(err => {
            if (err) {
                if (debug)
                    console.error('Error destroying session:', err);
                else 
                    console.error('An error occurred.')
                return res.redirect('/login'); 
            }
            res.clearCookie('thehungrycookie'); 
            res.redirect('/login');
        });
    }

}

module.exports = {general_controller, verifyRole, deleteSessionDataEntry};