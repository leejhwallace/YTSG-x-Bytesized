document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("forgot-password-form");
    const emailInput = document.getElementById("Forgot_pass_email");
    const message = document.getElementById("reset-message");

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const email = emailInput.value.trim();

        if (!emailInput.checkValidity()) {
            message.textContent = "Please enter a valid email address.";
            emailInput.focus();
            return;
        }

        const subject = encodeURIComponent("Password reset request");
        const body = encodeURIComponent("Click this link to reset your password: https://example.com/reset-password");

        window.location.href = "mailto:" + email + "?subject=" + subject + "&body=" + body;
        message.textContent = "Email draft opened for " + email + ".";
        form.reset();
    });
});