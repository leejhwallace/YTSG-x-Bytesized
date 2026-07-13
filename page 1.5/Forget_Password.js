document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("forgot-password-form");
    const emailInput = document.getElementById("Forgot_pass_email");
    const message = document.getElementById("reset-message");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = emailInput.value.trim();

        if (!emailInput.checkValidity()) {
            message.textContent = "Please enter a valid email address.";
            emailInput.focus();
            return;
        }

        const button = form.querySelector('button');
        button.disabled = true;
        button.textContent = 'Sending…';
        message.textContent = '';

        try {
            const res = await fetch('/api/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                message.textContent = 'Error: ' + (data.error || res.statusText);
            } else {
                // Same message whether or not the email exists (we don't leak
                // which addresses are registered).
                message.textContent = 'If that email exists, a reset link has been sent to ' + email + '.';
            }
        } catch (err) {
            message.textContent = 'Network error: ' + err.message;
        } finally {
            button.disabled = false;
            button.textContent = 'RESET';
            form.reset();
        }
    });
});