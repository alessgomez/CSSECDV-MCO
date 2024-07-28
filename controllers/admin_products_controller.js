const { getConnectionFromPool, logPoolStats } = require('../db');
const fs = require('fs');
const multer = require('multer');
const storage = multer.memoryStorage();
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { isProductArchived } = require('./edit_product_controller');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const debug = process.env.DEBUG === 'true';
const logger = require('../logger');
const { getSessionDataEntry } = require('./login_controller');

const admin_products_controller = {
    getViewProducts: async (req, res) => {
        const data = {
            style: ["navbar", "index", "adminproducts"],
            script: ["adminproducts"],
            isAdmin: true,
        };
    
        let connection;
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);
            
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

            logger.error('Error when admin attempted to view products', {
                meta: {
                    event: 'VIEW_PRODUCTS_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    sessionId: req.session.id 
                }
            });

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
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = getSessionDataEntry(connection, req.session.id);

            const query = 'UPDATE products SET isArchived = ?, isBestseller = ? WHERE productId = ?';
            const [results] = await connection.promise().query(query, [true, false, productId]);

            if (results.affectedRows === 0) 
                throw new Error('Failed to archive product or product not found');
            else {
                logger.info('Admin successfully archived product', {
                    meta: {
                      event: 'ARCHIVE_PRODUCT_SUCCESS',
                      method: req.method,
                      url: req.originalUrl,
                      accountId: sessionData.accountId,
                      productId: productId, 
                      sourceIp: req.ip,
                      userAgent: req.headers['user-agent'],
                      sessionId: req.session.id 
                    }
                  });

                  res.json({ success: true });
            }
            
        } catch (error) {
            if (debug)
                console.error('Error archiving product:', error);
            else    
                console.error('An error occurred.');

            logger.error('Error when admin attempted to archive product', {
                meta: {
                    event: 'ARCHIVE_PRODUCT_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    productId: productId, 
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    sessionId: req.session.id 
                }
            });

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
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);
            
            const query = 'UPDATE products SET isArchived = ? WHERE productId = ?';
            const [results] = await connection.promise().query(query, [false, productId]);

            if (results.affectedRows === 0) 
                throw new Error('Failed to unarchive product or product not found');
            else {
                logger.info('Admin successfully unarchived product', {
                    meta: {
                      event: 'UNARCHIVE_PRODUCT_SUCCESS',
                      method: req.method,
                      url: req.originalUrl,
                      accountId: sessionData.accountId, 
                      productId: productId,
                      sourceIp: req.ip,
                      userAgent: req.headers['user-agent'],
                      sessionId: req.session.id 
                    }
                  });

                  res.json({ success: true });
            }
            
        } catch (error) {
            if (debug)
                console.error('Error unarchiving product:', error);
            else 
                console.error('An error occurred.')

            logger.error('Error when admin attempted to unarchive product', {
                meta: {
                    event: 'UNARCHIVE_PRODUCT_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    productId: productId, 
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    sessionId: req.session.id 
                }
            });

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
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id)

            const isArchived = await isProductArchived(connection, productId);

            if (isArchived) 
                throw new Error('Product is archived and cannot be set as bestseller');

            const updateQuery = 'UPDATE products SET isBestseller = ? WHERE productId = ?';
            const [updateResults] = await connection.promise().query(updateQuery, [true, productId]);

            if (updateResults.affectedRows === 0) 
                throw new Error('Failed to add product to bestsellers or product not found');
            else {
                logger.info('Admin successfully added product to bestsellers', {
                    meta: {
                      event: 'ADD_BESTSELLER_SUCCESS',
                      method: req.method,
                      url: req.originalUrl,
                      accountId: sessionData.accountId,
                      productId: productId, 
                      sourceIp: req.ip,
                      userAgent: req.headers['user-agent'],
                      sessionId: req.session.id 
                    }
                  });

                  res.json({ success: true });
            }
                

        } catch (error) {
            if (debug)
                console.error('Error setting product as bestseller:', error);
            else 
                console.error('An error occurred')

            logger.error('Error when admin attempted to add product to bestsellers', {
                meta: {
                    event: 'ADD_BESTSELELR_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    productId: productId, 
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    sessionId: req.session.id 
                }
            });

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
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id)

            const query = 'UPDATE products SET isBestseller = ? WHERE productId = ?';
            const [updateResults] = await connection.promise().query(query, [false, productId]);

            if (updateResults.affectedRows === 0) 
                throw new Error('Failed to remove product from bestsellers or product not found');
            else {
                logger.info('Admin successfully removed product from bestsellers', {
                    meta: {
                      event: 'REMOVE_BESTESELLER_SUCCESS',
                      method: req.method,
                      url: req.originalUrl,
                      accountId: sessionData.accountId,
                      productId: productId, 
                      sourceIp: req.ip,
                      userAgent: req.headers['user-agent'],
                      sessionId: req.session.id 
                    }
                  });

                  res.json({ success: true })
            }


        } catch (error) {
            if (debug)
                console.error('Error removing product from bestsellers:', error);
            else 
                console.error('An error occurred.')

            logger.error('Error when admin attempted to remove product from bestsellers', {
                meta: {
                    event: 'REMOVE_BESTSELLER_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    productId: productId, 
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    sessionId: req.session.id 
                }
            });

            res.status(500).json({ success: false });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
}


module.exports =  admin_products_controller;