# ByTaste Final Finish Plan

Last updated: July 6, 2026

## Current State

ByTaste is deployed at:

```text
https://fit-check-ecru.vercel.app
```

The app has:

- Responsive customer-facing MVP.
- Creator Studio demo.
- Admin console demo.
- Supabase schema migrations.
- Supabase auth configured in production.
- Stripe test Checkout configured in production.
- Stripe webhook endpoint receiving events.
- Local generated media replacing external stock URLs.
- Brand assets and policy drafts.

## Already Done

- Vercel project deployed from GitHub `main`.
- Vercel environment variables configured.
- Supabase migration `0001_initial_schema.sql` run.
- Supabase auth URLs configured.
- Stripe test webhook created.
- Stripe test checkout confirmed.
- Stripe webhook delivery confirmed with `200 OK`.
- Production health endpoint added for checking Stripe/Supabase wiring without exposing secret values.
- Repo updated through the current `main` branch.

## Do Now

1. Run Supabase migration `0002_checkout_sessions.sql`.
2. Wait for Vercel to redeploy from the latest `main` commit.
3. Visit `/launch` or `/api/health` on production and confirm the health checks pass.
4. Run another test booking and Stripe test checkout.
5. Confirm the booking page changes payment from pending to paid after webhook sync.
6. Rotate any credentials that were exposed in screenshots or chat.

## Engineering Work Remaining

### Priority 1: Replace Demo Persistence

- Move user profile state from `localStorage` to Supabase `profiles`.
- Move closet items from `localStorage` to Supabase `closet_items`.
- Move saved creators/posts to Supabase `saved_creators` and `saved_posts`.
- Move creator applications to Supabase `creator_applications`.
- Move creator profile edits and post composer output to Supabase.

### Priority 2: Real Booking Records

- Seed or create real Supabase creator/service records for the current static creators.
- Create real `bookings` rows before Stripe checkout.
- Link checkout sessions to real booking UUIDs, not only local booking references.
- Show bookings from Supabase on `/bookings`.
- Let Creator Studio read active bookings from Supabase.

### Priority 3: Uploads

- Store closet uploads in `private-booking-uploads`.
- Create `booking_uploads` rows for intake photos.
- Store public creator profile/post images in `public-media`.
- Add upload progress, file-size validation, and error states.

### Priority 4: Payments And Payouts

- Update real booking payment status from Stripe webhooks.
- Add payout ledger fields/tables for creator payouts.
- Add Stripe Connect onboarding for creators.
- Implement refund/dispute state transitions.

### Priority 5: Operations

- Connect admin console to real Supabase rows.
- Add moderation queue views for uploads/posts.
- Add dispute queue and resolution actions.
- Add transactional emails for booking confirmation, delivery, revision, and payout events.

### Priority 6: Launch Quality

- Replace generated placeholder people/customer images with creator-owned or licensed launch media.
- Complete legal review of Terms, Privacy, Creator Terms, Refund Policy, and Platform Policies.
- Run mobile QA on iOS Safari and Android Chrome.
- Add analytics events for discovery, booking, checkout, creator application, and Studio actions.

## Product Decisions Already Made

- Standard creator take rate: 18%.
- Founding/Pro creator take rate: 12%.
- Capsule affiliate split: 70% creator / 30% ByTaste.
- Customer approval window: 72 hours after delivery.
- Cancellation refund: before creator work starts or within 2 hours of booking.
- Dispute window: 7 days after delivery.
- Creator payouts: weekly on Friday.
- New creator hold: 7 days for first 5 completed bookings.

## Recommended Next Build Step

The next safest code step is to connect real Supabase booking persistence:

1. Seed the current static creators/services into Supabase.
2. Create a real booking row before Stripe checkout.
3. Use that booking UUID in Stripe metadata.
4. Update that booking from the webhook.

That turns the current local demo booking flow into a real production booking/payment record without needing to rewrite the whole app at once.
