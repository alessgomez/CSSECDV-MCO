$(document).ready(function(){
    var changeForInput = document.getElementById("codInput");
    var noteInput = document.getElementById('floatingTextarea2');
    var placeOrderBtn = document.getElementById('placeorder');
    var error_msg = document.getElementById("error");

    var changeForValid = false;
    var noteValid = false;

    const MAX_LENGTH = 50; 

    function whiteListValidation(text) {
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

    $("#bag-icon").off();

    function validateFields() {
        if (noteInput.value.length === 0) 
            noteValid = true;

        placeOrderBtn.disabled = !(noteValid && changeForValid);

        error_msg.innerHTML = "";

        if(noteInput.value.length > 0 && !noteValid) {
            error_msg.innerHTML += "Invalid note.<br>";
        }

        if(changeForInput.value.length > 0 && !changeForValid) {
            error_msg.innerHTML += "Invalid change for value.<br>";
        }
    }

    noteInput.onkeyup = function() {
        var note = noteInput.value;
        var normalizedNote = note.normalize('NFKC');

        if(normalizedNote.length <= MAX_LENGTH) {       
            // white list 
            noteValid = whiteListValidation(normalizedNote);
            if (noteValid)
                noteInput.value = normalizedNote;
        } else {
            noteValid = false;
        }

        validateFields(); 
    };

    changeForInput.onkeyup = function() {
        var changeForVal = $(this).val();

        $.get('/getBagTotal', {}, function(response) {
            if (response.success) {
                changeForVal = parseFloat(changeForVal);
                curTotalVal = parseFloat(response.total.total);

                changeForValid = !isNaN(changeForVal) && !isNaN(curTotalVal) && curTotalVal > 0 && changeForVal >= curTotalVal //if change for value is valid

                validateFields(); 
            } else {
                changeForValid = false;
            }
        })
    };
});