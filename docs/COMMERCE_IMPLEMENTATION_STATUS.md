# FitCheck Commerce Implementation Status

Last updated: July 13, 2026

## Implemented In This Slice

- Creator storefront positioning fields are represented in frontend creator models and seeded data.
- Paid-edit frontend types were added for products, items, outfits, purchases, entitlements, and controlled shares.
- Seeded paid edits now have public preview rows and protected full rows.
- Creator storefronts now feature "Shop my edits" and "Book my taste" offers.
- Public paid-edit pages exist at `/creator/:handle/edit/:slug`.
- Service detail pages exist at `/creator/:handle/service/:serviceSlug`.
- Customer library and paid-edit reader prototype routes exist at `/library` and `/library/edits/:purchaseId`.
- Promotional sharing uses the Web Share API with clipboard/manual fallback.
- Build-time share pages are generated under `public/share` for seeded creators and edits with initial Open Graph/Twitter metadata.
- Customer sign-in no longer exposes public creator/admin role selection.
- Creator sign-in has a separate `/creator/signin` route.
- Studio has storefront, edits, new-edit, and analytics entry points.
- New migration `0003_paid_edits_and_entitlements.sql` adds paid edits, purchases, entitlements, controlled share links, referrals, commerce events, Stripe event logs, and private paid media bucket.
- New server endpoints provide trusted commerce checkout, paid-edit access checks, private media signed URLs, controlled share resource reads, and controlled share link creation.
- Stripe webhook processing is idempotent through `stripe_events` and can grant/revoke paid-edit entitlements.

## Security Controls Added

- Paid-edit access is modelled through `product_entitlements`, not redirect query strings.
- Public RLS policies expose preview rows only.
- Full product rows require entitlement, creator ownership, or admin access.
- Controlled share links store only SHA-256 token hashes.
- Private booking media is signed only after booking/customer/creator/admin authorization checks.
- Trusted checkout endpoint accepts only `checkoutType`, trusted `referenceId`, and optional referral code.
- Paid-product checkout loads price/title/currency/server-side from Supabase.
- Trusted booking checkout supports real booking UUIDs and loads booking price from Supabase.
- Webhook stores Stripe event IDs before processing to prevent duplicate entitlement grants.
- Basic in-memory rate limits protect checkout, share-link creation, shared-resource reads, and signed media URLs.

## Still Prototype

- The current visible paid-edit reader uses seeded local entitlements for demo continuity.
- Full production paid-edit access should switch the reader to `/api/paid-edit-access` with a Supabase session token.
- Creator storefront/edit Studio forms are not yet writing to Supabase.
- Static creators/services are still seeded in `src/data.ts`; production should seed or read them from Supabase.
- Booking creation still uses the legacy local demo flow until the real booking persistence step is wired into the frontend.
- The share social images are generated SVG cards. Replace with generated or designed PNG/JPG cards if platform compatibility becomes an issue.

## Manual Supabase Action

Run:

```sql
-- Supabase SQL Editor
-- paste and run supabase/migrations/0003_paid_edits_and_entitlements.sql
```

Then verify:

- `taste_products`
- `taste_product_items`
- `taste_product_outfits`
- `purchases`
- `product_entitlements`
- `controlled_share_links`
- `creator_referral_links`
- `commerce_events`
- `stripe_events`
- `paid-product-media` bucket

## Recommended Next Phase

Move the current seeded creators, services, and paid edits into Supabase and update the frontend reader/storefront queries to use Supabase data with RLS. After that, wire the paid-edit reader to `/api/paid-edit-access` and wire creator Studio forms to the new tables.
