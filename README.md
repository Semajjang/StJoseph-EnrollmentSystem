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
