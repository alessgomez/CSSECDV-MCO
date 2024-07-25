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

// Initialize upload middleware and add file size limit
const upload = multer({
    storage: storage,
    limits: { fileSize: 3 * 1024 * 1024}, // 3 MB file size limit
    fileFilter: fileFilter
}).single('inputFile');

async function editProduct(connection, updatedProduct, hasNewImage) {
    try {
        let query = '';
        let values = [];

        if (hasNewImage) {
            query = 'UPDATE products SET name = ?, category = ?, price= ?, imageFilename = ? WHERE productId = ?';
            values = [updatedProduct.name, updatedProduct.category, updatedProduct.price, updatedProduct.imageFilename, updatedProduct.productId];
        } else {
            query = 'UPDATE products SET name = ?, category = ?, price= ? WHERE productId = ?';
            values = [updatedProduct.name, updatedProduct.category, updatedProduct.price, updatedProduct.productId];
        }

        const [results] = await connection.promise().query(query, values);

        // Check if the update was successful
        if (results.affectedRows === 0) {
            throw new Error('Failed to update product or product not found');
        }

        return updatedProduct.productId;
    } catch (error) {
        throw error;
    }  
}

const isProductArchived = async (connection, productId) => {
    try {
        const query = 'SELECT isArchived FROM products WHERE productId = ?';
        const values = [productId];
        const [results] = await connection.promise().query(query, values);

        if (results.length === 0) {
            throw new Error('Product not found');
        }

        return results[0].isArchived;
    } catch (error) {
        throw error;
    }
};


const edit_product_controller = {
    getEditProduct: async (req, res) => {
        const productId = req.params.id;
        let connection;

        try {
            connection = await getConnectionFromPool();
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
    
            try {
                connection = await getConnectionFromPool();
    
                if (err) {
                    req.flash('error_msg', 'Invalid file name. File name can only contain alphanumeric characters, hyphen, underscore, or period.');
                    return res.redirect('/editProductPage/' + productId);
                }
    
                const isProductArchived = await isProductArchived(connection, productId);
    
                if (isProductArchived) {
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
                        req.flash('error_msg', 'Invalid details.');
                    } else {
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
                        req.flash('error_msg', 'Invalid details.');
                    } else {
                        req.flash('success_msg', 'Product successfully updated.');
                    }
                    return res.redirect('/editProductPage/' + productId);
                }
            } catch (error) {
                if (debug)
                    console.error('Error updating product:', error);
                else    
                    console.error('An error occurred.')
                req.flash('error_msg','There was an error with updating product. Please try again.');
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
            const [results] = await connection.query(query, [productId]);

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
            res.status(500).json({ success: false});
        } finally {
            if (connection) 
                connection.release();
        }
    }
}

module.exports = {edit_product_controller, isProductArchived};