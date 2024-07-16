$(document).ready(function() {
    var update = document.getElementById("update");
    var save = document.getElementById("save");
    var change = document.getElementById("changepw");
    var profilePicInput = document.getElementById("inputFile");
    var error_msg = document.getElementById("error");
    var inputFields;
    var currentValues = {};

    var firstNameValid = false;
    var lastNameValid = false;
    var emailValid = false;
    var phoneNumberValid = false;

    // TODO: input validation for profile pic

    function validateFields() {
        let regexName = new RegExp(/^(?!.*[,'-]{2})(?!.* [,'-])(?![,'-])(?=.{1,45}$)[A-Za-z]+(?:[ ,'-][A-Za-z]+)*(?:, [A-Za-z]+)*\.?$/);
        var firstName = inputFields[1].value
        firstNameValid = firstName != null && regexName.test(firstName);

        var lastName = inputFields[2].value
        lastNameValid = lastName != null && regexName.test(lastName);

        var email = inputFields[3].value
        let regexEmail = new RegExp(/^(([_-][A-Za-z0-9]+)|[A-Za-z0-9]+)([_.-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*(\.[A-Za-z]{2,})$/)
        emailValid = email != null && regexEmail.test(email) && email.substr(0, email.indexOf('@')).length <= 64 && email.substr(email.indexOf('@')).length <= 255;

        var phoneNumber = inputFields[4].value
        let regexPhoneNumber = new RegExp(/^(09|\+639)\d{9}$/)
        phoneNumberValid = phoneNumber != null && regexPhoneNumber.test(phoneNumber);

        return firstNameValid && lastNameValid && emailValid && phoneNumberValid;
    }

    function displayErrorMessages() {
        error_msg.innerHTML = "";

        if ((inputFields[1].value.length > 0 && !firstNameValid) || (inputFields[2].value.length > 0 && !lastNameValid)) {
            error_msg.innerHTML += "Invalid name.<br>";
        }

        if (inputFields[3].value.length > 0 && !emailValid) {
            error_msg.innerHTML += "Invalid email.<br>";
        }
        
        if (inputFields[4].value.length > 0 && !phoneNumberValid) {
            error_msg.innerHTML += "Invalid phone number.<br>";
        }
    }

    function createOnChangeHandler() {
        return function() {
            save.disabled = false;
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
            console.log(changesMade);
            console.log(validateFields());
            save.disabled = !(changesMade && validateFields());
            displayErrorMessages();
        };
    }

    update.onclick = function () {
        var p = this.parentNode.parentNode;
        
        error_msg.innerHTML = "";
        
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
        //window.location.assign('/changepw');
    }
});