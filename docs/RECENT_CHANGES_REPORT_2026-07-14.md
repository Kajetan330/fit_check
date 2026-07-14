# ByTaste Recent Changes Report

Date: July 14, 2026

This report summarizes the recent implementation work on top of the creator-commerce MVP.

## Product Direction

ByTaste is now clearly on a bookings-first launch path:

- one-to-one styling bookings remain the active revenue path;
- one-to-many paid edits remain browsable as editorial taste proof;
- paid-edit checkout stays disabled until the Supabase commerce schema is applied, seeded, and `VITE_COMMERCE_ENABLED=true` is set in Vercel.

This keeps the current tested booking path working while avoiding a half-live paid-edit purchase path.

## Recently Shipped

### Style Quiz Removed

- Deleted the Style Quiz page, quiz data, quiz type, and quiz CSS.
- `/quiz` now redirects to `/` so old links do not break.
- Removed quiz CTAs and quiz references from customer-facing docs and QA flow.
- Added `docs/BYTASTE_PHASE2_SPEC.md` to capture the Phase 2 plan.

### Real Auth Foundation

- Added Supabase auth helper in `src/lib/auth.ts`.
- Added Google OAuth and magic-link helpers.
- Added `/auth/callback`.
- Mirrored Supabase session lifecycle into app state.
- Reworked customer sign-in copy and form so production users do not see role selection or internal implementation wording.
- Added `supabase/migrations/0004_profiles.sql` for profiles, signup trigger, RLS, and role guard.

### Commerce Freeze

- Added `VITE_COMMERCE_ENABLED` guard for paid-edit checkout.
- Paid edits can still be browsed and shared.
- Paid-edit buy action now stays disabled until the database and seed data are ready.

### Analytics

- Added `@vercel/analytics`.
- Mounted analytics in `src/main.tsx`.
- Added funnel events for profile views, edit views, booking start, checkout redirect, auth gates, and auth completion.

### Trust And Routing

- `/launch` is no longer publicly usable by non-admin users.
- Internal paid-edit reader notes are hidden outside development.
- Homepage has a real `#how-it-works` section.
- Guest nav "How it works" points to that section instead of the removed quiz.

### Launch Security Hardening

- Hardened legacy booking checkout in `api/create-checkout-session.ts`:
  - added rate limiting;
  - added a server-side service price catalog;
  - rejects unknown creator/service combinations;
  - rejects tampered client-side amounts.
- Hardened trusted commerce checkout in `api/create-commerce-checkout.ts`:
  - no wildcard CORS fallback;
  - fails closed if `VITE_APP_URL` is missing.
- Added `supabase/migrations/0005_security_hardening.sql`:
  - reinforces profile role-update protection;
  - replaces anonymous `commerce_events` inserts with authenticated-only inserts.
- Updated service worker so it does not cache Supabase-hosted URLs.
- Removed unused `STRIPE_CONNECT_CLIENT_ID` from `.env.example`.
- Removed Netlify-only `public/_redirects`; Vercel is the production deployment target.

### Supabase Commerce Seed

- Tightened the original `0003` commerce migration so fresh installs create authenticated-only `commerce_events` inserts.
- Added `supabase/config.toml` for Supabase CLI local development and seed execution.
- Added `supabase/seed/0001_seed_catalog.sql` for the launch creator catalog:
  - creator profiles;
  - service prices;
  - paid edits;
  - product picks;
  - outfit formulas and outfit-item links;
  - referral links.
- Added `supabase/migrations/0006_taste_item_verdict.sql` for chosen versus rejected product picks.
- Documented the seed requirement: sign in once first so `public.profiles` has an auth-backed owner row.

### Paid-Edit Reader Guard

- Updated `/api/paid-edit-access` to return the entitled product, creator handle, product items, outfits, and outfit-item links.
- Added `src/lib/paidEditAccess.ts` to request entitlement-gated content with the active Supabase session token.
- Updated the paid-edit reader so Supabase-configured environments verify purchases and entitlements through the API instead of trusting local state.
- Kept the local reader fallback only for no-credential demo development.

## Verification Run

Latest local verification should include:

```bash
npm run check
```

The check builds the frontend and type-checks the Vercel API TypeScript files.

## Manual Work Still Required

Run these in Supabase SQL Editor, in order if not already applied:

1. `supabase/migrations/0003_paid_edits_and_entitlements.sql`
2. `supabase/migrations/0004_profiles.sql`
3. `supabase/migrations/0005_security_hardening.sql`
4. `supabase/migrations/0006_taste_item_verdict.sql`

Then:

- sign in once through the app so `public.profiles` has an auth-backed owner row;
- run `supabase/seed/0001_seed_catalog.sql`;
- enable the Google provider in Supabase Auth if Google sign-in should be live;
- verify storage buckets exist and are private where required;
- keep `VITE_COMMERCE_ENABLED` off until paid-edit data is seeded and tested;
- test booking checkout after deploy;
- test paid-edit checkout only after enabling the commerce flag.

## Remaining Engineering Priorities

1. Finish the booking wizard with guest-draft preservation through auth.
2. Read storefronts and paid edits from Supabase with seeded fallback only for demo mode.
3. Move bookings fully onto the trusted commerce checkout path.
4. Wire creator Studio forms to Supabase writes.
5. Add signed media reads for private `paid-product-media` assets once product media leaves public launch assets.
6. Add Stripe Connect Express before claiming automated creator payouts.
7. Add smoke tests for browse, auth, booking checkout, webhook, entitlement, signed media, and controlled share flows.
