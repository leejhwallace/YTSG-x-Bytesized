document.addEventListener("DOMContentLoaded", function () {
    const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    const form = document.getElementById("forgot-password-form");
    const emailInput = document.getElementById("Forgot_pass_email");
    const message = document.getElementById("reset-message");
    const submitBtn = document.getElementById("reset-submit-button");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const email = emailInput.value.trim();

        if (!emailInput.checkValidity()) {
            message.style.color = "#dc3545";
            message.textContent = "Please enter a valid email address.";
            emailInput.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "SENDING...";
        message.textContent = "";

        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                // This forces the email link to point directly to your page 1.75 folder
                redirectTo: 'http://localhost:5500/page%201.75/Password_Reset.html',
            });

            if (error) {
                message.style.color = "#dc3545";
                message.textContent = "Error: " + error.message;
            } else {
                message.style.color = "#28a745";
                message.textContent = "Reset link has been sent to your email!";
                form.reset();
            }
        } catch (err) {
            console.error(err);
            message.style.color = "#dc3545";
            message.textContent = "An unexpected error occurred. Please try again.";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "SIGN UP";
        }
    });
});