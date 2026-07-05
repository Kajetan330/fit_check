create table if not exists public.checkout_sessions (
  booking_reference text primary key,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  creator_handle text not null,
  service_title text not null,
  amount_cents integer not null check (amount_cents >= 0),
  customer_email text,
  payment_status text not null default 'requires_payment'
    check (payment_status in ('requires_payment', 'paid', 'failed', 'refunded', 'cancelled')),
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists checkout_sessions_set_updated_at on public.checkout_sessions;
create trigger checkout_sessions_set_updated_at
before update on public.checkout_sessions
for each row execute function public.set_updated_at();

alter table public.checkout_sessions enable row level security;

drop policy if exists "Admins manage checkout sessions" on public.checkout_sessions;
create policy "Admins manage checkout sessions" on public.checkout_sessions
  for all using (public.is_admin()) with check (public.is_admin());

create index if not exists checkout_sessions_stripe_session_idx
  on public.checkout_sessions(stripe_checkout_session_id);

create index if not exists checkout_sessions_payment_status_idx
  on public.checkout_sessions(payment_status);
