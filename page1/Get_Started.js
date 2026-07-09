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

        signInButton.disabled = true
        signInButton.textContent = 'Signing in...'

        try {
            // Call backend login endpoint
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailValue.value,
                    password: passwordValue.value
                })
            })

            const data = await response.json()

            if (!response.ok) {
                alert(data.error)
                signInButton.disabled = false
                signInButton.textContent = 'SIGN IN'
                return
            }

            // Login successful, redirect to dashboard
            window.location.href = '../page3/Dashboard.html'
        } catch (err) {
            console.error(err)
            alert('Sign in failed: ' + err.message)
            signInButton.disabled = false
            signInButton.textContent = 'SIGN IN'
        }
    }
})