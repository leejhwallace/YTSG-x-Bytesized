const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { buildAuthRouter } = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;
// IMPORTANT: backend code MUST use the service_role key, not the publishable key.
// The publishable key is bound by RLS, which is what was causing /api/signup to
// create the auth user but silently fail to insert into user-log-in-info.
// service_role bypasses RLS and is safe to keep server-side because it never
// reaches the browser. Find it under:
//   Supabase Dashboard -> Project Settings -> API -> service_role secret
// Set it in a .env file as SUPABASE_SERVICE_ROLE_KEY=<value>.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://txfditoxxdjigplckjcc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_KzdZhuiEyoG6GEVEggJVug_1VtHc6mz'; // dev fallback only
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize Supabase client for server-side use.
// Prefer the service_role key from env so database writes are not blocked by
// RLS. If it is unset we fall back to the publishable key (dev convenience),
// but log a strong warning — signup will still fail in that mode.
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
        '[server] SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to the publishable key.\n' +
        '         /api/signup inserts will be blocked by RLS. Set SUPABASE_SERVICE_ROLE_KEY in your .env file.'
    );
}

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

// Mount auth endpoints under /api; see routes.js for handler definitions.
app.use('/api', buildAuthRouter({
    supabaseClient,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
}));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
