# ByTaste Deployment And Configuration Change Log

Project: ByTaste
Production URL: `https://fit-check-ecru.vercel.app`  
GitHub repo: `github.com/Kajetan330/fit_check`  
Date of work: July 5, 2026

## Overview

This document records infrastructure and configuration changes made across Vercel, Stripe, and Supabase to bring ByTaste to a working deployed test state.

No secret values are stored here. Any credentials pasted into chat or screenshots should be considered exposed and rotated.

## Vercel Environment Variables

The Vercel `fit-check` project was configured with the environment variables from `.env.example` for Production and Preview:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

The production URL is `https://fit-check-ecru.vercel.app`.

## Vercel Redeployment

After saving variables, the latest production deployment was redeployed from commit `0f15f72` on `main`. The build completed successfully and the deployment became Ready.

## Stripe Test Mode And Webhook

Stripe was configured in test/sandbox mode for the first end-to-end checkout.

Webhook endpoint:

```text
https://fit-check-ecru.vercel.app/api/stripe-webhook
```

Subscribed events:

```text
checkout.session.completed
payment_intent.payment_failed
charge.refunded
```

Stripe delivered a `checkout.session.completed` event successfully with a `200 OK` response of `{"received": true}`.

## End-To-End Test Checkout

The deployed site completed a booking-to-payment flow:

1. Signed in on production using magic-link auth.
2. Opened Amara Okafor's profile.
3. Booked the `Quick Take` service.
4. Completed the three-step booking form.
5. Redirected to a Stripe Checkout `cs_test` session.
6. Paid using Stripe's standard test card.
7. Returned to the app with `?checkout=success`.

At that point the app still displayed payment as pending because webhook persistence had not yet been implemented in source code.

## Supabase Migration

The initial schema migration `supabase/migrations/0001_initial_schema.sql` was run successfully in Supabase SQL Editor.

Verification showed:

- 17 tables created.
- 33 RLS policies in place.
- RLS enabled on all 17 tables.
- 2 storage buckets created: `public-media` and `private-booking-uploads`.

## Supabase Auth URLs

Supabase Auth redirect settings were configured:

- Site URL: `https://fit-check-ecru.vercel.app`
- Redirect URLs:
  - `https://fit-check-ecru.vercel.app/**`
  - `http://127.0.0.1:5173/**`

## Remaining Work After This Configuration

- Replace local demo persistence with Supabase-backed reads/writes.
- Persist Stripe checkout/payment status into Supabase.
- Connect real file upload records to the storage buckets.
- Replace generated placeholder media with creator-owned/licensed launch media.
- Complete legal review before taking real payments.

## Security Action Required

Any live Stripe or Supabase secret values exposed in chat or screenshots should be rotated/revoked in their respective dashboards, then updated in Vercel.
