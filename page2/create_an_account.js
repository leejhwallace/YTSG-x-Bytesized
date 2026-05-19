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
    let createAccountButton = document.getElementById('create-account-button')
    createAccountButton.onclick = () => {
        if (nameValue.value === "" || emailValue.value === "" || passwordValue.value === "" || confirmPasswordValue.value === "") {
            alert("Please fill in all fields.");
        } else if (passwordValue.value !== confirmPasswordValue.value) {
            alert("Passwords do not match.");
        } else {
            window.location.href = '../page3/Dashboard.html'
        }
    }
})