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
})