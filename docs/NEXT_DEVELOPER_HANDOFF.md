# ByTaste Next Developer Handoff

ByTaste is the new trade name for the project formerly called FitCheck. Preserve the existing `fitcheck-*` browser storage keys until a deliberate migration shim is added.

Last updated: July 19, 2026

Production URL: https://fit-check-ecru.vercel.app

Latest pushed implementation commits before this handoff:

```text
7db0ac7 feat: rebrand to ByTaste
86ad8a0 feat: seed commerce catalog and guard paid edits
8e65a52 fix: harden checkout and launch security
23c8660 Real Supabase auth foundation, commerce freeze flag, funnel analytics, trust fixes
e7d16f4 Remove style quiz; update handoff note + Phase 2 spec
```

## Current State

### Change 2026-07-19: Social-First Pivot

Implemented the social-first pivot from the July 19 specification while preserving existing booking, paid-edit, and Studio foundations:

- `/` is now a marketing homepage with a seeded delivery walkthrough, creator-link note, creator proposition, trust cards, and the existing `#how-it-works` anchor.
- Guest navigation no longer exposes a public directory or paid-edit deep link. It now shows Home, How it works, For creators, and Sign in.
- Customer navigation now includes `/account`; creator navigation includes `/studio/share`.
- Creator storefronts resolve one primary offer, show proof from real seeded sources only, and render a mobile sticky CTA.
- Booking auth moved to the Review step. Logged-out visitors can complete service, goal, and photo steps first; drafts persist text, closet IDs, and upload metadata only.
- `/studio/share` adds canonical storefront links, QR generation, direct offer links, tracked-link generation, and honest empty stats.
- New endpoints: `/api/create-booking`, `/api/referral-links`, `/api/track-event`, and `/api/cron/auto-approve`.
- Checkout and webhook attribution now carry `source` and `campaign` where migration `0007_social_first.sql` has been applied.
- New migrations: `0007_social_first.sql` and `0008_service_loop.sql`.
- Full report: `docs/SOCIAL_FIRST_IMPLEMENTATION_REPORT_2026-07-19.md`.

Manual follow-up: run migrations `0007` and `0008`, rerun the catalog seed, add `CRON_SECRET` in Vercel before relying on auto-approval, and keep `VITE_COMMERCE_ENABLED` off until paid edit purchases are fully tested.

### Change 2026-07-14: ByTaste Rebrand

Implemented the Phase 1-2 code-side rebrand:

- Swapped visible product copy, package metadata, manifest metadata, Stripe-visible line-item prefixes, share-page metadata, and docs from FitCheck to ByTaste/BYTASTE.
- Added the supplied BYTASTE mark and wordmark in `public/brand/`, replaced `public/icon.svg`, and renamed generated placeholder media to `bytaste-media-*`.
- Reworked the CSS tokens to pressed powder, aubergine ink, claret, blush, stone, Archivo, Bodoni Moda, 3px corners, and subtler shadows.
- Added chosen/rejected taste-product item support in TypeScript, local demo data, Supabase migration `0006_taste_item_verdict.sql`, Supabase seed data, API mapping, and paid-edit cards.
- Regenerated static share pages with BYTASTE Open Graph metadata and claret/powder social cards.
- Kept `fitcheck-state-v1`, `fitcheck:referral:v1`, and `fitcheck-auth-redirect` untouched to avoid wiping saved visitor state.

### Change 2026-07-14: Launch Security Hardening

Implemented from the same-day technical review:

- Legacy booking checkout (`api/create-checkout-session.ts`) now rate-limits requests and validates the creator/service/price against a server-side catalog before creating Stripe Checkout.
- Trusted commerce checkout (`api/create-commerce-checkout.ts`) now fails closed when `VITE_APP_URL` is missing instead of falling back to wildcard CORS.
- `supabase/migrations/0005_security_hardening.sql` consolidates profile role-update protection and restricts `commerce_events` inserts to authenticated users.
- The service worker now skips caching Supabase-hosted URLs so signed URLs and auth/storage resources do not become stale.
- Removed the unused `STRIPE_CONNECT_CLIENT_ID` placeholder and the Netlify-only `public/_redirects` file. Vercel remains the production deployment target.

### Change 2026-07-14: Supabase Commerce Seed And Paid Reader Guard

Implemented from the remaining launch implementation plan:

- `supabase/migrations/0003_paid_edits_and_entitlements.sql` now creates the authenticated-only `commerce_events` insert policy directly for fresh installs. `0005_security_hardening.sql` remains as an existing-project backstop.
- `supabase/config.toml` adopts Supabase CLI defaults for local development, auth redirect URLs, storage, Studio, and seed execution.
- `supabase/seed/0001_seed_catalog.sql` seeds the current launch catalog into Supabase: creators, services, paid edits, product items, outfit formulas, outfit-item links, and referral links. It is idempotent and attaches seeded creators to an existing auth-backed profile.
- `api/paid-edit-access.ts` now returns creator handle and outfit-item links with entitled paid content.
- `src/lib/paidEditAccess.ts` maps the entitlement API payload into frontend commerce models.
- `PaidEditReaderPage` now calls `/api/paid-edit-access` whenever Supabase is configured, with loading, pending, refunded, revoked, missing, and network states. The old local entitlement path remains only for no-credential demo development.

### Change 2026-07-14: Real Auth Foundation, Commerce Freeze, Analytics

Implemented from `docs/BYTASTE_PHASE2_SPEC.md` with a bookings-first launch decision:

- **Real Supabase auth**: `src/lib/auth.ts` adds Google OAuth, email magic link, and session-to-user mapping with graceful fallback when `profiles` is missing. Session lifecycle is mirrored into app state, `/auth/callback` exists, customer sign-in has no name field or internal wording, and `signOut` ends the Supabase session too.
- **Profiles migration**: `supabase/migrations/0004_profiles.sql` adds `profiles`, a signup trigger, RLS, and a role-escalation guard. Manual step: run 0004 in the Supabase SQL Editor and enable the Google provider. Magic link can work with Supabase default email settings.
- **Commerce freeze**: paid-edit purchasing is gated behind `VITE_COMMERCE_ENABLED` in `src/lib/commerce.ts`. Until the flag is `true` in Vercel, the buy button renders as "Paid edits launch soon" and checkout cannot start. Bookings are unaffected. Flip it on only after migration 0003 is applied and seeded.
- **Trust fixes**: `/launch` now renders NotFound for non-admins. Paid-edit reader internals are DEV-only. Edit-page and sign-in copy no longer mention Supabase, entitlements, or demo auth in customer-facing production surfaces.
- **Funnel analytics**: `@vercel/analytics` is mounted in `main.tsx`; events include `creator_profile_viewed`, `edit_viewed`, `edit_checkout_clicked`, `booking_started`, `checkout_redirected`, `auth_gate_shown`, `signin_google_clicked`, `signin_magic_link_sent`, and `auth_completed`.
- **Homepage**: new `#how-it-works` section with three steps, including the payment-hold language. Guest nav "How it works" points at that section.

Remaining from the Phase 2 spec after the social-first pass: Supabase-backed creator/service/paid-edit reads, creator Studio writes, real analytics tables in Studio, service-loop action endpoints/UI, and Stripe Connect payouts.

### Change 2026-07-14: Style Quiz Removed

The Style Quiz has been removed from the product entirely. The implementation follows `docs/BYTASTE_PHASE2_SPEC.md`, Workstream A:

- `StyleQuizPage`, `quizLooks`, `QuizLook`, and `.quiz-*` styles were deleted.
- `/quiz` now redirects to `/` so old links do not 404.
- Homepage and navigation quiz CTAs were removed.
- README, project status, and QA checklist were updated.
- No localStorage migration is needed because quiz progress was never persisted.

Phase 2 status:

- Workstream A is complete.
- Trust sprint work is partially complete.
- Real Supabase auth foundation is partially implemented.
- Booking wizard, analytics verification, and edits-lite remain.

ByTaste is a responsive React/Vite fashion-tech MVP with seeded creator data, local demo state, Supabase schema migrations, Vercel serverless API routes, and Stripe checkout/webhook scaffolding.

The latest work added the first real architecture for creator-led monetisation:

- creator storefront routes;
- paid edit landing pages;
- customer library and paid edit reader prototype;
- creator Studio entries for storefront, edits, and analytics;
- trusted server-side checkout endpoint for paid edits and real booking UUIDs;
- webhook entitlement grant/revoke handling;
- paid edit access API;
- controlled share-link API;
- private media signed URL API;
- generated static social-preview pages under `public/share`;
- Supabase migration `0003_paid_edits_and_entitlements.sql`.

The app still supports the original demo journey. Do not remove the seeded/local flow until Supabase-backed creator, service, booking, and paid-edit data has been fully wired and tested.

## Important Files

- `src/App.tsx` - main routes and product UI. Contains storefronts, paid edit pages, customer library, Studio pages, booking flow, auth callback, and auth gates.
- `src/data.ts` - seeded creators, services, posts, paid edits, purchases, and entitlement demo data.
- `src/types.ts` and `src/types/commerce.ts` - app and commerce domain models.
- `src/state.tsx` - local MVP state store plus Supabase auth session mirroring.
- `src/lib/auth.ts` - Supabase Google OAuth, magic-link auth, redirect preservation, sign-out, and session-to-user mapping.
- `src/lib/commerce.ts` - frontend helper for trusted commerce checkout and `VITE_COMMERCE_ENABLED` freeze flag.
- `src/lib/paidEditAccess.ts` - frontend helper for entitlement-gated paid edit reads.
- `src/lib/sharing.ts` - referral capture, safe redirects, and share URL helpers.
- `src/features/sharing/ShareButton.tsx` - Web Share API with clipboard/manual fallback.
- `api/create-commerce-checkout.ts` - trusted checkout endpoint. Browser should send only trusted IDs, not price/title.
- `api/stripe-webhook.ts` - Stripe webhook with idempotency and paid-edit entitlement handling.
- `api/paid-edit-access.ts` - entitlement-gated paid edit read API.
- `api/create-share-link.ts` and `api/shared-resource.ts` - controlled share-link creation and read flow.
- `api/media/signed-url.ts` - authorised private media signed URL flow.
- `supabase/migrations/0003_paid_edits_and_entitlements.sql` - paid edit, purchase, entitlement, referral, share, and commerce-event schema.
- `supabase/migrations/0004_profiles.sql` - Supabase auth profile table, signup trigger, RLS, and role guard.
- `supabase/migrations/0005_security_hardening.sql` - profile role hardening and commerce-event insert policy consolidation.
- `supabase/migrations/0006_taste_item_verdict.sql` - chosen/rejected product item verdict field.
- `supabase/config.toml` - Supabase CLI local project config.
- `supabase/seed/0001_seed_catalog.sql` - idempotent Supabase seed for the launch catalog.
- `scripts/generate-share-pages.mjs` - build-time static share/OG page generator.
- `docs/COMMERCE_IMPLEMENTATION_STATUS.md` - implementation status for the commerce slice.
- `docs/BYTASTE_PHASE2_SPEC.md` - Phase 2 plan and acceptance criteria.
- `docs/RECENT_CHANGES_REPORT_2026-07-14.md` - concise report of the recent product, auth, commerce, and hardening changes.

## What Is Real Versus Prototype

Real/scaffolded production controls:

- Supabase auth session plumbing now exists and can map sessions to app users.
- Paid edit access is modeled through `product_entitlements`.
- Paid edit reader access calls the entitlement API in Supabase-configured environments.
- Checkout prices are designed to load server-side from Supabase.
- `/api/create-booking` creates real booking UUID rows from signed-in users and loads service price from Supabase before checkout.
- Paid-edit checkout is frozen behind `VITE_COMMERCE_ENABLED` until the database is ready.
- `/api/track-event` records allowlisted source/campaign attribution without storing PII or brief text.
- `/api/cron/auto-approve` is gated by `CRON_SECRET` and the `0008_service_loop.sql` approval columns.
- Webhook processing records Stripe event IDs to reduce duplicate processing.
- Controlled share links store SHA-256 token hashes, not raw tokens.
- Private media access is mediated through signed URL APIs.
- Customer sign-in no longer exposes public creator/admin role switching.
- `/launch` is now admin-only in the UI route guard.

Still prototype/demo:

- Most visible app data still comes from `src/data.ts` and `localStorage`.
- Creator Studio forms do not yet write to Supabase.
- Booking creation still falls back to the legacy demo checkout path when Supabase is not configured.
- Storefront and paid-edit landing pages still read from seeded frontend data first, even though Supabase seed data now exists.
- Static share pages are generated SVG/HTML cards for seeded data only.
- Service-specific saved referral links are local-only until storefront services read from Supabase UUIDs.

## Required Manual Setup Before The Next Full Test

1. Run `supabase/migrations/0003_paid_edits_and_entitlements.sql` in the Supabase SQL Editor.
2. Run `supabase/migrations/0004_profiles.sql` in the Supabase SQL Editor.
3. Run `supabase/migrations/0005_security_hardening.sql` in the Supabase SQL Editor.
4. Run `supabase/migrations/0006_taste_item_verdict.sql` in the Supabase SQL Editor.
5. Run `supabase/migrations/0007_social_first.sql` in the Supabase SQL Editor.
6. Run `supabase/migrations/0008_service_loop.sql` in the Supabase SQL Editor.
7. Sign in once through the app so `public.profiles` has at least one auth-backed owner row.
8. Run `supabase/seed/0001_seed_catalog.sql` in the Supabase SQL Editor.
9. Enable Google provider in Supabase Auth if you want the Google button live.
10. Add `CRON_SECRET` in Vercel before relying on auto-approval.
11. Verify these commerce tables exist:
   - `taste_products`
   - `taste_product_items`
   - `taste_product_outfits`
   - `purchases`
   - `product_entitlements`
   - `controlled_share_links`
   - `creator_referral_links`
   - `commerce_events`
   - `stripe_events`
12. Verify `taste_product_items.verdict`, `creator_profiles.primary_offer_type`, `commerce_events.source`, and `bookings.approval_deadline` exist.
13. Verify the `paid-product-media` storage bucket exists.
11. Only after 0003 is applied and seeded, set `VITE_COMMERCE_ENABLED=true` in Vercel if paid-edit purchasing should launch.
12. Test paid-edit checkout using a real `taste_products.id`.
13. Confirm Stripe webhook creates or activates the matching `product_entitlements` row.

## Recommended Next Engineering Phase

Do this in small commits:

1. Finish the booking wizard with guest-draft preservation.
2. Add typed Supabase query helpers for creators, services, and paid edits.
3. Update storefront and paid-edit landing pages to read from Supabase, with fallback seeded data only for local demo mode.
4. Wire signed media reads for `paid-product-media` where product/item media stops using public launch assets.
5. Replace legacy booking checkout from browser-provided service details with the trusted `booking` path in `/api/create-commerce-checkout`.
6. Wire creator Studio forms to Supabase writes and RLS.
7. Add integration tests or scripted smoke tests for checkout, webhook, entitlement, signed media, controlled share links, and auth.

## Safety Notes

- Do not commit `.env` files, Stripe keys, Supabase service keys, webhook secrets, or dashboard screenshots containing credentials.
- Do not make private storage buckets public to solve access problems. Use signed URL endpoints.
- Do not accept price, currency, title, or creator handle from the browser for production checkout.
- Do not remove local demo data until the Supabase-backed flow is fully replacement-ready.
- Keep Vercel production health checks free of secret values.

## Last Verified

On July 13, 2026:

- `npm run check` passed.
- A secret-pattern scan found no committed Stripe/Supabase key patterns.
- Local preview returned HTTP 200 for new creator, paid-edit, library, and static share routes.
- Vercel served the generated static share page after the push.
- Production `/api/health` returned configured Stripe/Supabase status with `checkout_sessions` reachable.
