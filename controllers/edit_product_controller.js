const { getConnectionFromPool, logPoolStats } = require('../db.js');
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

async function editProduct(connection, updatedProduct, hasNewImage) {
    try {
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
                    resolve(updatedProduct.productId)   // product was successfully updated
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


const edit_product_controller = {
    getEditProduct: async (req, res) => {
        const productId = req.params.id
        const data = {
            style: ["navbar", "index", "adminproducts", "editproduct"],
            script: ["editproduct"],
            isAdmin: true,
            isMain: false,
            isSnack: false,
            isDrink: false,
            isDessert: false
        }

        let connection = await getConnectionFromPool();

        try {
            const sql = 'SELECT * FROM products WHERE productId = ?'; 
            connection.query(sql, [productId], async (error, results) => {
              if (error) {
                reject(error);
              } else {
                if (results.length === 0) {
                    res.redirect('/viewProductsPage')
                } else {
                    data.product = results[0];
                    const category = data.product.category;

                    if (category == 'main')
                        data.isMain = true;
                    else if (category == 'snack')
                        data.isSnack = true
                    else if (category == 'drink')
                        data.isDrink = true
                    else if (category == 'dessert')
                        data.isDessert = true

                    res.render('admineditproduct', data);
                }
              }
            });
        } catch (error) {
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }
    },

    postEditProduct:  function (req, res) {
        upload(req, res, async (err) => {
            const productId = req.body.productId;
            if (err) {
                console.error(err);
                req.flash('error_msg', 'Invalid file name. File name can only contain alphanumeric characters, hypen, underscore, or period.');
                return res.redirect('/editProductPage/' + productId);
            }
        
            var updatedProduct = {
                productId: productId,
                name: req.body.name,
                category: req.body.category,
                price: req.body.price,
            };

            try {
                // START OF RESPONSE VALIDATION
                if (validateDetails(updatedProduct)) {
                    if (!req.file) {
                        let connection = await getConnectionFromPool();

                        // save to DB.
                        const result = await editProduct(connection, updatedProduct, false);
                        if (result === null) 
                            req.flash('error_msg', 'Invalid details.');
                        else 
                            req.flash('success_msg', 'Product successfully updated.');
                        
                        return res.redirect('/editProductPage/' + productId);

                    } else {
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
                                    updatedProduct['imageFilename'] = newFileName;
        
                                    // 4. save to DB.
                                    const result = await editProduct(connection, updatedProduct, true);
                
                                    if (result === null) 
                                        req.flash('error_msg', 'Invalid details.');
                                    else 
                                        req.flash('success_msg', 'Product successfully updated.');
                                    
                                    return res.redirect('/editProductPage/' + productId);

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

                    
                }
                else {
                    throw new Error("ERROR: Invalid product details.");
                }
            }
            catch (error) {
                console.error(error)
                req.flash('error_msg', 'An error occurred when updating the product. Please try again.');
                return res.redirect('/editProductPage/' + productId);
            }
        })
    
    },

    getProduct: async (req, res) => {
        const productId = req.query.productId;
        let connection = await getConnectionFromPool();
        try {
            const query = 'SELECT * FROM products WHERE productId = ?';
            connection.query(query, [productId], (error, results) => {
                if (error) {
                    console.error(error);
                    res.json({ success: false, error: error});
                    return;
                }
                if (results.length === 0) {
                    console.error('Product not found:', productId);
                    res.json({ success: false, error: 'Product not found' });
                    return;
                } else {
                    const product = results[0];
                    res.json({ success: true, product: product });
                    return;
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

    isArchived: async function(req, res, next) {
        const productId = req.params.id
        let connection = await getConnectionFromPool();

        console.log("isArchived called")

        try {
            const query = 'SELECT * FROM products WHERE productId = ?';
            connection.query(query, [productId], (error, results) => {
                if (error) {
                    console.error(error);
                    res.redirect('/viewProductsPage');
                }
                if (results.length === 0) {
                    console.error('Product not found:', productId);
                    res.redirect('/viewProductsPage');
                } else {
                    if (!results[0].isArchived)
                        return next();
                    else {
                        console.error('Product has been archived');
                        res.redirect('/viewProductsPage');
                    }
                }
            });
           
        } catch (error) {
            console.error(error);
        }
        finally {
            if (connection) {
              connection.release();
            }
        }
    }
}

module.exports = edit_product_controller;