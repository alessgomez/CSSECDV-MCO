$(document).ready(function(){
    var subjectInput = document.getElementById("subject");
    var messageInput = document.getElementById("message");
    var submiBtn = document.getElementById("contact-submit");
    var error_msg = document.getElementById("contact-error");

    var subjectValid = false;
    var messageValid = false;

    const MAX_LENGTH_SUBJECT = 50; 
    const MAX_LENGTH_MESSAGE = 500; 

    function validateFields() {
        submiBtn.disabled = !(subjectValid && messageValid);

        error_msg.innerHTML = "";

        if (subjectInput.value.length > 0 && !subjectValid) {
            error_msg.innerHTML += "Invalid subject.<br>"
        } 

        if (messageInput.value.length > 0 && !messageValid) {
            error_msg.innerHTML += "Invalid mesage.<br>"
        } 
    }

    function whiteListValidation(text) { // TODO: double check if correct 
        const unicodeCategories = {
            lowercase: /\p{Ll}/u,  // Lowercase letters
            uppercase: /\p{Lu}/u,  // Uppercase letters
            digit: /\p{Nd}/u,      // Decimal digits
            symbol: /\p{Po}/u,     // Other punctuation
            punctuation: /\p{Zs}/u // Space separator 
        };
        
        for (let char of text) {
            let isValid = false;
            for(let category in unicodeCategories) {
                if (unicodeCategories[category].test(char)) {
                    isValid = true;
                    break;
                }
            }

            if (!isValid) {
                return false;
            }
        }
        return true;
    }

    subjectInput.onkeyup = function() {
        var subject = subjectInput.value;
        var normalizedSubject = subject.normalize('NFKC');
        
        if (normalizedSubject.length > 0 && normalizedSubject.length <= MAX_LENGTH_SUBJECT) {
            subjectValid = whiteListValidation(normalizedSubject);
            if(subjectValid) {
                subjectInput.value = normalizedSubject;
            } 
        } else {
            subjectValid = false;
        }
        validateFields();
    };

    messageInput.onkeyup = function() {
        var message = messageInput.value;
        var normalizedMessage = message.normalize('NFKC');
        
        if (normalizedMessage.length > 0 && normalizedMessage.length <= MAX_LENGTH_MESSAGE) {
            messageValid = whiteListValidation(normalizedMessage);
            if(messageValid) {
                messageInput.value = normalizedMessage;
            } 
        } else {
            messageValid = false;
        }

        validateFields();
    }

    submiBtn.addEventListener('click', function(){
        $.post("/addfeedback", {subject: subjectInput.value, message: messageInput.value}, function(response){
            if (response.success){
                subjectInput.value = "";
                messageInput.value = "";
                error_msg.innerHTML = ""; // Clear the contents of the error message container
                error_msg.style.display = "none"; // Optionally hide the error message container
            } else {
                error_msg.innerHTML = "An error occured.";        
            }
        })        
    })
})
