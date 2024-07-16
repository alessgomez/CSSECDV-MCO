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

    postAddBestseller: async (req, res) => {
        const productId = req.body.productId;
        let connection = await getConnectionFromPool();
        try {
            // Check if the product is not archived before updating as bestseller
            const checkQuery = 'SELECT isArchived FROM products WHERE productId = ?';
            connection.query(checkQuery, [productId], (checkError, checkResults) => {
                if (checkError) {
                    console.error('Error checking product archive status:', checkError);
                    res.json({ success: false, error: 'Error checking product archive status' });
                    return;
                }
    
                if (checkResults.length === 0) {
                    console.error('Product not found:', productId);
                    res.json({ success: false, error: 'Product not found' });
                    return;
                }
    
                const isArchived = checkResults[0].isArchived;
    
                // Only update as bestseller if the product is not archived
                if (!isArchived) {
                    const updateQuery = 'UPDATE products SET isBestseller = ? WHERE productId = ?';
                    connection.query(updateQuery, [true, productId], (updateError, updateResults) => {
                        if (updateError) {
                            console.error('Error adding product to bestsellers:', updateError);
                            res.json({ success: false, error: 'Error adding product to bestsellers' });
                        } else {
                            res.json({ success: true });
                        }
                    });
                } else {
                    // Product is archived, cannot be set as bestseller
                    res.json({ success: false, error: 'Product is archived, cannot be set as bestseller' });
                }
            });
        } catch (error) {
            console.log(error);
            res.json({ success: false, error: 'Server error' });
        } finally {
            if (connection)
                connection.release();
        }
    },
    

    postRemoveBestseller: async (req, res) => {
        const productId = req.body.productId;
        let connection = await getConnectionFromPool();
        try {
            const query = 'UPDATE products SET isBestseller = ? WHERE productId = ?';
            connection.query(query, [false, productId], (error, results) => {
                if (error) {
                    console.error('Error removing product from bestsellers:', error);
                    res.json({ success: false, error: 'Error removing product from bestsellers' });
                  } else {
                    res.json({ success: true });
                  }
            });
        } catch (error) {
            console.log(error);
            res.json({ success: false, error: 'Server error' });
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