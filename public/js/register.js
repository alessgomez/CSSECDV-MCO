$(document).ready(function(){
    var firstNameInput = document.getElementById("firstname");
    var lastNameInput = document.getElementById("lastname");
    var emailInput = document.getElementById("email");
    var phoneNumberInput = document.getElementById("contactno");
    var fileUploadInput = document.getElementById("inputFile");
    var passwordInput = document.getElementById("psw");
    var confirmPasswordInput = document.getElementById("confirmpsw");
    var submit = document.getElementById("reg-submit");
    var error_msg = document.getElementById("error");
    const maxFileSize = 3 * 1024 * 1024; 
    const acceptedTypes = ["image/jpeg", "image/png"]

    var firstNameValid = false;
    var lastNameValid = false;
    var emailValid = false;
    var phoneNumberValid = false;
    var fileUploadValid = false;
    var passwordsValid = false;

    function readFile(file) {
        return new Promise((resolve, reject) => {
            const filereader = new FileReader();
            filereader.onloadend = (event) => {
                if (event.target.readyState === FileReader.DONE) {
                    resolve(event.target.result);
                }
            };
            filereader.onerror = reject;
            const blob = file.slice(0, 12);
            filereader.readAsArrayBuffer(blob);
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

    function validateFields() {
        submit.disabled = !(firstNameValid && lastNameValid && emailValid && phoneNumberValid && fileUploadValid && passwordsValid);
    }

    emailInput.onkeyup = function() {
        var email = emailInput.value
        let regexEmail = new RegExp(/^(([_-][A-Za-z0-9]+)|[A-Za-z0-9]+)([_.-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*(\.[A-Za-z]{2,})$/) // TODO: Double check regex
        
        emailValid = email != null && regexEmail.test(email) && email.substr(0, email.indexOf('@')).length <= 64 && email.substr(email.indexOf('@')).length <= 255;

        validateFields();
    }

    phoneNumberInput.onkeyup = function() {
        var phoneNumber = phoneNumberInput.value
        let regexPhoneNumber = new RegExp(/^(09|\+639)\d{9}$/)

        phoneNumberValid = phoneNumber != null && regexPhoneNumber.test(phoneNumber);

        validateFields();
    }

    fileUploadInput.onchange = async function () {
        var fileName = fileUploadInput.files[0].name;
        
        fileUploadValid = false;

        if (fileName != null) {
            let regexFileName = new RegExp(/[^\s]+(.*?)(.(jpg|jpeg|png|JPG|JPEG|PNG))?$/); //TODO: DOUBLE CHECK https://www.geeksforgeeks.org/how-to-validate-image-file-extension-using-regular-expression/
            
            if (regexFileName.test(fileName) && fileName.length <= 255) {                
                var file = fileUploadInput.files[0];
                let byteStream = await readFile(file); 
                const uint = new Uint8Array(byteStream);
                let bytes = [];
                uint.forEach((byte) => {
                    bytes.push(byte.toString(16));
                });
                const hex = bytes.join("").toUpperCase();
                let mimeType = getMimeType(hex);

                if (acceptedTypes.includes(mimeType)) {
                    var fileSize = fileUploadInput.files[0].size;
                    if (fileSize < maxFileSize) {
                        var image = new Image();

                        image.onload = function() { // Image upload successful
                            fileUploadValid = true;
                            validateFields();
                        }
                        image.onerror = function() {
                            console.log("ERROR: Cannot load image")
                        }

                        image.src = URL.createObjectURL(fileUploadInput.files[0]);                          
                    }
                }
            }
        }
        
        validateFields();
    }

    // name
    let regexName = new RegExp(/^(?!.*[,'-]{2})(?!.* [,'-])(?![,'-])(?=.{1,45}$)[A-Za-z]+(?:[ ,'-][A-Za-z]+)*(?:, [A-Za-z]+)*\.?$/);

    firstNameInput.onkeyup = function() {
        var firstName = firstNameInput.value

        firstNameValid = firstName != null && regexName.test(firstName);

        validateFields();
    }

    lastNameInput.onkeyup = function() {
        var lastName = lastNameInput.value

        lastNameValid = lastName != null && regexName.test(lastName);

        validateFields();
    }

    // password
    var passwordValid = false;
    var confirmPasswordValid = false;
    let regexPassword = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,64}$/);
    
    passwordInput.onkeyup = function() {
        var password = passwordInput.value
        
        passwordValid = password != null && regexPassword.test(password);
        
        if (passwordValid && confirmPasswordValid) {
            if (passwordInput.value === confirmPasswordInput.value) {
                error_msg.innerHTML = "";
                passwordsValid = true;
            }
            else {
                error_msg.innerHTML = "Passwords do not match.";
            }
        } else {
            error_msg.innerHTML = "Password must be between 8 to 64 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
        }

        validateFields();
    }

    confirmPasswordInput.onkeyup = function() {
        var confPassword = confirmPasswordInput.value
        
        confirmPasswordValid = confPassword != null && regexPassword.test(confPassword);

        if (passwordValid && confirmPasswordValid) {
            if (passwordInput.value === confirmPasswordInput.value) {
                error_msg.innerHTML = "";
                passwordsValid = true;
            }
            else {
                error_msg.innerHTML = "Passwords do not match.";
            }
        } else {
            error_msg.innerHTML = "Password must be between 8 to 64 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
        }

        validateFields();
    }

    window.recaptchaExpiredCallback = function() {
        submit.disabled = true;
    }
});