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
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_KzdZhuiEyoG6GEVEggJVug_1VtHc6mz";
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const page5Tables = {
    projects: 'data_projects',
    projectTasks: 'data_project_tasks',
    events: 'data_events',
    feedback: 'data_event_feedback',
    demographics: 'data_event_demographics',
    reach: 'data_event_reach',
    volunteerHours: 'data_volunteer_hours',
};

const isMissingTableError = (error) => error?.code === 'PGRST205' || /Could not find the table/i.test(error?.message || '');

// Page 5 analytics data. The required tables are defined in supabase/page5_schema.sql.
app.get('/api/data', async (_req, res) => {
    try {
        const queries = [
            supabaseClient.from(page5Tables.projects).select('*').order('created_at', { ascending: false }),
            supabaseClient.from(page5Tables.projectTasks).select('*').order('completed_at', { ascending: false, nullsFirst: false }),
            supabaseClient.from(page5Tables.events).select('*').order('event_date', { ascending: false }),
            supabaseClient.from(page5Tables.feedback).select('*'),
            supabaseClient.from(page5Tables.demographics).select('*'),
            supabaseClient.from(page5Tables.reach).select('*'),
            supabaseClient.from(page5Tables.volunteerHours).select('*'),
        ];
        const results = await Promise.all(queries);
        const failed = results.find((result) => result.error);

        if (failed) {
            const status = isMissingTableError(failed.error) ? 503 : 500;
            const error = status === 503
                ? 'Page 5 database tables are not set up. Run supabase/page5_schema.sql in the Supabase SQL Editor.'
                : failed.error.message;
            return res.status(status).json({ error });
        }

        const [projects, projectTasks, events, feedback, demographics, reach, volunteerHours] = results.map((result) => result.data || []);
        res.json({ projects, projectTasks, events, feedback, demographics, reach, volunteerHours });
    } catch (error) {
        console.error('Unable to load Page 5 data', error);
        res.status(500).json({ error: 'Unable to load Page 5 data.' });
    }
});

app.patch('/api/data/projects/:id', async (req, res) => {
    const { totalMinutes, delayReason } = req.body || {};
    const updates = {};

    if (totalMinutes !== undefined) {
        const parsedMinutes = Number(totalMinutes);
        if (!Number.isInteger(parsedMinutes) || parsedMinutes < 0) {
            return res.status(400).json({ error: 'Total time must be a whole number of minutes.' });
        }
        updates.manual_total_minutes = parsedMinutes;
    }
    if (delayReason !== undefined) {
        if (typeof delayReason !== 'string' || delayReason.length > 2000) {
            return res.status(400).json({ error: 'Delay reason must be text of 2,000 characters or fewer.' });
        }
        updates.delay_reason = delayReason.trim() || null;
    }
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No changes were provided.' });
    }

    const { data, error } = await supabaseClient
        .from(page5Tables.projects)
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .maybeSingle();

    if (error) {
        const status = isMissingTableError(error) ? 503 : 500;
        return res.status(status).json({ error: status === 503 ? 'Page 5 database tables are not set up.' : error.message });
    }
    if (!data) {
        return res.status(404).json({ error: 'Project not found.' });
    }
    res.json({ project: data });
});

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