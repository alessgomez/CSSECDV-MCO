var email, pw, submit

$(document).ready(function(){
    var email = document.getElementById("email");
    var pw = document.getElementById("psw");
    var submit = document.getElementById("signin-submit");

    function isRecaptchaCompleted() {
        return grecaptcha && grecaptcha.getResponse().trim() !== '';
    }

    function areEmailAndPasswordValid() {
        return email.value.length !== 0 && pw.value.length !== 0;
    }

    window.toggleSubmitButton = function() {
        submit.disabled = !(areEmailAndPasswordValid() && isRecaptchaCompleted());
    };

    // Function to be called when reCAPTCHA token expires
    window.recaptchaExpiredCallback = function() {
        submit.disabled = true;
    };
});