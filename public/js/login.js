var email, pw, submit

$(document).ready(function(){
    var email = document.getElementById("email");
    var pw = document.getElementById("psw");
    var submit = document.getElementById("signin-submit");

    function isRecaptchaCompleted() {
        return grecaptcha && grecaptcha.getResponse().trim() !== '';
    }

    function areEmailAndPasswordValid() {
        return email.value.length !== 0 && validatePW(pw.value);
    }

    window.toggleSubmitButton = function() {
        submit.disabled = !(areEmailAndPasswordValid() && isRecaptchaCompleted());
    };

    // Function to be called when reCAPTCHA token expires
    window.recaptchaExpiredCallback = function() {
        submit.disabled = true;
    };

    // Keyup event listeners for email and password inputs
    email.onkeyup = toggleSubmitButton;
    pw.onkeyup = toggleSubmitButton;

    function validatePW (pw) {
        var uppercaseLetters = /[A-Z]/g;
        var specialChars = /\W|_/g;
        var numbers = /[0-9]/g;
        
        return pw.match(uppercaseLetters) && pw.match(specialChars) && pw.match(numbers) && pw.length >= 8;
    }
});