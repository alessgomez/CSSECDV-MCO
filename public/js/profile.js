$(document).ready(function() {
    var update = document.getElementById("update");
    var save = document.getElementById("save");
    var change = document.getElementById("changepw");
    var profilePicInput = document.getElementById("inputFile");
    var error_msg = document.getElementById("error");
    var inputFields;
    var currentValues = {};

    const maxFileSize = 3 * 1024 * 1024; 
    const acceptedTypes = ["image/jpeg", "image/png"]

    var firstNameValid = false;
    var lastNameValid = false;
    var emailValid = false;
    var addressValid = false;
    var phoneNumberValid = false;
    var fileUploadValid = false;
    var fileError = false;

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
        let regexName = new RegExp(/^(?!.*[,'-]{2})(?!.* [,'-])(?![,'-])(?=.{1,45}$)[A-Za-z]+(?:[ ,'-][A-Za-z]+)*(?:, [A-Za-z]+)*\.?$/);
        var firstName = inputFields[1].value;
        firstNameValid = firstName != null && regexName.test(firstName);

        var lastName = inputFields[2].value;
        lastNameValid = lastName != null && regexName.test(lastName);

        var email = inputFields[3].value;
        let regexEmail = new RegExp(/^(([_-][A-Za-z0-9]+)|[A-Za-z0-9]+)([_.-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*(\.[A-Za-z]{2,})$/);
        emailValid = email != null && regexEmail.test(email) && email.substr(0, email.indexOf('@')).length <= 64 && email.substr(email.indexOf('@')).length <= 255;

        var address = inputFields[4].value;
        // TODO: add regex for address
        addressValid = address != null && address.length > 0 && address.length <= 255;

        var phoneNumber = inputFields[5].value;
        let regexPhoneNumber = new RegExp(/^(09|\+639)\d{9}$/);
        phoneNumberValid = phoneNumber != null && regexPhoneNumber.test(phoneNumber);

        return firstNameValid && lastNameValid && emailValid && addressValid && phoneNumberValid;
    }

    function displayErrorMessages() {
        error_msg.innerHTML = "";

        if (fileError) {
            error_msg.innerHTML += "Invalid file upload. File size must be less than 3MB.<br>File name can only contain alphanumeric characters, hypen, underscore, or period.<br>";
        }

        if ((inputFields[1].value.length > 0 && !firstNameValid) || (inputFields[2].value.length > 0 && !lastNameValid)) {
            error_msg.innerHTML += "Invalid name.<br>";
        }

        if (inputFields[3].value.length > 0 && !emailValid) {
            error_msg.innerHTML += "Invalid email.<br>";
        }

        if (inputFields[4].value.length > 0 && !addressValid) {
            error_msg.innerHTML += "Invalid address.<br>";
        }
        
        if (inputFields[5].value.length > 0 && !phoneNumberValid) {
            error_msg.innerHTML += "Invalid phone number.<br>";
        }
    }

    function createOnChangeHandler() {
        return async function() {
            error_msg.innerHTML = "";
            fileError = false;

            var fileName = inputFields[0].files[0].name;
            const fileErrorMessage = "Invalid file upload. File size must be less than 3MB.<br>File name can only contain alphanumeric characters, hypen, underscore, or period.<br>";
        
            fileUploadValid = false;
            save.disabled = true;

            if (fileName != null) {
                let regexFileName = new RegExp(/^[A-Za-z0-9]+([-._ ]*[A-Za-z0-9])*\.(jpg|jpeg|png|JPG|JPEG|PNG)$/);
                
                if (regexFileName.test(fileName) && fileName.length <= 255) {                
                    var file = inputFields[0].files[0];
                    let byteStream = await readFile(file); 
                    const uint = new Uint8Array(byteStream);
                    let bytes = [];
                    uint.forEach((byte) => {
                        bytes.push(byte.toString(16));
                    });
                    const hex = bytes.join("").toUpperCase();
                    let mimeType = getMimeType(hex);

                    if (acceptedTypes.includes(mimeType)) {
                        var fileSize = inputFields[0].files[0].size;
                        if (fileSize < maxFileSize) {
                            var image = new Image();

                            image.onload = function() { // Image upload successful
                                fileUploadValid = true;
                                save.disabled = !(validateFields() && fileUploadValid);
                            }
                            image.onerror = function() {
                                console.log("ERROR: Cannot load image")
                            }

                            image.src = URL.createObjectURL(inputFields[0].files[0]);                          
                        } else {
                            fileError = true;
                            error_msg.innerHTML += fileErrorMessage;
                        }
                    } else {
                        fileError = true;
                        error_msg.innerHTML += fileErrorMessage;
                    }
                } else {
                    fileError = true;
                    error_msg.innerHTML += fileErrorMessage;
                }
            }
        }
    }

    function createOnKeyupHandler() {
        return function() {
            var changesMade = false;

            for (i = 1; i < inputFields.length; i++) {
                if (inputFields[i].value != currentValues[inputFields[i].name]) {
                    changesMade = true;
                    break;
                }
            }
            save.disabled = !(validateFields() && changesMade);
            displayErrorMessages();
        };
    }

    update.onclick = function () {
        var p = this.parentNode.parentNode;
        
        error_msg.innerHTML = "";
        document.getElementById("success").innerHTML = "";

        for (var  i = 0; i < p.children.length; i++)
        {
            var child = p.children[i];
            if (child.classList.contains("field"))
            {
                if (child.children[0].innerHTML != "Profile Picture") {
                    var fieldVal = child.children[1];
                    var fieldText = fieldVal.innerHTML;
                    var input = document.createElement("input");

                    if (child.children[0].innerHTML == "Email")
                        input.type = "email";
                    else
                        input.type = "text";

                    input.name = fieldVal.id;
                    input.classList.add(fieldVal.classList, "inputDetails");
                    input.value = fieldText;
                    child.replaceChild(input, fieldVal);
                    currentValues[fieldVal.id] = fieldText;
                } else {
                    child.children[1].classList.add("hide");
                    profilePicInput.classList.remove("hide");
                }
            }
        }

        save.classList.remove("hide");
        update.classList.add("hide");
        inputFields = document.getElementsByClassName("inputDetails");

        for (var i = 0; i < inputFields.length; i++) {
            if (i == 0)
                inputFields[i].onchange = createOnChangeHandler();
            else
                inputFields[i].onkeyup = createOnKeyupHandler();
        }
    }

    change.onclick = function () {
        window.location.assign('/changePassword');
    }
});