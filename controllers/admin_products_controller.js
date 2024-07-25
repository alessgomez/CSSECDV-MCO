const { getConnectionFromPool, logPoolStats } = require('../db');
const fs = require('fs');
const multer = require('multer');
const storage = multer.memoryStorage();
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { isProductArchived } = require('./edit_product_controller');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;

const admin_products_controller = {
    getViewProducts: async (req, res) => {
        const data = {
            style: ["navbar", "index", "adminproducts"],
            script: ["adminproducts"],
            isAdmin: true,
        };
    
        let connection;
        
        try {
            connection = await getConnectionFromPool();
            
            const query = `SELECT * FROM products ORDER BY FIELD(category, 'main', 'snack', 'drink', 'dessert')`;
            
            const [results] = await connection.promise().query(query);
            
            data.products = results.map(product => ({
                productId: DOMPurify.sanitize(product.productId),
                name: DOMPurify.sanitize(product.name),
                category: DOMPurify.sanitize(product.category),
                price: parseFloat(product.price).toFixed(2),
                imageFilename: DOMPurify.sanitize(product.imageFilename),
                isBestSeller: parseInt(product.isBestSeller, 10),
                isArchived: parseInt(product.isArchived, 10)
            }));
            
            res.render('adminviewproducts', data);
        } catch (error) {
            if (debug)
                console.error('Error retrieving products:', error);
            else 
                console.error('An error occurred.');
            res.status(500).send('Internal Server Error');
        } finally {
            if (connection) {
                connection.release();
            }
        }
        
    },

    postArchiveProduct: async (req, res) => {
        const productId = req.body.productId;
        let connection;
        
        try {
            connection = await getConnectionFromPool();
            
            const query = 'UPDATE products SET isArchived = ?, isBestseller = ? WHERE productId = ?';
            const [results] = await connection.promise().query(query, [true, false, productId]);

            if (results.affectedRows === 0) 
                throw new Error('Failed to archive product or product not found');
            else 
                res.json({ success: true });
            
        } catch (error) {
            if (debug)
                console.error('Error archiving product:', error);
            else    
                console.error('An error occurred.');
            res.status(500).json({ success: false });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    postUnarchiveProduct: async (req, res) => {
        const productId = req.body.productId;
        let connection;
        
        try {
            connection = await getConnectionFromPool();
            
            const query = 'UPDATE products SET isArchived = ? WHERE productId = ?';
            const [results] = await connection.promise().query(query, [false, productId]);

            if (results.affectedRows === 0) 
                throw new Error('Failed to unarchive product not found');
            else 
                res.json({ success: true });
            
        } catch (error) {
            if (debug)
                console.error('Error unarchiving product:', error);
            else 
                console.error('An error occurred.')
            res.status(500).json({ success: false });
        } finally {
            if (connection) {
                connection.release();
            }
        }    
    },

    postAddBestseller: async (req, res) => {
        const productId = req.body.productId;
        let connection;

        try {
            connection = await getConnectionFromPool();

            const isProductArchived = await isProductArchived(connection, productId);

            if (isProductArchived) 
                throw new Error('Product is archived and cannot be set as bestseller');

            const updateQuery = 'UPDATE products SET isBestseller = ? WHERE productId = ?';
            const [updateResults] = await connection.promise().query(updateQuery, [true, productId]);

            if (updateResults.affectedRows === 0) 
                throw new Error('Failed to add product to bestsellers or product not found');
            else 
                res.json({ success: true });

        } catch (error) {
            if (debug)
                console.error('Error setting product as bestseller:', error);
            else 
                console.error('An error occurred')
            res.status(500).json({ success: false });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },
    

    postRemoveBestseller: async (req, res) => {
        const productId = req.body.productId;
        let connection;

        try {
            connection = await getConnectionFromPool();

            const query = 'UPDATE products SET isBestseller = ? WHERE productId = ?';
            const [updateResults] = await connection.promise().query(query, [false, productId]);

            if (updateResults.affectedRows === 0) 
                throw new Error('Failed to remove product from bestsellers or product not found');

            res.json({ success: true });
        } catch (error) {
            if (debug)
                console.error('Error removing product from bestsellers:', error);
            else 
                console.error('An error occurred.')
            res.status(500).json({ success: false });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
}


module.exports =  admin_products_controller;