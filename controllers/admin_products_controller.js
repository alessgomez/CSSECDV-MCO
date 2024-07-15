const { getConnectionFromPool, logPoolStats } = require('../db');

const admin_products_controller = {
    getViewProducts: async (req, res) => {
        const data = {
            style: ["navbar", "index", "adminproducts"],
            isAdmin: true,
        }

        let connection = await getConnectionFromPool();

        try {
            connection.query("SELECT * FROM products ORDER BY isArchived ASC, FIELD(category, 'main', 'snack', 'drink', 'dessert')", function(error, results) {
                if (error) {
                    throw error;
                } else {
                    data.products = results;
                    res.render('adminviewproducts', data);
                }
            });
        } catch (error) {
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }

        
    },

    getAddProduct: async (req, res) => {
        const data = {
            style: ["navbar", "index", "adminproducts", "addproduct"],
            isAdmin: true,
        }

        res.render('adminaddproduct', data);

    }
}


module.exports = admin_products_controller;