const express = require('express');
const { getMailer } = require('./lib/mailgun');

// ----------------------------------------------------------------------------
// Recommended schema for the `user-log-in-info` table (run once in the
// Supabase SQL editor). Service-role bypasses the policies below, so they
// only matter if the publishable key is ever used directly against this
// table — in that case they default-deny.
// ----------------------------------------------------------------------------
// create table public."user-log-in-info" (
//   id          uuid primary key references auth.users(id) on delete cascade,
//   full_name   text not null,
//   email       text not null unique,
//   language    text not null default 'en',
//   created_at  timestamptz not null default now(),
//   updated_at  timestamptz not null default now()
// );
//
// -- IMPORTANT: do NOT add a password column. Supabase's auth.users
// -- .encrypted_password is already the canonical credential store.
// -- Duplicating it here would let a leaked row be cracked offline.
//
// alter table "user-log-in-info" enable row level security;
//
// create policy "Users read own profile"
//   on "user-log-in-info" for select
//   to authenticated
//   using ((select auth.uid()) = id);
//
// create policy "Users update own profile"
//   on "user-log-in-info" for update
//   to authenticated
//   using ((select auth.uid()) = id)
//   with check ((select auth.uid()) = id);
//
// create policy "Block anon from direct table access"
//   on "user-log-in-info" for all
//   to anon
//   using (false)
//   with check (false);
// ----------------------------------------------------------------------------

/**
 * Build the auth router. The Supabase client (and a flag indicating whether
 * the service-role key is in use) come from server.js so this module stays
 * agnostic about credential sources. Mailgun is initialized lazily inside
 * lib/mailgun.js — no factory dependency needed there.
 */
function buildAuthRouter({ supabaseClient, hasServiceRole }) {
    const router = express.Router();

    // Signup endpoint
    router.post('/signup', async (req, res) => {
        try {
            if (!hasServiceRole) {
                return res.status(500).json({ error: 'Supabase is not configured. Set SUPABASE_SERVICE_ROLE_KEY in your .env file.' });
            }

            const { full_name, email, password } = req.body;

            // Validate input
            if (!full_name || !email || !password) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Lightly sanitize the display name; length cap matches the column we'll
            // store it in. Real validation belongs in a schema layer, but trimming
            // here protects against leading/trailing whitespace typos and very long
            // payloads.
            const sanitizedFullName = String(full_name).trim().slice(0, 100);

            // Create the auth user. Supabase Auth owns the password hash from here
            // on (auth.users.encrypted_password) — we never duplicate it. The
            // service_role bypasses RLS and skips auth-side rate limits; that is the
            // trade-off for routing signup through this server instead of the
            // browser SDK.
            //
            // We intentionally do NOT pass `options.data` here: that would write
            // full_name into auth.users.raw_user_meta_data, duplicating the row we
            // already keep in user-log-in-info. user-log-in-info is the canonical
            // profile store; Supabase Auth is the canonical credential store.
            const { data: signData, error: signError } = await supabaseClient.auth.signUp({
                email: email,
                password: password
            });

            if (signError) {
                return res.status(400).json({ error: signError.message });
            }

            // If "Confirm email" is enabled (default), auth.signUp returns a user
            // shell with id === null until the user clicks the email link. Fail
            // loudly instead of silently dropping the profile insert.
            const userId = signData.user ? signData.user.id : null;
            if (!userId) {
                return res.status(400).json({
                    error: 'Email confirmation required. Disable Confirm Email in the Supabase dashboard for dev, or check your inbox.'
                });
            }

            // Insert the profile row (id + display name + email only).
            const { error: insertError } = await supabaseClient
                .from('user-log-in-info')
                .insert([{
                    id: userId,
                    full_name: sanitizedFullName,
                    email: email,
                    language: 'en'
                }]);

            if (insertError) {
                return res.status(400).json({ error: 'Failed to create user profile: ' + insertError.message });
            }

            res.status(200).json({ message: 'Signup successful', userId: userId });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error: ' + err.message });
        }
    });

    // Login endpoint
    router.post('/login', async (req, res) => {
        try {
            if (!hasServiceRole) {
                return res.status(500).json({ error: 'Supabase is not configured. Set SUPABASE_SERVICE_ROLE_KEY in your .env file.' });
            }

            const { email, password } = req.body;

            // Validate input
            if (!email || !password) {
                return res.status(400).json({ error: 'Missing email or password' });
            }

            // Let Supabase Auth own the password check, the bcrypt compare, and the
            // session JWT/refresh-token issuance. The auth.users row is the single
            // source of truth.
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error || !data?.user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Pull the display name out of the profile table for the dashboard.
            const { data: profile } = await supabaseClient
                .from('user-log-in-info')
                .select('full_name, language')
                .eq('id', data.user.id)
                .maybeSingle();

            res.status(200).json({
                message: 'Login successful',
                userId: data.user.id,
                email: data.user.email,
                full_name: profile?.full_name ?? null,
                language: profile?.language ?? 'en',
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error: ' + err.message });
        }
    });

    // Password reset request endpoint.
    // Asks Supabase Auth (admin) to mint a recovery action_link, then mails
    // that link to the user through Mailgun. The user clicks it, lands on
    // Reset_Password.html with access_token in the URL fragment, and finishes
    // the change via the supabase-js client in the browser.
    router.post('/reset', async (req, res) => {
        try {
            const { email } = req.body || {};
            if (!email || typeof email !== 'string' || !email.includes('@')) {
                return res.status(400).json({ error: 'A valid email is required.' });
            }

            const mailer = getMailer();
            if (!mailer) {
                return res.status(500).json({
                    error: 'Email service is not configured. Set MAILGUN_API_KEY, MAILGUN_DOMAIN, and MAILGUN_FROM in your .env file.'
                });
            }

            // Where Supabase should land the user after they click the email
            // link. Percent-encode the space in the folder name ("page 1.5").
            const site = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
            const redirectTo = `${site}/page%201.5/Reset_Password.html`;

            const { data, error: genError } = await supabaseClient.auth.admin.generateLink({
                type: 'recovery',
                email,
                options: { redirectTo }
            });

            if (genError) {
                // Surface "user not found" as 200 to avoid leaking which addresses
                // are registered — standard practice for reset flows.
                if (/user not found/i.test(genError.message)) {
                    return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
                }
                return res.status(400).json({ error: genError.message });
            }

            const actionLink = data?.properties?.action_link;
            if (!actionLink) {
                return res.status(500).json({ error: 'Could not generate reset link.' });
            }

            const subject = 'Reset your YTSG Planner password';
            const text = [
                'Someone (hopefully you) requested a password reset for your YTSG Planner account.',
                '',
                'Click this link to choose a new password:',
                actionLink,
                '',
                'The link expires in 1 hour. If you did not request this, you can safely ignore this email.'
            ].join('\n');

            await mailer.send({
                to: email,
                subject,
                text
            });

            res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error: ' + err.message });
        }
    });

    return router;
}

module.exports = { buildAuthRouter };
