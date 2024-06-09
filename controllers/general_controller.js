const { getConnectionFromPool, logPoolStats } = require('../db');

function checkAccountIdExists(connection, accountId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM accounts WHERE accountId = ?';
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

const general_controller = {

    isPrivate: async function(req, res, next) {
        if (!req.session || !req.session.accountId) {
            return res.redirect('/login');
        }

        const connection = await getConnectionFromPool();

        try {
            const accountIdExists = await checkAccountIdExists(connection, req.session.accountId);
            if (accountIdExists)
                return next();
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
        if (req.session && req.session.accountId) {
            const connection = await getConnectionFromPool();

            try {
                const accountIdExists = await checkAccountIdExists(connection, req.session.accountId);
                if (accountIdExists){
                    res.redirect('/');
                }
                else    {
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
        }
        else {
            return next();
        }
        
    },

    getLogout: function(req, res) {
        if (req.session)
        {
            req.session.destroy(() => {
                res.clearCookie('thehungrycookie'); 
                console.log("Session successfully destroyed.");
                res.redirect('/login');
            });
        }
    }

}

module.exports = general_controller;