$(document).ready(function(){
    var emailInput = document.getElementById("email");
    var phoneNumberInput = document.getElementById("contactno");
    var fileUploadInput = document.getElementById("input-file");

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

    email.onkeyup = function() {
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
});


/*
    var input = document.getElementById("psw");
    var length = document.getElementById("length");
    var uppercase = document.getElementById("uppercase");
    var special = document.getElementById("special");
    var number = document.getElementById("number");

    var input2 = document.getElementById("confirmpsw");
    var match = document.getElementById("match");

    var first = document.getElementById("firstname");
    var last = document.getElementById("lastname");
    var email = document.getElementById("email");
    var contactno = document.getElementById("contactno");
    var address = document.getElementById("address");
    var submit = document.getElementById("reg-submit");
    var profilePic = document.getElementById("profile-pic");
    var inputFile = document.getElementById("input-file");

    input.onkeyup = function() {
        // Check length
        if(input.value.length >= 8) {
            length.classList.remove("invalid");
            length.classList.add("valid");
        }
        else {
            length.classList.remove("valid");
            length.classList.add("invalid");
        }

        // Check uppercase
        var uppercaseLetters = /[A-Z]/g;
        if(input.value.match(uppercaseLetters)) {  
            uppercase.classList.remove("invalid");
            uppercase.classList.add("valid");
        }
        else {
            uppercase.classList.remove("valid");
            uppercase.classList.add("invalid");
        }

        // Check special character
        var specialChars = /\W|_/g;
        if(input.value.match(specialChars)) {  
            special.classList.remove("invalid");
            special.classList.add("valid");
        }
        else {
            special.classList.remove("valid");
            special.classList.add("invalid");
        }

        // Check number
        var numbers = /[0-9]/g;
        if(input.value.match(numbers)) {  
            number.classList.remove("invalid");
            number.classList.add("valid");
        } else {
            number.classList.remove("valid");
            number.classList.add("invalid");
        }

        if (length.classList.contains("valid") && uppercase.classList.contains("valid") && special.classList.contains("valid") && number.classList.contains("valid")
            && match.classList.contains("valid"))
            submit.disabled = false;
        else
            submit.disabled = true;
    }

    input2.onkeyup = function() {
        if (input.value == input2.value) {
            match.classList.remove("invalid");
            match.classList.add("valid");
        }
        else {
            match.classList.remove("valid");
            match.classList.add("invalid");
        }

        if (length.classList.contains("valid") && uppercase.classList.contains("valid") && special.classList.contains("valid") && number.classList.contains("valid")
            && match.classList.contains("valid"))
            submit.disabled = false;
        else
            submit.disabled = true;
    }

    inputFile.onchange = function(){
        profilePic.src = URL.createObjectURL(inputFile.files[0]);
    }
*/

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