# Production Setup

FitCheck now runs in demo mode without credentials and is wired for production services when environment variables are added.

## 1. Supabase

Create a Supabase project, then run:

```sql
-- Supabase SQL editor
-- paste and run supabase/migrations/0001_initial_schema.sql
```

Add these frontend variables in Vercel and `.env.local`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Add this server-only variable in Vercel:

```bash
SUPABASE_SERVICE_ROLE_KEY=
```

Also configure Auth redirect URLs:

```text
http://127.0.0.1:5173
https://your-production-domain.com
```

## 2. Stripe

Create a Stripe account and add:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Webhook endpoint:

```text
https://your-production-domain.com/api/stripe-webhook
```

Recommended events:

```text
checkout.session.completed
payment_intent.payment_failed
charge.refunded
```

The checkout function is at `api/create-checkout-session.ts`. The webhook currently validates events and includes the handoff point for updating booking/payment rows once Supabase service writes are enabled.

## 3. Deploy

```bash
npm install
npm run check
```

Deploy to Vercel. The included `vercel.json` handles SPA routing.

## 4. Launch Safety

Before taking real bookings:

- Replace demo imagery with licensed or creator-owned media.
- Finalize Terms, Privacy, Creator Terms, and Refund Policy with counsel.
- Verify private upload bucket policies in Supabase.
- Test Stripe checkout in test mode.
- Test creator/customer booking visibility with separate accounts.
- Configure an email provider for transactional notifications.
