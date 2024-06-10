$(document).ready(function(){
    var emailInput = document.getElementById("email");
    var phoneNumberInput = document.getElementById("contactno");
    var fileUploadInput = document.getElementById("input-file");
    var passwordInput = document.getElementById("psw");
    var confirmPasswordInput = document.getElementById("confirmpsw");
    var submit = document.getElementById("reg-submit");
    var error_msg = document.getElementById("error");

    /** @param {import('http').IncomingMessage} req */
    function parseMultipartNodeRequest(req) {
        return new Promise((resolve, reject) => {
            const form = formidable({
                multiples: true,
            });
            form.parse(req, (error, fields, files) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve({...fields, ...files});
            });
        });
    }

    emailInput.onkeyup = function() {
        var email = emailInput.value
        
        if (email != null) {
            let regexEmail = new RegExp(/^(([_-][A-Za-z0-9]+)|[A-Za-z0-9]+)([_.-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*(\.[A-Za-z]{2,})$/) // TODO: Double check regex

            if (regexEmail.test(email) == true && email.substr(0, email.indexOf('@')).length <= 64 && email.substr(email.indexOf('@')).length <= 255) {
                console.log("VALID: " + email)

                // TODO: Ensure that the address is deliverable 
            }
            else {
                console.log("ERROR: Invalid email string")
            }
        } 
        else {
            console.log("ERROR: Email is NULL")
        }
    }

    phoneNumberInput.onkeyup = function() {
        var phoneNumber = phoneNumberInput.value

        if (phoneNumber != null) {
            let regexPhoneNumber = new RegExp(/^(09|\+639)\d{9}$/)
            if (regexPhoneNumber.test(phoneNumber) == true) {
                console.log("VALID: " + phoneNumber)
            } 
            else {
                console.log("ERROR: Invalid phone number string")
            }
        }
        else {
            console.log("ERROR: Phone Number is NULL")
        }
    }

    fileUploadInput.onchange = async function (event) {
        let body;
        const headers = getRequestHeaders(event);

        if(headers['content-type']?.includes('multipart/form-data')) {
            body = await parseMultipartNodeRequest(event.node.req);
        } else {
            body = await readBody(event);
        }
        console.log(body);

        return { ok: true };
    }

    // name

    // password
    var passwordValid = false;
    var confirmPasswordValid = false;

    passwordInput.onkeyup = function() {
        var password = passwordInput.value
        
        if (password != null) {
            let regexPassword = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,64}$/);

            passwordValid = regexPassword.test(password);

            if (passwordValid && confirmPasswordValid) {
                if (passwordInput.value === confirmPasswordInput.value) {
                    submit.disabled = false;
                    error_msg.innerHTML = "";
                }
                else {
                    submit.disabled = true;
                    error_msg.innerHTML = "Passwords do not match.";
                }
            } else {
                submit.disabled = true;
                error_msg.innerHTML = "Password must be between 8 to 64 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
            }
        }
    }

    confirmPasswordInput.onkeyup = function() {
        var confPassword = confirmPasswordInput.value
        
        if (confPassword != null) {
            let regexPassword = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,64}$/);

            confirmPasswordValid = regexPassword.test(confPassword);

            if (passwordValid && confirmPasswordValid) {
                if (passwordInput.value === confirmPasswordInput.value) {
                    submit.disabled = false;
                    error_msg.innerHTML = "";
                }
                else {
                    submit.disabled = true;
                    error_msg.innerHTML = "Passwords do not match.";
                }
            } else {
                submit.disabled = true;
                error_msg.innerHTML = "Password must be between 8 to 64 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
            }
        }
    }
});

/**
 * 
 *     inputFile.onchange = function(){
        var fileName = inputFile.files[0].name;

        if (fileName != null) {
            // #0: Type conversion?
            // #1: Use input validation to ensure the uploaded filename uses an expected extension type
            let regex = new RegExp(/[^\s]+(.*?).(jpg|jpeg|png|JPG|JPEG|PNG)$/); //TODO: DOUBLE CHECK https://www.geeksforgeeks.org/how-to-validate-image-file-extension-using-regular-expression/
            
            if (regex.test(fileName) == true) {
                console.log(fileName)

                var fileSize = inputFile.files[0].size;

                // #2: Ensure the uploaded file is NOT larger than a defined maximum file size
                if (fileSize < 10 * 1024) { //10kB
                    console.log(fileSize)

                    // #3: Use image rewriting libraries to verify the image is valid and to strip away extraneous content 
                    if () {

                    }

                    // #4: Set the extension of the stored image to be a valid image extension based on the detected content type of the image from image processing 

                    // #5 Ensure the detected content type of the image is within a list of defined image types 

                    // #6: Use a new filename to store the file on the OS - DO NOT USE USER CONTROLLED TEXT FOR FILENAME/TEMPORARY FILENAME

                    // #7: Uploaded files should be analyzed for malicious content (anti-malware, static analysis, etc.)

                    // #8: Display image 
                    profilePic.src = URL.createObjectURL(inputFile.files[0]);   
                }

                else {
                    console.log("ERROR: #2 FILE SIZE EXCEEDED")
                }
            } 
            else {
                console.log("ERROR: #1 REGEX TEST FAILED")
            }
        }
    }
 * 
 * 
 */