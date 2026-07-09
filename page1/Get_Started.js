document.addEventListener('DOMContentLoaded', () => {
    let showPwButton = document.getElementById('show-pw')
    let eyeIcon = document.getElementById('eye-icon')
    let passwordField = document.getElementsByClassName('password-text')[0]
    showPwButton.onclick = () => {
        if (passwordField.type === 'password') {
            eyeIcon.src = "../images/eye-open.png"
            passwordField.type = "text"
        } else {
            eyeIcon.src = "../images/eye-close.png"
            passwordField.type = "password"
        }
    }

    let emailValue = document.getElementsByClassName('email-text')[0]
    let passwordValue = document.getElementsByClassName('password-text')[0]
    let signInButton = document.getElementById('sign-in-button')

    // Initialize Supabase client
    const supabaseClient = window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY
        ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
        : null

    signInButton.onclick = async () => {
        if (emailValue.value === "" || passwordValue.value === "") {
            alert("Please fill in all fields.");
            return
        }

        if (!supabaseClient) {
            alert('Supabase is not configured. Set `window.SUPABASE_URL` and `window.SUPABASE_ANON_KEY` in the HTML.');
            return
        }

        signInButton.disabled = true
        signInButton.textContent = 'Signing in...'

        try {
            // Fetch user by email from the database
            const { data: users, error: fetchError } = await supabaseClient
                .from('user-log-in-info')
                .select('*')
                .eq('email', emailValue.value)

            if (fetchError || !users || users.length === 0) {
                alert('Invalid email or password.');
                signInButton.disabled = false
                signInButton.textContent = 'SIGN IN'
                return
            }

            const user = users[0]

            // Compare hashed password using bcryptjs
            const passwordMatch = await dcodeIO.bcrypt.compare(passwordValue.value, user.password)

            if (!passwordMatch) {
                alert('Invalid email or password.');
                signInButton.disabled = false
                signInButton.textContent = 'SIGN IN'
                return
            }

            // Password matches, redirect to dashboard
            window.location.href = '../page3/Dashboard.html'
        } catch (err) {
            console.error(err)
            alert('Sign in failed: ' + (err.message || JSON.stringify(err)))
            signInButton.disabled = false
            signInButton.textContent = 'SIGN IN'
        }
    }
})