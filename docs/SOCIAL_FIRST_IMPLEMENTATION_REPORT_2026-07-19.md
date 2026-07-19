# Social-First Implementation Report

Date: 2026-07-19

Baseline: `origin/main` at `46d8be8`.

## What Changed

- Replaced the public discovery homepage with a social-first marketing homepage.
- Removed visible guest discovery/search/filter/Rising Stars entry points from app navigation.
- Added a seeded sample delivery walkthrough using the existing Maya/Amara booking and closet data.
- Added shared `PAYMENT_HOLD_COPY` so booking and trust surfaces use the same approved language.
- Reshaped creator storefronts around one primary offer, taste signature, proof, services, public edits, about/social links, and a mobile sticky CTA.
- Added `/c/:handle/service/:serviceId` as a short service route redirect.
- Added `/account` for signed-in customers and creators.
- Reworked the booking wizard into `service -> goal -> photos -> review -> pay`.
- Moved auth to the review step so logged-out visitors can complete the useful brief/photos flow first.
- Added guest booking drafts in `src/lib/drafts.ts`; drafts store text, closet IDs, and upload metadata only.
- Added image upload previews with remove and up/down reorder controls.
- Added `/studio/share` with canonical storefront URL, QR code generation/download, direct offer links, tracked-link builder, and honest empty analytics rows.
- Extended attribution storage with first-touch-per-creator referral rules and last-creator continuity.
- Added client event helper `src/lib/analytics.ts` that sends approved events to `/api/track-event` and Vercel Analytics.
- Added trusted `/api/create-booking`; it loads service price from Supabase before creating a booking.
- Extended `/api/create-commerce-checkout` and Stripe webhook handling to carry source/campaign attribution where the new schema exists.
- Updated `/api/checkout-status` to read real `bookings` payment status before falling back to deprecated `checkout_sessions`.
- Added `/api/referral-links`, `/api/track-event`, and `/api/cron/auto-approve`.
- Added additive migrations:
  - `0007_social_first.sql`
  - `0008_service_loop.sql`
- Updated `supabase/seed/0001_seed_catalog.sql` with primary offer and service context.
- Added `qrcode` for QR rendering in Studio Share.

## Verification

- `npm run check` passes.
- Source sweep is clean for removed public discovery copy:

```bash
rg -n "Discover|Find creator|Rising Stars|Creators to book now|Back to Discover" src/App.tsx
```

returns no matches.

## Important Constraints

- Storefront, services, and edits still render primarily from local seed data. Supabase seed data exists, but full Supabase-backed reads are still future work.
- Service-specific referral-link saving is local-only until services render from Supabase UUIDs. Edit and storefront links are closer to production-ready because paid edit IDs are already UUID-shaped.
- Paid-edit purchasing remains behind `VITE_COMMERCE_ENABLED`.
- Auto-approval is inert until `CRON_SECRET` is configured and migration `0008_service_loop.sql` is applied.
- Email notifications, Stripe Connect payouts, dispute admin tooling, and real creator verification are not complete.

## Manual Next Steps

1. Run migrations `0007_social_first.sql` and `0008_service_loop.sql` in Supabase after the earlier migrations are already applied.
2. Rerun `supabase/seed/0001_seed_catalog.sql` after at least one auth-backed profile exists.
3. Add `CRON_SECRET` in Vercel before relying on auto-approval.
4. Test a logged-out mobile booking from `/book/amara-okafor/quick-take`, sign in at Review, then confirm the draft returns.
5. Test Studio Share on a real creator account after the profile row owns a seeded creator profile.
6. Keep `VITE_COMMERCE_ENABLED` off until paid-edit checkout, webhook, purchases, entitlements, and attribution are verified end to end.
