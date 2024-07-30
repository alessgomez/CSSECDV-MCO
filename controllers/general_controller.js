const { getConnectionFromPool, logPoolStats } = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const home_controller = require('./home_controller');
const { bag_controller } = require('./bag_controller');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;
const logger = require('../logger');
const geoip = require('geoip-lite');

async function checkAccountIdExists(connection, accountId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM accounts WHERE accountId = ? AND isArchived = False';
        connection.query(sql, [accountId], (error, results) => {
            if (error) {
                reject(error);
            } 
            else {
                resolve(results.length > 0)
            }
        });
    });
}

async function checkAccountRole(connection, accountId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM accounts WHERE accountId = ?';
        connection.query(sql, [accountId], (error, results) => {
            if (error) {
                reject(error);
            } 
            else {
                if (results.length === 0) 
                    resolve(null)
                resolve(results[0].role);
            }
        });
    });
}

async function deleteSessionDataEntry(connection, sessionId) {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM sessionData WHERE sessionId = ?';
        connection.query(sql, [sessionId], (error, results) => {
            if (error) {
                reject(error);
            } 
            else {
                resolve( results.affectedRows > 0)
            }
        });
    });
}

const verifyRole = (requiredRole) => { return async function(req, res, next) {
        if (!req.session) {
            return res.redirect('/login');
        }

        let connection;
        try {
            connection = await getConnectionFromPool();

            const sessionData = await getSessionDataEntry(connection, req.session.id);

            if (!sessionData || !sessionData.verified) {
                return res.redirect('/login');
            }

            const accountIdExists = await checkAccountIdExists(connection, sessionData.accountId);

            if (!accountIdExists) {
                return res.redirect('/login');
            }

            const role = await checkAccountRole(connection, sessionData.accountId);

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

            logger.error('Error in verifyRole middleware', {
                meta: {
                    event: 'VERIFY_ROLE_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
            });

            return res.redirect('/login'); 
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
};

const general_controller = {

    isPrivate: async function(req, res, next) {
        if (!req.session) {
            return res.redirect('/login');
        }
    
        let connection;
        try {
            connection = await getConnectionFromPool();
            
            const sessionData = await getSessionDataEntry(connection, req.session.id);

            if (!sessionData || !sessionData.verified) {
                return res.redirect('/login');
            }

            const accountIdExists = await checkAccountIdExists(connection, sessionData.accountId);

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

            logger.error('Error in isPrivate middleware', {
                meta: {
                    event: 'IS_PRIVATE_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
            });

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
            
            const sessionData = await getSessionDataEntry(connection, req.session.id);
    
            if (!sessionData) {
                return res.redirect('/login'); 
            }
    
            const accountIdExists = await checkAccountIdExists(connection, sessionData.accountId);
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

            logger.error('Error in isPrivate2FA middleware', {
                meta: {
                    event: 'IS_PRIVATE_2FA_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
            });

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
    
            const sessionData = await getSessionDataEntry(connection, req.session.id);
    
            if (sessionData) {
                const accountIdExists = await checkAccountIdExists(connection, sessionData.accountId);
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

            logger.error('Error in isPublic middleware', {
                meta: {
                    event: 'IS_PUBLIC_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
            });

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
    
            const sessionData = await getSessionDataEntry(connection, req.session.id);
    
            if (sessionData) {
                const accountIdExists = await checkAccountIdExists(connection, sessionData.accountId);
                if (accountIdExists && sessionData.verified) {
                    const role = await checkAccountRole(connection, sessionData.accountId);
    
                    switch (role) {
                        case 'USER':
                            return bag_controller.getBag(req, res, function(){home_controller.getUserHome(req, res)});
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

            logger.error('Error in getHome middleware', {
                meta: {
                    event: 'GET_HOME_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
            });

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
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

             // Attempt to delete session data from the database
            await deleteSessionDataEntry(connection, req.session.id);

        } catch (error) {
            if (debug)
                console.error('Error deleting session data:', error);
            else
                console.error('An error occurred.')

            logger.error('Error deleting session data', {
                meta: {
                    event: 'DELETE_SESSION_DATA_ERROR',
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
            
            logger.info('User successfully logged out', {
                meta: {
                    event: 'USER_LOGOUT_SUCCESS',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId, 
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
              });

            res.redirect('/login');
        });
    }

}

module.exports = {general_controller, verifyRole, deleteSessionDataEntry};