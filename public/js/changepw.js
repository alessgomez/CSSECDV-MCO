$(document).ready(function () {
    var update = document.getElementById("update");
    var cancel = document.getElementById("cancel");
    var oldPassword = document.getElementById("oldPsw");
    var newPassword = document.getElementById("newPsw");
    var confNewPassword = document.getElementById("confNewPsw");

    let regexPassword = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,64}$/);

    cancel.onclick = function () {
        window.location.assign('/profile');
    }

    function validatePasswords() {
        return function () {
            console.log("validating passwords")
            var oldPasswordValid = oldPassword.value != null && regexPassword.test(oldPassword.value);
            var newPasswordValid = newPassword.value != null && regexPassword.test(newPassword.value);
            var confNewPasswordValid = confNewPassword.value != null && regexPassword.test(confNewPassword.value);
            var newPasswordsMatch = newPassword.value === confNewPassword.value;
            var newPasswordIsNotOld = newPassword.value !== oldPassword.value;

            update.disabled = !(oldPasswordValid && newPasswordValid && confNewPasswordValid && newPasswordsMatch && newPasswordIsNotOld);
        };
    }

    oldPassword.onkeyup = validatePasswords();
    newPassword.onkeyup = validatePasswords();
    confNewPassword.onkeyup = validatePasswords();
})