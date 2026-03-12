# St. Joseph Daycare Enrollment Portal

## Getting Started

1. Run `npm install` (from project root)
2. Run `npm run setup` (from project root)
3. Run `npm run dev` (from project root)

## Project Structure

- `frontend/` — React + Vite web app
- `backend/supabase/` — Supabase SQL schema and backend-related setup files

Root scripts proxy into `frontend`, so you still use one terminal from the repository root.

## Demo Accounts

Use these test accounts for local/demo access:

- Guardian
	- Email: `guardian@gmail.com`
	- Password: `guardian`
- Staff
	- Email: `staff@gmail.com`
	- Password: `staffstaff`
- Admin
	- Email: `admin@gmail.com`
	- Password: `adminadmin`

## Notes

- Admin access is controlled by `profiles.role = 'admin'` in Supabase.
- For password reset emails in production, set `VITE_PASSWORD_RESET_REDIRECT_URL` in `frontend/.env` to your deployed frontend URL and add that same URL to Supabase Auth redirect URLs.
- Do not commit real Supabase secrets (service role keys, production API keys, private tokens) to the repository.

## Security Deployment Notes

- Administrative accounts are now gated by TOTP MFA in the frontend. Enable Supabase Auth MFA in your project before testing admin access.
- Passwords are already hashed and stored by Supabase Auth. This app does not keep plaintext passwords in application tables.
- Apply `backend/supabase/schema.sql` in Supabase to enable sensitive-field encryption and the `get_enrollments_secure()` RPC.
- Optionally configure a Postgres setting named `app.settings.encryption_key` in Supabase to enable encryption for sensitive enrollment fields. If it is not configured, enrollment records will still work, but those fields will be stored unencrypted.
- Serve the production frontend over HTTPS. The app now redirects non-local `http` traffic to `https`, but the deployed host still needs a valid TLS setup.

## Load Testing

Use the built-in load test runner to validate the 50 concurrent user target and the 2-3 second response-time target.

1. Start the frontend preview or deployed app.
2. From `frontend/`, run `npm run load:test -- --scenario ./scripts/load-test.scenario.example.json`.
3. Review the output for average response time, `p95`, throughput, and error rate.

Notes:

- The example scenario is intentionally safe and only performs `GET` requests.
- For authenticated reads and writes, use `node ./scripts/load-test.mjs --scenario ./scripts/load-test.scenario.authenticated.example.json`.
- The authenticated example signs in through Supabase and writes contact messages as part of the test, so use demo data or a non-production workspace before running it at scale.
- The script exits with code `1` if configured performance targets fail.
