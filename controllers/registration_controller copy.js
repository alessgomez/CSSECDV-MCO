const { getConnectionFromPool, performQuery } = require('../db');
const bcrypt = require("bcrypt");
const fs = require('fs');
const axios = require('axios');
const config = JSON.parse(fs.readFileSync('config.json'));

const sharp = require('sharp'); // has vulnerability BUT before the installed version 
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

//todo: fix filename 
// Configure storage engine and filename
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
    // 1. List allowed extensions
    const fileNameRegex = /[^\s]+(.*?)(.(jpg|jpeg|png|JPG|JPEG|PNG))?$/
    const fileNameValid = fileNameRegex.test(file.originalname)

    // 2. Content-type validation
    const fileTypeValid = (file.mimetype == "image/png" || file.mimetype == "image/jpeg")

    // 3. Filename length limit
    const fileNameLengthValid = file.originalname.length <= 255
    
    if (fileNameValid && fileTypeValid && fileNameLengthValid) {
        cb(null, true)
    }
    else {
        cb(null, false)
    }
}

// Initialize upload middleware and add file size limit
const upload = multer({
    storage: storage,
    limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB file size limit
    fileFilter: fileFilter
}).single('inputFile'); // 'myFile' is the name attribute of the file input field

async function registerAccount(connection, newAccount) {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM accounts WHERE email = ?', [newAccount.email], async (error, results) => {
            if (error) {
                reject(error);
            } else {
                if (results.length === 0) {            
                    if (validateDetails(newAccount)) {
                        error, newAccount.pw = await bcrypt.hash(newAccount.pw, config.saltRounds);

                        if (error) {
                            reject(error);
                        } else {
                            const sql = 'INSERT INTO accounts (firstName, lastName, email, password, phoneNumber, profilePicFilename, role, dateCreated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                            const values = [newAccount.first, newAccount.last, newAccount.email, newAccount.pw, newAccount.number, 'NAMENAME', 'USER', new Date()];

                            connection.query(sql, values, async (error, results) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    resolve(results); // Account successfully registered
                                }
                            });
                        }
                    } else {
                        resolve(null); // Invalid account details
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
    // TODO: Backend format validation for name (?)
    const nameRegex = /^(?!.*[,'-]{2})(?!.* [,'-])(?![,'-])(?=.{1,45}$)[A-Za-z]+(?:[ ,'-][A-Za-z]+)*(?:, [A-Za-z]+)*\.?$/;
    const nameValid = nameRegex.test(newAccount.first) && nameRegex.test(newAccount.last);

    const emailRegex = /^(([_-][A-Za-z0-9]+)|[A-Za-z0-9]+)([_.-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*(\.[A-Za-z]{2,})$/
    const emailValid = emailRegex.test(newAccount.email) && newAccount.email.substr(0, newAccount.email.indexOf('@')).length <= 64 && newAccount.email.substr(newAccount.email.indexOf('@')).length <= 255
    
    const phoneNumberRegex = /^(09|\+639)\d{9}$/;
    const phoneNumberValid = phoneNumberRegex.test(newAccount.number);
  
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,64}$/;
    const passwordValid = passwordRegex.test(newAccount.pw);
  
    // TODO: Backend format validation for profile pic (?)

    return nameValid && emailValid && phoneNumberValid && passwordValid; // TODO: Add validation for name and profile pic once done
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

    postAddAccount: function (req, res) { // TODO: 0. Validate file type? 
        upload(req, res, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({error: err});
            }
            if (!req.file) {
                return res.status(400).json({ error: 'Please send file' });
            }
            console.log(req.file)
            var newAccount = {
                first: req.body.firstname,
                last: req.body.lastname,
                email: req.body.email,
                pw: req.body.psw,
                number: req.body.contactno,
            };
            if (validateDetails(newAccount)) {
                // 1. File signature 
                signature = req.file.buffer.toString('hex').toUpperCase();
                fileMimeType = getMimeType(signature);
                if (fileMimeType == 'image/jpeg' || fileMimeType == 'image/png'){
                    // 2. Image rewriting 
                    sanitizeImage(req.file.buffer)
                        .then(sanitizedBuffer => {
                            console.log('Image sanitized successfully.');
                            console.log(sanitizedBuffer);
                            // 3. save to folder - filename!
                            filePath = './uploads/'
                            fileExtension = req.file.mimetype.split("/")[1]
                            newFileName = uuidv4() + "." + fileExtension
                            fs.writeFileSync(filePath + newFileName, sanitizedBuffer)

                            // 4. save to DB. - fix db connection; 
                            
                            // 5. frontend validation (including hbs)
                        })
                        .catch(error => {
                            console.error('Image sanitization failed: ', error);
                        })
                }
                else {
                    console.log("ERROR: File signature invalid")
                }
            }
            res.send('File uploaded!');
        })

    }

}

module.exports = registration_controller;

/*

       upload(req, res, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({error: err});
            }
            if (!req.file) {
                return res.status(400).json({ error: 'Please send file' });
            }
            console.log(req.file);
            console.log(req.file.buffer);
            res.send('File uploaded!');
        })

        console.log("YOUTH 1");

        var newAccount = {
            first: req.body.firstname,
            last: req.body.lastname,
            email: req.body.email,
            pw: req.body.psw,
            number: req.body.contactno,
        }

        console.log("YOUTH 2");

        if (validateDetails(newAccount)) { 
            return res.status(400).json({error: "ERROR: Input (other than file) is invalid"});
        }

        //if all other fields except file are valid
        /*upload(req, res, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({error: err});
            }
            if (!req.file) {
                return res.status(400).json({ error: 'Please send file' });
            }
            console.log(newAccount);
            console.log(req.file);
            console.log(req.file.buffer);
            res.send('File uploaded!');
        })*/


        
        /*
        // 3. Validate file type
        // 4. File signature validation - BACK
        // 7. File content validation - image rewriting - BACK 
        // 8. Protect from CSRF - BACK 
        // 9. Antivirus / save in remote location / only allow authorized users to upload files - BACK 
    
        upload(req, res, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({error: err});
            }
            if (!req.file) {
                return res.status(400).json({ error: 'Please send file' });
            }
            console.log(req.file);
            res.send('File uploaded!');
        })*/

        /*
        var newAccount = {
            first: req.body.firstname,
            last: req.body.lastname,
            email: req.body.email,
            pw: req.body.psw,
            number: req.body.contactno,
            //profilePhoto: req.body.inputFile
        }

        try {
            let connection = await getConnectionFromPool();

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

            const account = await registerAccount(connection, newAccount);

            if (account === null) {
                req.flash('error_msg', 'Invalid details.');
                return res.redirect('/register');
            } else {
                req.flash('success_msg', 'Account successfully registered. You may log in.');
                return res.redirect('/login');
            }
        } catch (error) {
            req.flash('error_msg', 'An error occurred during registration. Please try again.');
            console.log(error);
            return res.redirect('/login');
        }*/
