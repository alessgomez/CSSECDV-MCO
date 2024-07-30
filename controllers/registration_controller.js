const { getConnectionFromPool } = require('../db');
const bcrypt = require("bcrypt");
const fs = require('fs');
const axios = require('axios');
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;
const logger = require('../logger');
const geoip = require('geoip-lite');

const sharp = require('sharp');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
    // 1. List allowed extensions
    const fileNameRegex = /^[A-Za-z0-9]+([-._ ]*[A-Za-z0-9])*\.(jpg|jpeg|png|JPG|JPEG|PNG)$/
    const fileNameValid = fileNameRegex.test(file.originalname)

    // 2. Content-type validation
    const fileTypeValid = (file.mimetype === "image/png" || file.mimetype === "image/jpeg")

    // 3. Filename length limit
    const fileNameLengthValid = file.originalname.length <= 255
    
    if (fileNameValid && fileTypeValid && fileNameLengthValid) {
        cb(null, true)
    } else {
        cb(null, false)
    }
}

const checkUuidExists = (connection, tableName, newId, field) => {
    return new Promise((resolve, reject) => {
        let sql = '';
        if(tableName == 'accounts') 
            sql = 'SELECT * FROM accounts WHERE ? = ?';
        else if (tableName == 'bag') 
            sql = 'SELECT * FROM bag WHERE ? = ?'

        connection.query(sql, [field, newId], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.length > 0);
            }
        });
    });
};

// Initialize upload middleware and add file size limit
const upload = multer({
    storage: storage,
    limits: { fileSize: 3 * 1024 * 1024}, // 3 MB file size limit
    fileFilter: fileFilter
}).single('inputFile');

async function registerAccount(connection, newAccount) {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM accounts WHERE (email = ? OR phoneNumber = ?) AND isArchived = ?', [newAccount.email, newAccount.number, false], async (error, results) => {
            if (error) {
                reject(error);
            } else {
                if (results.length === 0) {
                    let newId;
                    let uuidExists = true;

                    while (uuidExists) {
                        newId = uuidv4();
                        uuidExists = await checkUuidExists(connection, "accounts", newId, "accountId");
                    }

                    error, newAccount.pw = await bcrypt.hash(newAccount.pw, config.saltRounds);

                    if (error) {
                        reject(error);
                    } else {
                        const sql = 'INSERT INTO accounts (accountId, firstName, lastName, email, password, address, phoneNumber, profilePicFilename, role, dateCreated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                        const values = [newId, newAccount.first, newAccount.last, newAccount.email, newAccount.pw, newAccount.address, newAccount.number, newAccount.profilePicFilename, 'USER', new Date()];

                        connection.query(sql, values, async (error, results) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve([results, newId]); // Account successfully registered
                            }
                        });
                    }
                } else {
                    resolve(null); // Account with the given email already exists
                }
            }
        })
    });
}

async function createBag(connection, accountId) {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM bag WHERE accountId = ?', [accountId], async (error, results) => {
            if (error) {
                reject(error);
            } else {
                if (results.length === 0) {
                    let newId;
                    let uuidExists = true;

                    while(uuidExists) {
                        newId = uuidv4();
                        uuidExists = await checkUuidExists(connection, "bag", newId, "bagId");
                    }

                    const sql = 'INSERT INTO bag (bagId, accountId, subtotal, deliveryFee, total) VALUES (?, ?, ?, ?, ?)';
                    const values = [newId, accountId, 0, 0, 0];

                    connection.query(sql, values, async(error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    })

                } else {
                    resolve(null); // Bag with the given accountId already exists
                }
            }

        })
    })
}

function getMimeType(signature) {
    if (signature.startsWith("FFD8FFDB") || signature.startsWith("FFD8FFE0") || signature.startsWith("FFD8FFEE")) {
        return "image/jpeg";
    } 
    else if (signature.startsWith("89504E47")) {
        return "image/png";
    }
    else {
        return "invalid";
    }
}

function getByteLengthBlob(string, encoding = 'utf-8') {
    const blob = new Blob([string], { type: `text/plain;charset=${encoding}` });
    return blob.size;
}

function validateDetails(newAccount) {
    const nameRegex = /^(?!.*[,'-]{2})(?!.* [,'-])(?![,'-])(?=.{1,45}$)[A-Za-z]+(?:[ ,'-][A-Za-z]+)*(?:, [A-Za-z]+)*\.?$/;
    const nameValid = nameRegex.test(newAccount.first) && nameRegex.test(newAccount.last);

    const emailRegex = /^(([_-][A-Za-z0-9]+)|[A-Za-z0-9]+)([_.-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*(\.[A-Za-z]{2,})$/
    const emailLocalLength = getByteLengthBlob(newAccount.email.substr(0, newAccount.email.indexOf('@')));
    const emailDomainLength = getByteLengthBlob(newAccount.email.substr(newAccount.email.indexOf('@')));
    const emailValid = emailRegex.test(newAccount.email) && emailLocalLength <= 64 && emailDomainLength <= 255;

    const addressRegex = /^([0-9a-zA-Z ,.#-]+),\s*([0-9a-zA-Z ,.#-]+),\s*([0-9a-zA-Z ,.#-]+),\s*([0-9]{4})$/;
    const addressValid = addressRegex.test(newAccount.address) && newAccount.address.length <= 160;

    const phoneNumberRegex = /^(09|\+639)\d{9}$/;
    const phoneNumberValid = phoneNumberRegex.test(newAccount.number);
  
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,64}$/;
    const passwordValid = passwordRegex.test(newAccount.pw);

    return nameValid && emailValid && addressValid && phoneNumberValid && passwordValid;
}

async function sanitizeImage(inputBuffer) {
    try {
        let image = sharp(inputBuffer);

        const metadata = await image.metadata();
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;

        sanitizedImage = image.resize(originalWidth-1, originalHeight-1)
                              .resize(originalWidth, originalHeight);
        
        const sanitizedBuffer = sanitizedImage = await image.toBuffer();
        return sanitizedBuffer;
    } catch(error) {
        throw error;
    }
}

const registration_controller = {
    
    getRegister: function (req, res) {
        res.render("register", { siteKey: config.RECAPTCHA_SITE_KEY });
    },

    postAddAccount: function (req, res) {
        upload(req, res, async (err) => {
            try {
                if (err)
                    throw error;

                if (!req.file)
                    throw new Error('No file uploaded.');

                var newAccount = {
                    first: req.body.firstname,
                    last: req.body.lastname,
                    email: req.body.email,
                    pw: req.body.psw,
                    address: req.body.address,
                    number: req.body.contactno
                };

                const { 'g-recaptcha-response': recaptchaResponse } = req.body;
            
                if (!recaptchaResponse)
                    throw new Error('No Recaptcha response.');
            
                const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${config.RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`;
                const response = await axios.post(verificationUrl);
                const { success } = response.data;
            
                if (!success)
                    throw new Error('Recaptcha verification failed.');

                // START OF RESPONSE VALIDATION
                if (validateDetails(newAccount)) {
                    // 1. File signature 
                    signature = req.file.buffer.toString('hex').toUpperCase();
                    fileMimeType = getMimeType(signature);
                    if (fileMimeType == 'image/jpeg' || fileMimeType == 'image/png') {
                        // 2. Image rewriting
                        let sanitizedBuffer = await sanitizeImage(req.file.buffer);

                        // 3. save to folder - filename!
                        let connection = await getConnectionFromPool();
                        let newFileName;
                        let uuidExists = true;
                        filePath = './public/uploads/';
                        fileExtension = fileMimeType.split("/")[1];

                        while (uuidExists) {
                            newFileName = uuidv4() + "." + fileExtension;
                            uuidExists = await checkUuidExists(connection, "accounts", newFileName, "profilePicFilename");
                        }
                        fs.writeFileSync(filePath + newFileName, sanitizedBuffer);
                        newAccount['profilePicFilename'] = newFileName;

                        // 4. save to DB.
                        const account = await registerAccount(connection, newAccount);
    
                        if (account === null)
                            throw new Error('Account with the given email or phone number already exists.');
                        else {
                            const bag = await createBag(connection, account[1]);
                            if (bag === null)
                                throw new Error('Account with the given email already has a bag.');
                            else {
                                connection.release();

                                logger.info('User successfully registered account', {
                                    meta: {
                                        event: 'REGISTER_ACCOUNT_SUCCESS',
                                        method: req.method,
                                        url: req.originalUrl,
                                        accountId: account[1], 
                                        sourceIp: req.ip,
                                        userAgent: req.headers['user-agent'],
                                        hostname: req.hostname,
                                        protocol: req.protocol,
                                        port: req.socket.localPort,
                                        geo:geoip.lookup(req.ip)
                                    }
                                });

                                req.flash('success_msg', 'Account successfully registered. You may log in.');
                                return res.redirect('/login');
                            }
                        }
                    } else
                        throw new Error('Invalid file.');
                } else
                    throw new Error('Invalid registration details.');
            } catch (error) {
                if (debug)
                    console.error('Error registering account:', error);
                else
                    console.error('An error occurred during registration.');

                logger.error('Error when user attempted to register account', {
                    meta: {
                        event: 'REGISTER_ACCOUNT_ERROR',
                        method: req.method,
                        url: req.originalUrl,
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
    
                req.flash('error_msg', 'An error occurred during registration. Please try again.');
                return res.redirect('/register');
            }
        })
    }
}

module.exports = {
    registration_controller,
    fileFilter,
    getMimeType,
    sanitizeImage
};