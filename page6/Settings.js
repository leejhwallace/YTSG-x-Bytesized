// ── State ──
let currentUsername = 'Username';
let currentEmail = 'Username@gmail.com';

function updateAvatar(name) {
    document.getElementById('avatarInitial').textContent = name.charAt(0).toUpperCase();
}

// ── Toggle password visibility ──
function togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.querySelector('svg').innerHTML = isText
        ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
        : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>`
          + `<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>`
          + `<line x1="1" y1="1" x2="23" y2="23"/>`;
}

// ── Validation ──
function clearErrors() {
    ['usernameWrap', 'curPwWrap', 'newPwWrap', 'rePwWrap'].forEach(id => {
        document.getElementById(id)?.classList.remove('error');
    });
    document.getElementById('usernameError').style.display = 'none';
    document.getElementById('pwError').style.display = 'none';
}

function showToast(msg, duration = 2200) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
}

// ── Save ──
function handleSave() {
    clearErrors();
    let valid = true;

    const newUsername = document.getElementById('usernameInput').value.trim();
    const curPw = document.getElementById('curPw').value;
    const newPw = document.getElementById('newPw').value;
    const rePw  = document.getElementById('rePw').value;

    // Nothing to save
    if (newUsername === '' && !curPw && !newPw && !rePw) {
        showToast('Nothing to save');
        return;
    }

    // Validate username
    if (newUsername !== '' && newUsername.length < 3) {
        document.getElementById('usernameWrap').classList.add('error');
        const err = document.getElementById('usernameError');
        err.textContent = 'Username must be at least 3 characters';
        err.style.display = 'block';
        valid = false;
    }

    // Validate password fields if any are filled
    if (curPw || newPw || rePw) {
        if (!curPw) {
            document.getElementById('curPwWrap').classList.add('error');
            valid = false;
        }
        if (!newPw) {
            document.getElementById('newPwWrap').classList.add('error');
            valid = false;
        }
        if (newPw && newPw.length < 6) {
            document.getElementById('newPwWrap').classList.add('error');
            const err = document.getElementById('pwError');
            err.textContent = 'Password must be at least 6 characters';
            err.style.display = 'block';
            valid = false;
        }
        if (newPw !== rePw) {
            document.getElementById('rePwWrap').classList.add('error');
            const err = document.getElementById('pwError');
            err.textContent = 'Passwords do not match';
            err.style.display = 'block';
            valid = false;
        }
    }

    if (!valid) return;

    // Apply username change
    if (newUsername) {
        currentUsername = newUsername;
        document.getElementById('displayUsername').textContent = currentUsername;
        updateAvatar(currentUsername);
        document.getElementById('usernameInput').value = '';
    }

    // Clear password fields
    ['curPw', 'newPw', 'rePw'].forEach(id => document.getElementById(id).value = '');

    showToast('✓ Changes saved');
}

// ── Log out ──
function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        window.location.href = '../page1/index.html'
    }
}

// ── Init ──
updateAvatar(currentUsername);