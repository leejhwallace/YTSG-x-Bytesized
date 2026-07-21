document.addEventListener('DOMContentLoaded', () => {
    const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    // Fetch and display user data
    async function loadUserData() {
        try {
            const { data, error } = await supabase.auth.getUser();
            if (error || !data?.user) {
                window.location.href = '../page1/Get_Started.html';
                return;
            }
            const user = data.user;
            const email = user.email;
            const fullName = user.user_metadata?.full_name || email.split('@')[0];
            
            document.getElementById('displayUsername').textContent = fullName;
            document.getElementById('displayEmail').textContent = email;
            document.getElementById('avatarInitial').textContent = fullName.charAt(0).toUpperCase();
        } catch (err) {
            window.location.href = '../page1/Get_Started.html';
        }
    }

    // Toggle password visibility
    window.togglePw = function(inputId, btn) {
        const input = document.getElementById(inputId);
        const isText = input.type === 'text';
        input.type = isText ? 'password' : 'text';
    };

    // Logout
    window.handleLogout = async function() {
        if (confirm('Are you sure you want to log out?')) {
            try {
                 await supabase.auth.signOut();
            } finally {
                window.location.href = '../page1/Get_Started.html';
            }
        }
    };

    // Save Changes
    window.handleSave = async function() {
        const newUsername = document.getElementById('usernameInput').value.trim();
        const newPw = document.getElementById('newPw').value;
        const rePw = document.getElementById('rePw').value;
        const { data: { user } } = await supabase.auth.getUser();

        // Handle Password Update
        if (newPw) {
            if (newPw !== rePw) { 
                 alert('Passwords do not match'); 
                 return; 
            }
            const { error } = await supabase.auth.updateUser({ password: newPw });
            if (error) { 
                 alert('Password error: ' + error.message); 
                 return; 
            }
        }

        // Handle Username Update
        if (newUsername) {
            // 1. Update Supabase Auth metadata
            const { error: authError } = await supabase.auth.updateUser({ data: { full_name: newUsername } });
            if (authError) {
                alert('Error updating auth username: ' + authError.message);
                return;
            }

            // 2. Update the 'profiles' table directly
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ display_name: newUsername })
                .eq('user_id', user.id);
                
            if (profileError) {
                console.error("Error updating profiles table:", profileError.message);
                alert('Display name updated in Auth, but encountered a database error on the profiles table. Check console.');
                return; 
            }
        }

        // Clear the form fields after a successful save
        document.getElementById('usernameInput').value = '';
        document.getElementById('newPw').value = '';
        document.getElementById('rePw').value = '';
        document.getElementById('curPw').value = '';
        
        alert('Changes saved successfully');
        loadUserData();
    };

    loadUserData();
});