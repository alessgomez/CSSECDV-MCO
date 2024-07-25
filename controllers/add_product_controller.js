const { getConnectionFromPool, logPoolStats } = require('../db');
const { fileFilter, getMimeType, sanitizeImage } = require('./registration_controller.js')
const fs = require('fs');
const sharp = require('sharp');
const multer = require('multer');
const { v4: uuidv4, validate } = require('uuid');
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


async function checkProductUuidExists(connection, newId) {
    try {
        const sql = 'SELECT * FROM products WHERE productId = ?';
        const [results] = await connection.promise().query(sql, [newId]);
        return results.length > 0;
    } catch (error) {
        throw error; 
    }
}

async function checkImageUuidExists(connection, newFilename) {
    try {
        const sql = 'SELECT * FROM products WHERE imageFilename = ?';
        const [results] = await connection.promise().query(sql, [newFilename]);
        return results.length > 0;
    } catch (error) {
        throw error; 
    }
}

async function addProduct(connection, newProduct) {
    try {
        let newId;
        let uuidExists = true;

        while (uuidExists) {
            newId = uuidv4();
            uuidExists = checkProductUuidExists(connection, newId);
        }

        const sql = 'INSERT INTO products (productId, name, category, price, imageFilename, isBestseller, isArchived) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const values = [newId, newProduct.name, newProduct.category, newProduct.price, newProduct.imageFilename, false, false];
        
        await connection.promise().query(sql, values);

        return newId; 
    } catch (error) {
        throw error; 
    }
}

function validateSelectedCategory(selectedCategory) {
    validOptions = ['main', 'snack', 'drink', 'dessert']
    if (validOptions.includes(selectedCategory)) 
        return true
    else 
        return false
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
            let connection;
            try {
                if (err) {
                    if (debug)
                        console.error('Error uploading the file: ', err);
                    else    
                        console.error('An error occurred.')

                    req.flash('error_msg', 'Invalid file name. File name can only contain alphanumeric characters, hypen, underscore, or period.');
                    return res.redirect('/addProductPage');
                }

                if (!req.file) {
                    req.flash('error_msg', 'Please upload a file.');
                    return res.redirect('/addProductPage');
                }
        
                const newProduct = {
                    name: DOMPurify.sanitize(req.body.name),
                    category: DOMPurify.sanitize(req.body.category),
                    price: parseFloat(DOMPurify.sanitize(req.body.price)).toFixed(2),
                };

            
                if (!validateDetails(newProduct)) {
                    throw new Error("Invalid product details.");
                }
    
                const fileSignature = req.file.buffer.toString('hex').toUpperCase();
                const fileMimeType = getMimeType(fileSignature);
    
                if (fileMimeType !== 'image/jpeg' && fileMimeType !== 'image/png') {
                    throw new Error("Invalid file type.");
                }
    
                const sanitizedBuffer = await sanitizeImage(req.file.buffer);
    
                connection = await getConnectionFromPool();
                const fileExtension = fileMimeType.split("/")[1];
                let newFileName;
                let uuidExists = true;
                const filePath = './public/images/products/';
    
                while (uuidExists) {
                    newFileName = `${uuidv4()}.${fileExtension}`;
                    uuidExists = checkImageUuidExists(connection, newFileName);
                }
    
                fs.writeFileSync(filePath + newFileName, sanitizedBuffer);
                newProduct.imageFilename = newFileName;
    
                const result = addProduct(connection, newProduct);
    
                if (result === null) {
                    req.flash('error_msg', 'Invalid details.');
                } else {
                    req.flash('success_msg', 'Product successfully added.');
                }
    
                return res.redirect('/addProductPage');

            } catch (error) {
                if (debug)
                    console.error('Error adding a product: ', error)
                else    
                    console.error('An error occurred.')
                
                req.flash('error_msg', 'An error occurred when adding the product. Please try again.');
                return res.redirect('/addProductPage');
            } finally {
                if (connection) 
                    connection.release();
            }
        })

    }
}


module.exports = {
    add_product_controller,
    checkImageUuidExists,
    validateSelectedCategory,
    validateDetails
};
