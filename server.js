import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import * as cfAdapter from '@as-integrations/cloudflare-workers';
import bcrypt from 'bcryptjs';



const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase dynamically using safe Cloudflare Runtime Context
const getSupabaseClient = (env) => {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
};

// Signup endpoint
app.post('/api/signup', async (req, res) => {
    try {
        const { full_name, email, password } = req.body;
        const supabaseClient = getSupabaseClient(req.cloudflare.env);

        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { data: signData, error: signError } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (signError) {
            return res.status(400).json({ error: signError.message });
        }

        const userId = signData.user ? signData.user.id : null;
        if (userId) {
            const { error: insertError } = await supabaseClient
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
        const supabaseClient = getSupabaseClient(req.cloudflare.env);

        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }

        const { data: users, error: fetchError } = await supabaseClient
            .from('user-log-in-info')
            .select('*')
            .eq('email', email);

        if (fetchError || !users || users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];
        const passwordMatch = await bcrypt.verify(password, user.password);

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


export default {
    fetch: cloudflareWorkersAdapter(app)
};



export default {
    fetch: cfAdapter.cloudflareWorkersAdapter(app)
};
