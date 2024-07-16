const { getConnectionFromPool, logPoolStats } = require('../db');
const { fileFilter, getMimeType, sanitizeImage } = require('./registration_controller.js')
const fs = require('fs');
const sharp = require('sharp');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const storage = multer.memoryStorage();

// Initialize upload middleware and add file size limit
const upload = multer({
    storage: storage,
    limits: { fileSize: 3 * 1024 * 1024}, // 3 MB file size limit
    fileFilter: fileFilter
}).single('inputFile');

const checkUuidExists = (connection, newId, field) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM products WHERE ? = ?';
        connection.query(sql, [field, newId], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.length > 0);
            }
        });
    });
};

async function addProduct(connection, newProduct) {
    try {
        let newId;
        let uuidExists = true;

        while (uuidExists) {
            newId = uuidv4();
            uuidExists = await checkUuidExists(connection, newId, 'productId');
        }

        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO products (productId, name, category, price, imageFilename, isBestseller, isArchived) VALUES (?, ?, ?, ?, ?, ?, ?)';
            const values = [newId, newProduct.name, newProduct.category, newProduct.price, newProduct.imageFilename, false, false];
    
            connection.query(sql, values, async (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve([results, newId]); // product successfully added
                }
            });
        });
    } catch (error) {
        console.error(error);
    }
    
}

function validateSelectedCategory(selectedCategory) {
    validOptions = ['main', 'snack', 'drink', 'dessert']
    if (validOptions.includes(selectedCategory)) {
        return true
    } else {
        return false
    }
}

function validateDetails(newProduct) {
    const nameRegex = /^(?!.*[,'-]{2})(?!.* [,'-])(?![,'-])(?=.{1,45}$)[A-Za-z0-9()]+(?:[ ,'-][A-Za-z0-9()]+)*(?:, [A-Za-z()]+)*\.?$/;
    const nameValid = newProduct.name != null && nameRegex.test(newProduct.name);

    const categoryValid = validateSelectedCategory(newProduct.category);

    const price = parseFloat(newProduct.price)
    const priceValid = !isNaN(price) && price > 0;

    return nameValid && categoryValid && priceValid;
}


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
            script: ["addproduct"],
            isAdmin: true,
        }

        res.render('adminaddproduct', data);
    },

    postAddProduct:  function (req, res) {
        upload(req, res, async (err) => {
            if (err) {
                console.error(err);
                req.flash('error_msg', 'Invalid file name. File name can only contain alphanumeric characters, hypen, underscore, or period.');
                return res.redirect('/addproductpage');
            }
            if (!req.file) {
                req.flash('error_msg', 'Please upload a file.');
                return res.redirect('/addproductpage');
            }
     
            var newProduct = {
                name: req.body.name,
                category: req.body.category,
                price: req.body.price,
            };

            try {
                // START OF RESPONSE VALIDATION
                if (validateDetails(newProduct)) {
                    // 1. File signature 
                    signature = req.file.buffer.toString('hex').toUpperCase();
                    fileMimeType = getMimeType(signature);
                    if (fileMimeType == 'image/jpeg' || fileMimeType == 'image/png'){
                        // 2. Image rewriting 
                        sanitizeImage(req.file.buffer)
                            .then(async sanitizedBuffer => {
                                // 3. save to folder - filename!
                                let connection = await getConnectionFromPool();
                                let newFileName;
                                let uuidExists = true;
                                filePath = './public/images/products/';
                                fileExtension = fileMimeType.split("/")[1];

                                while (uuidExists) {
                                    newFileName = uuidv4() + "." + fileExtension;
                                    uuidExists = await checkUuidExists(connection, newFileName, "imageFilename");
                                }
                                
                                fs.writeFileSync(filePath + newFileName, sanitizedBuffer);
                                newProduct['imageFilename'] = newFileName;
    
                                // 4. save to DB.
                                const product = await addProduct(connection, newProduct);
            
                                if (product === null) {
                                    req.flash('error_msg', 'Invalid details.');
                                    return res.redirect('/addproductpage');
                                } else {
                                    req.flash('success_msg', 'Product successfully added.');
                                    return res.redirect('/addproductpage');
                                }
                            })
                            .catch(error => {
                                console.error('Image sanitization failed: ', error);
                                throw new Error("ERROR: Image sanitization failed.");
                            })
                    }
                    else {
                        throw new Error("ERROR: Invalid file.")
                    }
                }
                else {
                    throw new Error("ERROR: Invalid product details.");
                }
            }
            catch (error) {
                console.error(error)
                req.flash('error_msg', 'An error occurred when adding the product. Please try again.');
                return res.redirect('/addproductpage');
            }
        })

    }
}


module.exports = admin_products_controller;