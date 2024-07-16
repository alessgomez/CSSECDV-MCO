const { getConnectionFromPool, logPoolStats } = require('../db');

const admin_products_controller = {
    getViewProducts: async (req, res) => {
        const data = {
            style: ["navbar", "index", "adminproducts"],
            script: ["adminproducts"],
            isAdmin: true,
        }

        let connection = await getConnectionFromPool();

        try {
            connection.query("SELECT * FROM products ORDER BY FIELD(category, 'main', 'snack', 'drink', 'dessert')", function(error, results) {
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

    postArchiveProduct: async (req, res) => {
        const productId = req.body.productId;
        let connection = await getConnectionFromPool();
        try {
            const query = 'UPDATE products SET isArchived = ?, isBestseller = ? WHERE productId = ?';
            connection.query(query, [true, false, productId], (error, results) => {
                if (error) {
                    console.error('Error archiving product:', error);
                    res.json({ success: false, error: 'Error archiving product' });
                  } else {
                    res.json({ success: true });
                  }
            });
        } catch (error) {
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }    
    },

    postUnarchiveProduct: async (req, res) => {
        const productId = req.body.productId;
        let connection = await getConnectionFromPool();
        try {
            const query = 'UPDATE products SET isArchived = ? WHERE productId = ?';
            connection.query(query, [false, productId], (error, results) => {
                if (error) {
                    console.error('Error unarchiving product:', error);
                    res.json({ success: false, error: 'Error unarchiving product' });
                  } else {
                    res.json({ success: true });
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