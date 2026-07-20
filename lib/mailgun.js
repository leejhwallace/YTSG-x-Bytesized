// Thin wrapper around the official mailgun.js SDK.
//
// All pages and routes import this module indirectly through the router.
// The factory below returns a `send()` function so callers don't have to
// know about Mailgun-specific shapes, and so we can swap providers later
// (Resend/Postmark/etc.) without touching routes.js.
//
// Required env vars to actually send email:
//   MAILGUN_API_KEY      private API key from the Mailgun dashboard
//   MAILGUN_DOMAIN       your verified domain (e.g. mg.example.com) or sandbox subdomain (sandboxXXX.mailgun.org)
//   MAILGUN_FROM         "Name <addr@domain>" used as the From header
//
// Until all three are set, getMailer() returns null. /api/reset treats this
// as a 500 with a friendly error message — better than a stack trace.
const Mailgun = require('mailgun.js');

let cachedClient = null;

function getMailer() {
    if (cachedClient) return cachedClient;

    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const from = process.env.MAILGUN_FROM;

    if (!apiKey || !domain || !from) return null;

    const mailgun = new Mailgun(require('form-data'));
    const client = mailgun.client({
        username: 'api',
        key: apiKey,
        // If you created your Mailgun account in the EU region, also set
        // MAILGUN_HOST=api.eu.mailgun.net and uncomment below.
        // url: process.env.MAILGUN_HOST || 'https://api.mailgun.net',
    });

    cachedClient = {
        from,
        domain,
        async send({ to, subject, text, html }) {
            return client.messages.create(domain, {
                from,
                to: Array.isArray(to) ? to : [to],
                subject,
                text,
                html
            });
        }
    };
    return cachedClient;
}

module.exports = { getMailer };
