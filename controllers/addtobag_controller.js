const { getConnectionFromPool, logPoolStats } = require('../db');

const addtobag_controller = {
    getAddToBag: async (req, res) => {
        let connection = await getConnectionFromPool();

        try {
            const sql = "SELECT * FROM products WHERE productId = ?";
            values = [req.params.id]
            connection.query(sql, values, async (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    if (results.length > 0) {
                        productdetails = results[0];
                        const data = {
                            style: ["bootstrap", "navbar", "addtobag"],
                            script: ["bootstrap", "addtobag"],
                            productdetails: productdetails,
                            bCustomizable: false
                        }
    
                        res.render('addtobag', data);
                    } else {
                        return res.redirect('/menu')
                    }
                }
            })
        }catch(error) {
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }
    }
}

module.exports = addtobag_controller;