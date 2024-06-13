const { getConnectionFromPool, performQuery } = require('../db');
const bcrypt = require("bcrypt");
const fs = require('fs');
const axios = require('axios');
const config = JSON.parse(fs.readFileSync('config.json'));

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

const checkUuidExists = (connection, newId, field) => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM accounts WHERE ? = ?', [field, newId], (error, results) => {
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
        connection.query('SELECT * FROM accounts WHERE email = ? OR phoneNumber = ?', [newAccount.email, newAccount.number], async (error, results) => {
            if (error) {
                reject(error);
            } else {
                if (results.length === 0) {
                    let newId;
                    let uuidExists = true;

                    while (uuidExists) {
                        newId = uuidv4();
                        uuidExists = await checkUuidExists(connection, newId, "accountId");
                    }

                    error, newAccount.pw = await bcrypt.hash(newAccount.pw, config.saltRounds);

                    if (error) {
                        reject(error);
                    } else {
                        const sql = 'INSERT INTO accounts (accountId, firstName, lastName, email, password, phoneNumber, profilePicFilename, role, dateCreated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                        const values = [newId, newAccount.first, newAccount.last, newAccount.email, newAccount.pw, newAccount.number, newAccount.profilePicFilename, 'USER', new Date()];

                        connection.query(sql, values, async (error, results) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(results); // Account successfully registered
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

function validateDetails(newAccount) {
    const nameRegex = /^(?!.*[,'-]{2})(?!.* [,'-])(?![,'-])(?=.{1,45}$)[A-Za-z]+(?:[ ,'-][A-Za-z]+)*(?:, [A-Za-z]+)*\.?$/;
    const nameValid = nameRegex.test(newAccount.first) && nameRegex.test(newAccount.last);

    const emailRegex = /^(([_-][A-Za-z0-9]+)|[A-Za-z0-9]+)([_.-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*(\.[A-Za-z]{2,})$/
    const emailValid = emailRegex.test(newAccount.email) && newAccount.email.substr(0, newAccount.email.indexOf('@')).length <= 64 && newAccount.email.substr(newAccount.email.indexOf('@')).length <= 255
    
    const phoneNumberRegex = /^(09|\+639)\d{9}$/;
    const phoneNumberValid = phoneNumberRegex.test(newAccount.number);
  
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,64}$/;
    const passwordValid = passwordRegex.test(newAccount.pw);

    return nameValid && emailValid && phoneNumberValid && passwordValid;
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
        console.error('Error during image sanitization: ', error);
        throw error;
    }
}

const registration_controller = {
    
    getRegister: function (req, res) {
        res.render("register", { siteKey: config.RECAPTCHA_SITE_KEY });
    },

    postAddAccount:  function (req, res) {
        upload(req, res, async (err) => {
            if (err) {
                console.error(err);
                req.flash('error_msg', 'Invalid file name. File name can only contain alphanumeric characters, hypen, underscore, or period.');
                return res.redirect('/register');
            }
            if (!req.file) {
                req.flash('error_msg', 'Please upload a file.');
                return res.redirect('/register');
            }
     
            var newAccount = {
                first: req.body.firstname,
                last: req.body.lastname,
                email: req.body.email,
                pw: req.body.psw,
                number: req.body.contactno,
            };

            try {
                const { 'g-recaptcha-response': recaptchaResponse } = req.body;
            
                if (!recaptchaResponse) {
                    req.flash('error_msg', 'Invalid registration attempt. Please try again.');
                    return res.redirect('/register');
                }
            
                const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${config.RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`;
                const response = await axios.post(verificationUrl);
                const { success } = response.data;
            
                if (!success) {
                    req.flash('error_msg', 'Invalid registration attempt. Please try again.');
                    return res.redirect('/register');
                }

                // START OF RESPONSE VALIDATION
                if (validateDetails(newAccount)) {
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
                                filePath = './uploads/';
                                fileExtension = fileMimeType.split("/")[1];

                                while (uuidExists) {
                                    newFileName = uuidv4() + "." + fileExtension;
                                    uuidExists = await checkUuidExists(connection, newFileName, "profilePicFilename");
                                }
                                fs.writeFileSync(filePath + newFileName, sanitizedBuffer);
                                newAccount['profilePicFilename'] = newFileName;
    
                                // 4. save to DB.
                                const account = await registerAccount(connection, newAccount);
            
                                if (account === null) {
                                    req.flash('error_msg', 'Invalid details.');
                                    return res.redirect('/register');
                                } else {
                                    req.flash('success_msg', 'Account successfully registered. You may log in.');
                                    return res.redirect('/login');
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
                    throw new Error("ERROR: Invalid registration details.");
                }
            }
            catch (error) {
                req.flash('error_msg', 'An error occurred during registration. Please try again.');
                console.log(error);
                return res.redirect('/login');
            }
        })

    }

}

module.exports = registration_controller;