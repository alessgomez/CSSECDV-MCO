$(document).ready(function() {
    var update = document.getElementById("update");
    var save = document.getElementById("save");
    var change = document.getElementById("changepw");
    var profilePicInput = document.getElementById("inputFile");
    var inputFields;
    var currentValues = {};

    // TODO: input validation for all fields

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
                }
            }
            save.disabled = !changesMade;
        };
    }

    update.onclick = function () {
        var p = this.parentNode.parentNode;
        
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