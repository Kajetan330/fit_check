# Launch Hardening Report

Date: 2026-07-20

## What Changed

- Disabled seeded customer demo state in production by default with `demoMode`; local/demo mode can still be enabled with `VITE_DEMO_MODE=true`.
- Replaced the old homepage "How it works" path with a creator-link-first homepage and example result anchor.
- Expanded service pages with best-fit guidance, not-fit guidance, customer effort, required materials, deliverables, revision terms, and example result media.
- Added draft-token upload flow through `/api/draft-uploads`, then claims files into a booking after authenticated booking creation.
- Added `/api/booking-actions` for waitlist capture, messages, delivery, redelivery, revisions, problem reports, approvals, and reviews.
- Folded referral-link creation into `/api/create-share-link` with `kind: "referral"`.
- Removed `/api/checkout-status`; booking detail now polls Supabase booking payment status directly after checkout success.
- Extended the cron job to send approval reminders, auto-approve only delivered bookings, and clean stale inactive bookings plus unclaimed draft uploads.
- Added best-effort Resend email helpers. No email route is deployed, and booking flows continue if email env vars are missing.
- Moved generated share-page data into `share.config.json` and added a local fallback OG image.
- Tightened the Vercel SPA rewrite so deleted or unknown `/api/*` routes no longer return the frontend shell.
- Added `supabase/migrations/0009_launch_hardening.sql` and updated the catalog seed with service-detail fields.
- Updated the seed so it creates a profile for the first existing `auth.users` row when `public.profiles` is empty, then marks that owner as a creator unless already admin. Role writes are explicitly cast to `public.user_role`.

## Verification

- `npm run check` passes.
- Deployed function count is 12 non-underscore Vercel functions.

## Manual Follow-Up

- Run `supabase/migrations/0009_launch_hardening.sql` in Supabase.
- Rerun `supabase/seed/0001_seed_catalog.sql`. If at least one Supabase Auth user exists, the seed now creates/uses the needed owner profile automatically.
- Set `VITE_SUPPORT_EMAIL` in Vercel.
- Set `CRON_SECRET` before relying on cron.
- Optional: set `RESEND_API_KEY` and `EMAIL_FROM` for transactional email.
- Test the logged-out booking draft, sign-in at Review, Stripe test checkout, and delivery approval loop on a real phone.
