document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.show-pw').forEach(button => {
        let eyeIcon = button.querySelector('.eye-icon')
        let passwordField = button.closest('.input-group').querySelector('input[type="password"]')
        button.addEventListener('click', () => {
            if (!passwordField) return
            if (passwordField.type === 'password') {
                eyeIcon.src = "../images/eye-open.png"
                passwordField.type = "text"
            } else {
                eyeIcon.src = "../images/eye-close.png"
                passwordField.type = "password"
            }
        })
    })

    let nameValue = document.getElementsByClassName('name-text')[0]
    let emailValue = document.getElementsByClassName('email-text')[0]
    let passwordValue = document.getElementsByClassName('password-text')[0]
    let confirmPasswordValue = document.getElementsByClassName('confirm-password-text')[0]
    let createAccountButton = document.getElementById('sign-up-button')

    // initialize Supabase client (uses the UMD bundle loaded in the HTML)
    const supabaseClient = window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY
        ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
        : null

    createAccountButton.onclick = async () => {
        if (nameValue.value === "" || emailValue.value === "" || passwordValue.value === "" || confirmPasswordValue.value === "") {
            alert("Please fill in all fields.");
            return
        }
        if (passwordValue.value !== confirmPasswordValue.value) {
            alert("Passwords do not match.");
            return
        }

        if (!supabaseClient) {
            alert('Supabase is not configured. Set `window.SUPABASE_URL` and `window.SUPABASE_ANON_KEY` in the HTML.');
            return
        }

        createAccountButton.disabled = true
        createAccountButton.textContent = 'Creating...'

        try {
            // Sign up the user with Supabase Auth
            const { data: signData, error: signError } = await supabaseClient.auth.signUp({
                email: emailValue.value,
                password: passwordValue.value
            })
            console.log('SignUp response:', signData, signError)
            if (signError) throw signError

            // Insert a profile row into the users table, including password as a temporary fix
            // NOTE: this is insecure; do not keep raw passwords in your table long-term.
            const userId = signData.user ? signData.user.id : null
            if (userId) {
                const { data: insertData, error: insertError } = await supabaseClient.from('user-log-in-info').insert([{ id: userId, full_name: nameValue.value, email: emailValue.value, password: passwordValue.value }])
                console.log('Profile insert response:', insertData, insertError)
                if (insertError) {
                    console.error('Profile insert failed:', insertError)
                    alert('Account created, but profile insert failed. Check console for details.')
                    createAccountButton.disabled = false
                    createAccountButton.textContent = 'SIGN UP'
                    return
                }
            }

            // On success, redirect to dashboard (or show confirmation)
            window.location.href = '../page3/Dashboard.html'
        } catch (err) {
            console.error(err)
            alert('Signup failed: ' + (err.message || JSON.stringify(err)))
            createAccountButton.disabled = false
            createAccountButton.textContent = 'SIGN UP'
        }
    }
})