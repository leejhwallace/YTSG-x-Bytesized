const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "https://txfditoxxdjigplckjcc.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4ZmRpdG94eGRqaWdwbGNramNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc1MTkyMjYsImV4cCI6MjAzMzA5OTIyNn0.rKfmfJOXnN-EKJnZhJ9HfKk_BbNqXhP7d0P1eJJqVmE";
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Signup endpoint
app.post('/api/signup', async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        // Validate input
        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Sign up user with Supabase Auth
        const { data: signData, error: signError } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (signError) {
            return res.status(400).json({ error: signError.message });
        }

        // Insert user profile into database
        const userId = signData.user ? signData.user.id : null;
        if (userId) {
            const { data: insertData, error: insertError } = await supabaseClient
                .from('user-log-in-info')
                .insert([{
                    id: userId,
                    full_name: full_name,
                    email: email,
                    password: hashedPassword
                }]);

            if (insertError) {
                return res.status(400).json({ error: 'Failed to create user profile: ' + insertError.message });
            }
        }

        res.status(200).json({ message: 'Signup successful', userId: userId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }

        // Fetch user by email from database
        const { data: users, error: fetchError } = await supabaseClient
            .from('user-log-in-info')
            .select('*')
            .eq('email', email);

        if (fetchError || !users || users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        // Compare password with hashed password
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.status(200).json({
            message: 'Login successful',
            userId: user.id,
            email: user.email,
            full_name: user.full_name
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
