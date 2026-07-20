document.addEventListener("DOMContentLoaded", function () {
    const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    const form = document.getElementById("reset-password-form");
    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const statusMessage = document.getElementById("status-message");
    const submitBtn = document.getElementById("submit-button");

    window.togglePw = function(inputId, btn) {
        const input = document.getElementById(inputId);
        const eyeIcon = btn.querySelector('.custom-eye-icon');
        if (input.type === 'password') {
            input.type = 'text';
            eyeIcon.classList.add('visible');
        } else {
            input.type = 'password';
            eyeIcon.classList.remove('visible');
        }
    };

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (newPassword !== confirmPassword) {
            statusMessage.style.color = "#cf512a";
            statusMessage.textContent = "Passwords do not match.";
            return;
        }

        if (newPassword.length < 6) {
            statusMessage.style.color = "#cf512a";
            statusMessage.textContent = "Password must be at least 6 characters.";
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "CHANGING...";
        statusMessage.textContent = "";

        try {
            // Supabase automatically consumes the token in the URL hash to authenticate this request
            const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

            if (error) {
                statusMessage.style.color = "#cf512a";
                statusMessage.textContent = "Error: " + error.message;
            } else {
                statusMessage.style.color = "#28a745";
                statusMessage.textContent = "Password changed successfully! Redirecting...";
                
                setTimeout(() => {
                    window.location.href = '../page1/Get_Started.html';
                }, 2000);
            }
        } catch (err) {
            console.error(err);
            statusMessage.style.color = "#cf512a";
            statusMessage.textContent = "An unexpected network fault occurred.";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "CHANGE PASSWORD";
        }
    });
});