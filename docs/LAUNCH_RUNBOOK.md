# ByTaste Launch Runbook

Status as of 2026-07-13. Everything below is verified or has exact steps.

## Already Verified

- App live at https://fit-check-ecru.vercel.app (200)
- `/api/health`: all flags true, `checkout_sessions` table reachable
- Stripe test webhook: deployed, signature-validating (400 on unsigned POST)
- Supabase project active, service role key working
- Full test checkout completed; booking synced to Paid
- `npm run check` passes (build + API typecheck)
- Legal pages expanded to full lawyer-ready drafts at `/legal/*`
- Media provenance documented (`docs/MEDIA_PROVENANCE.md`) - all images are
  generated originals, no stock/licensing exposure

## Blocking Before Real Payments

### 1. Rotate any previously exposed keys (~10 min)

Rotate anything that ever appeared in a repo commit, chat, screenshot, or
shared doc:

- **Supabase service role key**: Dashboard -> Project Settings -> API ->
  regenerate `service_role` key -> paste new value into Vercel env var
  `SUPABASE_SERVICE_ROLE_KEY` (Production).
- **Stripe test secret key** (if ever exposed): Dashboard (test mode) ->
  Developers -> API keys -> Roll key -> paste into Vercel `STRIPE_SECRET_KEY`.
- Then: Vercel -> Deployments -> latest -> Redeploy (uncheck build cache).
- Verify: open `/api/health` - all flags must still read true.

### 2. Fill legal placeholders + lawyer review

The drafts at `/legal/*` now cover EU/GDPR ground but contain
`[BRACKETED PLACEHOLDERS]` that must be filled before counsel review:

- `[LEGAL ENTITY NAME]`, `[REGISTERED ADDRESS]`, `[COMPANY REG NO / VAT ID]`
- `[SUPPORT EMAIL]`, `[PRIVACY EMAIL]`, `[DATE]`
- Retention period `[X months]` in the Privacy Policy

Then send `docs/LEGAL_REVIEW_PACKET.md` + the five `/legal/*` pages to a
lawyer. Every `[COUNSEL: ...]` note in the drafts is a specific question
for them. Do not launch paid services to EU consumers before this review.

### 3. Replace generated people imagery

Per the rule in `docs/MEDIA_PROVENANCE.md`: before public launch, replace
generated people/customer imagery with creator-provided or licensed photos
and collect written releases. Mechanically:

1. Drop replacement JPGs into `public/assets/media/` using the same
   filenames (`bytaste-media-01.jpg` ... `-16.jpg`), or
2. Edit the `mediaMap` at the top of `src/data.ts` to point at new files.
3. Keep a signed release on file for every identifiable person.
4. Commit, push, redeploy.

### 4. Mobile QA (~30 min, real devices)

Run `docs/QA_CHECKLIST.md` end-to-end on:
- iPhone Safari (booking flow + Stripe Checkout + return redirect)
- Android Chrome (same)
Pay attention to: Stripe Checkout redirect back, photo upload from camera,
and PWA install prompt behavior.

## Deferred (Stripe live mode - do when ready for real money)

1. Stripe Dashboard -> toggle to Live -> complete business activation
   (identity, bank account; can take up to 1-2 days - start early).
2. Live webhook: Developers -> Webhooks (live mode) -> Add destination ->
   `https://<production-domain>/api/stripe-webhook` -> same 3 events
   (`checkout.session.completed`, `payment_intent.payment_failed`,
   `charge.refunded`).
3. In Vercel, replace `STRIPE_SECRET_KEY` with the `sk_live_` value and
   `STRIPE_WEBHOOK_SECRET` with the live `whsec_` value. Type them directly
   into the Vercel fields; never paste secrets into chats or docs.
4. Redeploy. Verify `/api/health` still all-true and webhook returns 400
   on unsigned POST.
5. One real-card live test booking, then refund it from the Stripe
   Dashboard.
6. Stripe Connect (Express) setup before paying creators - note this also
   requires app code for creator onboarding + transfers; scope separately.

## Optional

### Custom domain

Vercel -> Settings -> Domains -> add domain -> set DNS records at registrar.
If it becomes the primary domain, also update:
- `VITE_APP_URL` in Vercel (then redeploy - it's a build-time var)
- Stripe webhook endpoint URL (test and live)
- Supabase Auth -> URL configuration (site URL + redirect URLs)
