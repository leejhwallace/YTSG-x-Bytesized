// 1. Password visibility toggle
document.querySelectorAll('.show-pw').forEach(button => {
    let eyeIcon = button.querySelector('.eye-icon');
    let passwordField = button.closest('.input-group').querySelector('input');
    
    button.addEventListener('click', (e) => {
        e.preventDefault(); 
        if (!passwordField) return;
        if (passwordField.type === 'password') {
            eyeIcon.src = "../images/eye-open.png"; 
            passwordField.type = "text";
        } else {
            eyeIcon.src = "../images/eye-close.png";
            passwordField.type = "password";
        }
    });
});

// 2. Element Selectors (USING STRICT IDs)
const nameInput = document.getElementById('name-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const confirmPasswordInput = document.getElementById('confirm-password-input');
const createAccountButton = document.getElementById('sign-up-button');

// 3. Initialize Supabase client
const supabaseClient = window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

// 4. Sign Up Logic
createAccountButton.addEventListener('click', async () => {
    // Grab the exact text typed into the boxes and trim spaces
    const cleanEmail = emailInput.value.trim();
    const cleanName = nameInput.value.trim();
    const cleanPassword = passwordInput.value;
    const cleanConfirmPassword = confirmPasswordInput.value;

    // Validation
    if (cleanName === "" || cleanEmail === "" || cleanPassword === "" || cleanConfirmPassword === "") {
        alert("Please fill in all fields.");
        return;
    }
    if (cleanPassword !== cleanConfirmPassword) {
        alert("Passwords do not match.");
        return;
    }
    
    if (!supabaseClient) {
        alert("Supabase client could not be initialized.");
        return;
    }

    createAccountButton.disabled = true;
    createAccountButton.textContent = 'Creating...';

    try {
        // Call Supabase directly to sign up the user
        const { data, error } = await supabaseClient.auth.signUp({
            email: cleanEmail,
            password: cleanPassword,
            options: {
                data: {
                    full_name: cleanName,
                }
            }
        });

        if (error) {
            // CHANGED: JSON.stringify forces the hidden object to display as text
            alert('Signup failed: \n' + JSON.stringify(error, null, 2));
            createAccountButton.disabled = false;
            createAccountButton.textContent = 'SIGN UP';
            return;
        }

        alert("Account created successfully! Please log in.");
        window.location.href = '../page1/Get_Started.html';
        
    } catch (err) {
        console.error(err);
        alert('An unexpected error occurred: ' + err.message);
        createAccountButton.disabled = false;
        createAccountButton.textContent = 'SIGN UP';
    }
});