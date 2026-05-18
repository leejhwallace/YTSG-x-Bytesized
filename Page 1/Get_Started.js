document.addEventListener('DOMContentLoaded', () => {
    let showPwButton = document.getElementById('show-pw')
    let eyeIcon = document.getElementById('eye-icon')
    let passwordField = document.getElementsByClassName('password-text')[0]
    showPwButton.onclick = () => {
        if (passwordField.type === 'password') {
            eyeIcon.src = "./images/eye-open.png"
            passwordField.type = "text"
        } else {
            eyeIcon.src = "./images/eye-close.png"
            passwordField.type = "password"
        }
    }

    let emailValue = document.getElementsByClassName('email-text')[0]
    let passwordValue = document.getElementsByClassName('password-text')[0]
    let signInButton = document.getElementById('sign-in-button')

    signInButton.onclick = () => {
        if (emailValue.value === "" || passwordValue.value === "") {
            alert("Please fill in all fields.");
        } else {
            window.location.href = './Page 3/Dashboard.html'
        }
    }
})