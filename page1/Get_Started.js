// 1. Password visibility toggle
let showPwButton = document.getElementById('show-pw');
let eyeIcon = document.getElementById('eye-icon');
const loginPasswordInput = document.getElementById('login-password-input');

showPwButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (!loginPasswordInput) return;

    if (loginPasswordInput.type === 'password') {
        eyeIcon.src = "../images/eye-open.png";
        loginPasswordInput.type = "text";
    } else {
        eyeIcon.src = "../images/eye-close.png";
        loginPasswordInput.type = "password";
    }
});

// 2. Element Selectors (USING STRICT IDs)
const loginEmailInput = document.getElementById('login-email-input');
const signInButton = document.getElementById('sign-in-button');

// 3. Initialize Supabase client
const supabaseClient = window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

// 4. Sign In Logic
signInButton.addEventListener('click', async () => {
    const cleanEmail = loginEmailInput.value.trim();
    const cleanPassword = loginPasswordInput.value;

    // Validation
    if (cleanEmail === "" || cleanPassword === "") {
        alert("Please fill in all fields.");
        return;
    }

    if (!supabaseClient) {
        alert("Supabase client could not be initialized.");
        return;
    }

    signInButton.disabled = true;
    signInButton.textContent = 'Signing in...';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword
        });

        if (error) {
            // CHANGED: JSON.stringify forces the hidden object to display as text
            alert('Sign in failed: \n' + JSON.stringify(error, null, 2));
            signInButton.disabled = false;
            signInButton.textContent = 'SIGN IN';
            return;
        }

        window.location.href = '../page3/Dashboard.html';
        
    } catch (err) {
        console.error(err);
        alert('An unexpected error occurred: ' + err.message);
        signInButton.disabled = false;
        signInButton.textContent = 'SIGN IN';
    }
});