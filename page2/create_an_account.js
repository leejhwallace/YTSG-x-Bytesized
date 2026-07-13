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

    createAccountButton.onclick = async () => {
        if (nameValue.value === "" || emailValue.value === "" || passwordValue.value === "" || confirmPasswordValue.value === "") {
            alert("Please fill in all fields.");
            return
        }
        if (passwordValue.value !== confirmPasswordValue.value) {
            alert("Passwords do not match.");
            return
        }

        createAccountButton.disabled = true
        createAccountButton.textContent = 'Creating...'

        try {
            // Call backend signup endpoint
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: nameValue.value,
                    email: emailValue.value,
                    password: passwordValue.value
                })
            })

            const data = await response.json()

            if (!response.ok) {
                alert('Signup failed: ' + data.error)
                createAccountButton.disabled = false
                createAccountButton.textContent = 'SIGN UP'
                return
            }

            // On success, redirect to dashboard
            window.location.href = '../page3/Dashboard.html'
        } catch (err) {
            console.error(err)
            alert('Signup failed: ' + err.message)
            createAccountButton.disabled = false
            createAccountButton.textContent = 'SIGN UP'
        }
    }
})