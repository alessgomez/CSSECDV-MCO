const { getConnectionFromPool, logPoolStats } = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const home_controller = require('./home_controller');

async function checkAccountIdExists(connection, accountId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM accounts WHERE accountId = ? AND isArchived = False';
      connection.query(sql, [accountId], (error, results) => {
        if (error) {
          reject(error);
        } 
        else {
            if (results.length === 0) {
                resolve(false); // account not found
              } 
              else {
                const account = results[0]
                resolve(true);
            }
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
            resolve(results[0].role);
        }
      });
    });
}

async function deleteSessionDataEntry(connection, sessionId) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM sessiondata WHERE sessionId = ?';
      connection.query(sql, [sessionId], (error, results) => {
        if (error) {
          reject(error);
        } 
        else {
            if (results.affectedRows === 0) {
                resolve(false); // No rows were deleted, sessionId not found
              } else {
                resolve(true); // Deletion was successful
              }
        }
      });
    });
}

const verifyRole = (requiredRole) => {return async function(req, res, next) {
    if (!req.session) {
        return res.redirect('/login');
    }

    const connection = await getConnectionFromPool();

    try {
        const sessionData = await getSessionDataEntry(connection, req.session.id)

        if (sessionData) {
            const accountIdExists = await checkAccountIdExists(connection, sessionData.accountId);
            if (accountIdExists && sessionData.verified) {
                const role = await checkAccountRole(connection, sessionData.accountId);

                if (role === requiredRole) {
                    return next(); // Allow access to the requested page
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
    } catch (error) {
        console.error(error);
    }
    finally {
        if (connection) {
            connection.release();
        }
    }
}}

const general_controller = {

    isPrivate: async function(req, res, next) {

        if (!req.session) {
            return res.redirect('/login');
        }

        const connection = await getConnectionFromPool();

        try {
            
            const sessionData = await getSessionDataEntry(connection, req.session.id)

            if (sessionData) {
                const accountIdExists = await checkAccountIdExists(connection, sessionData.accountId);

                if (accountIdExists && sessionData.verified)    
                    return next();
                else    
                    res.redirect('/login');
            }
            else    
                res.redirect('/login');
           
        } catch (error) {
            console.error(error);
        }
        finally {
            if (connection) {
              connection.release();
            }
        }
    },

    isPrivate2FA: async function(req, res, next) {
        if (!req.session) {
            return res.redirect('/login');
        }

        const connection = await getConnectionFromPool();

        try {
            const sessionData = await getSessionDataEntry(connection, req.session.id)

            if (sessionData) {
                const accountIdExists = await checkAccountIdExists(connection, sessionData.accountId);
                if (accountIdExists) {
                    if (sessionData.verified)
                        res.redirect('/');
                    else
                        return next();
                }
                else
                    res.redirect('/login');
            }
            else
                res.redirect('/login');
            
        } catch (error) {
            console.error(error);
        }
        finally {
            if (connection) {
              connection.release();
            }
        }
    },

    isPublic: async function(req, res, next) {
        if (!req.session) {
            return next();
        }

        const connection = await getConnectionFromPool();

        try {
            const sessionData = await getSessionDataEntry(connection, req.session.id)

            if (sessionData) {
                const accountIdExists = await checkAccountIdExists(connection, sessionData.accountId);
                if (accountIdExists && sessionData.verified){
                    res.redirect('/');
                } else {
                    return next();
                }
            }
            else {
                return next();
            }
           
        } catch (error) {
            console.error(error);
        }
        finally {
            if (connection) {
                connection.release();
            }
        }
    },

    getHome: async function(req, res, next) {
            if (!req.session) {
                return res.redirect('/login');
            }
    
            const connection = await getConnectionFromPool();
    
            try {
                const sessionData = await getSessionDataEntry(connection, req.session.id)
    
                if (sessionData) {
                    const accountIdExists = await checkAccountIdExists(connection, sessionData.accountId);
                    if (accountIdExists && sessionData.verified) {
                        const role = await checkAccountRole(connection, sessionData.accountId);

                        if (role === "USER") {
                            home_controller.getUserHome(req, res);
                        } else if (role === "ADMIN") {
                            home_controller.getAdminHome(req, res);
                        } else {
                            res.redirect('/login');
                        }
                    } else {
                        res.redirect('/login');
                    }
                } else {
                    res.redirect('/login');
                }
            } catch (error) {
                console.error(error);
            }
            finally {
                if (connection) {
                    connection.release();
                }
            }
    },

    getLogout: async function(req, res) {

        if (req.session)
        {
            const connection = await getConnectionFromPool();
            try {
                await deleteSessionDataEntry(connection, req.session.id)
            } catch (error) {
                console.error(error);
            }
            finally {
                if (connection) {
                connection.release();
                }
            }
            
            req.session.destroy(() => {
                res.clearCookie('thehungrycookie'); 
                console.log("Session successfully destroyed.");
                res.redirect('/login');
            });
        }
    }

}

module.exports = {general_controller, verifyRole, deleteSessionDataEntry};