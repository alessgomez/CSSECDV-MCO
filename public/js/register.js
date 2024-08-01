$(document).ready(function(){
    var firstNameInput = document.getElementById("firstname");
    var lastNameInput = document.getElementById("lastname");
    var emailInput = document.getElementById("email");
    var addressInput = document.getElementById("address");
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
    var addressValid = false;
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
        submit.disabled = !(firstNameValid && lastNameValid && emailValid && addressValid && phoneNumberValid && fileUploadValid && passwordsValid);

        error_msg.innerHTML = "";

        if ((firstNameInput.value.length > 0 && !firstNameValid) || (lastNameInput.value.length > 0 && !lastNameValid)) {
            error_msg.innerHTML += "Invalid name.<br>";
        }

        if (emailInput.value.length > 0 && !emailValid) {
            error_msg.innerHTML += "Invalid email.<br>";
        }
        
        if (passwordInput.value.length > 0 && confirmPasswordInput.value.length > 0 && !passwordsValid) {
            error_msg.innerHTML += "Password must be between 8 to 64 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.<br>";
        }

        if (addressInput.value.length > 0 && !addressValid) {
            error_msg.innerHTML += "Invalid address.<br>";
        }

        if (phoneNumberInput.value.length > 0 && !phoneNumberValid) {
            error_msg.innerHTML += "Invalid phone number.<br>";
        }

        if (fileUploadInput.files[0] != null && !fileUploadValid) {
            error_msg.innerHTML += "Invalid file upload. File size must be less than 3MB. File name can only contain alphanumeric characters, hypen, underscore, or period.<br>";
        }
    }

    function getByteLengthBlob(string, encoding = 'utf-8') {
        const blob = new Blob([string], { type: `text/plain;charset=${encoding}` });
        return blob.size;
    }

    emailInput.onkeyup = function() {
        var email = emailInput.value
        let regexEmail = new RegExp(/^(([_-][A-Za-z0-9]+)|[A-Za-z0-9]+)([_.-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*(\.[A-Za-z]{2,})$/)
        const emailLocalLength = getByteLengthBlob(email.substr(0, email.indexOf('@')));
        const emailDomainLength = getByteLengthBlob(email.substr(email.indexOf('@')));

        emailValid = email != null && regexEmail.test(email) && emailLocalLength <= 64 && emailDomainLength <= 255;

        validateFields();
    }

    addressInput.onkeyup = function() {
        var address = addressInput.value
        let regexAddress = new RegExp(/^([0-9a-zA-Z ,.#-]+),\s*([0-9a-zA-Z ,.#-]+),\s*([0-9a-zA-Z ,.#-]+),\s*([0-9]{4})$/)
        
        addressValid = address != null && regexAddress.test(address) && address.length <= 160;

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
            let regexFileName = new RegExp(/^[A-Za-z0-9]+([-._ ]*[A-Za-z0-9])*\.(jpg|jpeg|png|JPG|JPEG|PNG)$/);
            
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

        firstNameValid = firstName != null && regexName.test(firstName) && firstName.length <= 50;

        validateFields();
    }

    lastNameInput.onkeyup = function() {
        var lastName = lastNameInput.value

        lastNameValid = lastName != null && regexName.test(lastName) && lastName.length <= 50;

        validateFields();
    }

    // password
    var passwordValid = false;
    var confirmPasswordValid = false;
    let regexPassword = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,64}$/);
    
    passwordInput.onkeyup = function() {
        var password = passwordInput.value
        
        passwordValid = password != null && regexPassword.test(password);
        
        passwordsValid = passwordValid && confirmPasswordValid && passwordInput.value === confirmPasswordInput.value

        validateFields();
    }

    confirmPasswordInput.onkeyup = function() {
        var confPassword = confirmPasswordInput.value
        
        confirmPasswordValid = confPassword != null && regexPassword.test(confPassword);

        passwordsValid = passwordValid && confirmPasswordValid && passwordInput.value === confirmPasswordInput.value

        validateFields();
    }

    window.recaptchaExpiredCallback = function() {
        submit.disabled = true;
    }
});