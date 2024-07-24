const { getConnectionFromPool, logPoolStats } = require('../db');
const { fileFilter, getMimeType, sanitizeImage } = require('./registration_controller.js')
const fs = require('fs');
const sharp = require('sharp');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const storage = multer.memoryStorage();
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);


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
                    resolve(newId); // product successfully added
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


const add_product_controller = {
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
                return res.redirect('/addProductPage');
            }
            if (!req.file) {
                req.flash('error_msg', 'Please upload a file.');
                return res.redirect('/addProductPage');
            }
     
            var newProduct = {
                name: DOMPurify.sanitize(req.body.name),
                category: DOMPurify.sanitize(req.body.category),
                price: DOMPurify.sanitize(req.body.price),
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
                                const result = await addProduct(connection, newProduct);
            
                                if (result === null)
                                    req.flash('error_msg', 'Invalid details.');   
                                else 
                                    req.flash('success_msg', 'Product successfully added.');

                                return res.redirect('/addProductPage');
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
                return res.redirect('/addProductPage');
            } finally {
                if (connection) 
                    connection.release();
            }
        })

    }
}


module.exports = add_product_controller;