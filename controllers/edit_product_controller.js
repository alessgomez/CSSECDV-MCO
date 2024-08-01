const { getConnectionFromPool, logPoolStats } = require('../db.js');
const { fileFilter, getMimeType, sanitizeImage } = require('./registration_controller.js')
const { checkImageUuidExists, validateSelectedCategory, validateDetails } = require('./add_product_controller.js')
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const storage = multer.memoryStorage();
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;
const logger = require('../logger');
const { getSessionDataEntry } = require('./login_controller');
const geoip = require('geoip-lite');

// Initialize upload middleware and add file size limit
const upload = multer({
    storage: storage,
    limits: { fileSize: 3 * 1024 * 1024}, // 3 MB file size limit
    fileFilter: fileFilter
}).single('inputFile');

async function editProduct(connection, updatedProduct, hasNewImage) {
    return new Promise((resolve, reject) => {
        let query = ''
        let values = [];

        if (hasNewImage) {
            query = 'UPDATE products SET name = ?, category = ?, price= ?, imageFilename = ?  WHERE productId = ?';
            values = [updatedProduct.name, updatedProduct.category, updatedProduct.price, updatedProduct.imageFilename, updatedProduct.productId];
        }
        else {
            query = 'UPDATE products SET name = ?, category = ?, price= ?  WHERE productId = ?';
            values = [updatedProduct.name, updatedProduct.category, updatedProduct.price, updatedProduct.productId];
        }
        connection.query(query, values, async (error, results) => {
            if (error) {
                reject(error);
            } else {
                if (results.affectedRows > 0)
                    resolve(results)     // product was successfully updated
                else
                    resolve(null)  
            }
        });
    });
}

const isProductArchived = async (connection, productId) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT isArchived FROM products WHERE productId = ?';
        const values = [productId];
        connection.query(query, values, async (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results[0].isArchived); 
            }
        });
    });
};


const edit_product_controller = {
    getEditProduct: async (req, res) => {
        const productId = req.params.id;
        let connection;
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            const isArchived = await isProductArchived(connection, productId);

            if (isArchived) {
                return res.redirect('/viewProductsPage');
            }

            const data = {
                style: ["navbar", "index", "adminproducts", "editproduct"],
                script: ["editproduct"],
                isAdmin: true,
                isMain: false,
                isSnack: false,
                isDrink: false,
                isDessert: false,
            };

            const query = 'SELECT productId, name, category, price FROM products WHERE productId = ?';
            const [results] = await connection.promise().query(query, [productId]);

            if (results.length === 0) {
                return res.redirect('/viewProductsPage');
            }

            const product = results[0];
            product.productId = DOMPurify.sanitize(product.productId);
            product.name = DOMPurify.sanitize(product.name);
            product.category = DOMPurify.sanitize(product.category);
            product.price = parseFloat(product.price).toFixed(2);
            data.product = product;

            switch (product.category) {
                case 'main':
                    data.isMain = true;
                    break;
                case 'snack':
                    data.isSnack = true;
                    break;
                case 'drink':
                    data.isDrink = true;
                    break;
                case 'dessert':
                    data.isDessert = true;
                    break;
            }

            res.render('admineditproduct', data);
        } catch (error) {
            if (debug)
                console.error('Error editing product:', error);
            else    
                console.error('An error occurred');

            logger.error('Error when admin attempted to view edit product page', {
                meta: {
                    event: 'VIEW_EDIT_PRODUCT_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    productId: productId,
                    errorMessage: error.message, 
                    errorStack: error.stack, 
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'], 
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
            });

            res.status(500).send('Internal Server error');
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    postEditProduct:  function (req, res) {
        upload(req, res, async (err) => {
            const productId = req.body.productId;
            let connection;
            let sessionData;
            try {
                connection = await getConnectionFromPool();
                sessionData = await getSessionDataEntry(connection, req.session.id)
    
                if (err) {
                    throw new Error("Error uploading the file. ", err);
                }
    
                const isArchived = await isProductArchived(connection, productId);
    
                if (isArchived) {
                    throw new Error("Cannot edit archived product.");
                }
    
                const updatedProduct = {
                    productId: DOMPurify.sanitize(productId),
                    name: DOMPurify.sanitize(req.body.name),
                    category: DOMPurify.sanitize(req.body.category),
                    price: parseFloat(req.body.price).toFixed(2),
                };
    
                if (!validateDetails(updatedProduct)) {
                    throw new Error("Invalid product details.");
                }
    
                if (!req.file) {
                    const result = await editProduct(connection, updatedProduct, false);
                    if (result === null) {
                        throw new Error('Product not found');
                    } else {
                        logger.info('Admin successfully updated product', {
                            meta: {
                                event: 'EDIT_PRODUCT_SUCCESS',
                                method: req.method,
                                url: req.originalUrl,
                                accountId: sessionData.accountId, 
                                productId: productId,
                                productName: updatedProduct.name,
                                productCategory: updatedProduct.category,
                                productPrice: updatedProduct.price,
                                productImage: updatedProduct.imageFilename,
                                sourceIp: req.ip,
                                userAgent: req.headers['user-agent'],
                                hostname: req.hostname,
                                protocol: req.protocol,
                                port: req.socket.localPort,
                                geo:geoip.lookup(req.ip)
                                }
                          });

                        req.flash('success_msg', 'Product successfully updated.');
                    }
                    return res.redirect('/editProductPage/' + productId);
                } else {
                    const signature = req.file.buffer.toString('hex').toUpperCase();
                    const fileMimeType = getMimeType(signature);
    
                    if (fileMimeType !== 'image/jpeg' && fileMimeType !== 'image/png') {
                        throw new Error("Invalid file type.");
                    }
    
                    const sanitizedBuffer = await sanitizeImage(req.file.buffer);
                    let newFileName;
                    const filePath = './public/images/products/';
                    const fileExtension = fileMimeType.split("/")[1];
                    let uuidExists = true;
    
                    while (uuidExists) {
                        newFileName = uuidv4() + "." + fileExtension;
                        uuidExists = await checkImageUuidExists(connection, newFileName);
                    }
    
                    fs.writeFileSync(filePath + newFileName, sanitizedBuffer);
                    updatedProduct.imageFilename = newFileName;
    
                    const result = await editProduct(connection, updatedProduct, true);
                    
                    if (result === null) {
                        throw new Error('Product not found');
                    } else {
                        logger.info('Admin successfully edited a product', {
                            meta: {
                                event: 'EDIT_PRODUCT_SUCCESS',
                                method: req.method,
                                url: req.originalUrl,
                                accountId: sessionData.accountId, 
                                productId: productId,
                                sourceIp: req.ip,
                                userAgent: req.headers['user-agent'],
                                hostname: req.hostname,
                                protocol: req.protocol,
                                port: req.socket.localPort,
                                geo:geoip.lookup(req.ip)
                            }
                          });

                        req.flash('success_msg', 'Product successfully updated.');
                    }
                    return res.redirect('/editProductPage/' + productId);
                }
            } catch (error) {
                if (debug)
                    console.error('Error updating product:', error);
                else    
                    console.error('An error occurred.')

                logger.error('Error when admin attempted to edit a product', {
                    meta: {
                        event: 'EDIT_PRODUCT_ERROR',
                        method: req.method,
                        url: req.originalUrl,
                        accountId: sessionData.accountId,
                        productId: productId,
                        errorMessage: error.message, 
                        errorStack: error.stack, 
                        sourceIp: req.ip,
                        userAgent: req.headers['user-agent'],
                        hostname: req.hostname,
                        protocol: req.protocol,
                        port: req.socket.localPort,
                        geo:geoip.lookup(req.ip)
                    }
                });

                if (err) {
                    req.flash('error_msg', 'Invalid file name. File name can only contain alphanumeric characters, hyphen, underscore, or period.');
                } else {
                    req.flash('error_msg', 'An error occurred when adding the product. Please try again.');
                }

                res.redirect('/editProductPage/' + productId);
            } finally {
                if (connection) 
                    connection.release();
            }
        });
    
    },

    getProduct: async (req, res) => {
        const productId = req.query.productId;
        let connection;

        try {
            connection = await getConnectionFromPool();

            const query = 'SELECT name, category, price FROM products WHERE productId = ?';
            const [results] = await connection.promise().query(query, [productId]);

            if (results.length === 0) 
                throw new Error('Product not found');

            const product = results[0];
            product.name = DOMPurify.sanitize(product.name);
            product.category = DOMPurify.sanitize(product.category);
            product.price = parseFloat(product.price).toFixed(2);

            res.json({ success: true, product: product });
        } catch (error) {
            if (debug)
                console.error('Error retrieving product:', error);
            else        
                console.error('An error occurred.')

            logger.error('Error when attempting to retrieve product info for admin edit product page', {
                meta: {
                    event: 'GET_PRODUCT_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    productId: productId,
                    errorMessage: error.message, 
                    errorStack: error.stack, 
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
            });

            res.status(500).json({ success: false});
        } finally {
            if (connection) 
                connection.release();
        }
    }
}

module.exports = {edit_product_controller, isProductArchived};