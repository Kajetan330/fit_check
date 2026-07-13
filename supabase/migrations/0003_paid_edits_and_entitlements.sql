alter table public.creator_profiles
  add column if not exists taste_signature text,
  add column if not exists taste_principles text[] not null default '{}',
  add column if not exists storefront_headline text,
  add column if not exists storefront_description text,
  add column if not exists featured_product_id uuid,
  add column if not exists featured_service_id uuid,
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text,
  add column if not exists social_verified_at timestamptz,
  add column if not exists storefront_published boolean not null default false;

create table if not exists public.taste_products (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{3,80}$'),
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  cover_url text,
  preview_text text not null default '',
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  access_type text not null default 'paid' check (access_type in ('free', 'paid')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  affiliate_disclosure text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, slug)
);

create table if not exists public.taste_product_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.taste_products(id) on delete cascade,
  name text not null,
  brand text not null default '',
  image_url text,
  destination_url text check (destination_url is null or destination_url ~* '^https://'),
  price_label text,
  creator_note text not null default '',
  is_preview boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.taste_product_outfits (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.taste_products(id) on delete cascade,
  title text not null,
  image_url text,
  creator_note text not null default '',
  is_preview boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.taste_product_outfit_items (
  outfit_id uuid not null references public.taste_product_outfits(id) on delete cascade,
  item_id uuid not null references public.taste_product_items(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (outfit_id, item_id)
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.taste_products(id) on delete restrict,
  payment_status public.payment_status not null default 'requires_payment',
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  referral_creator_id uuid references public.creator_profiles(id) on delete set null,
  referral_code text,
  purchased_at timestamptz,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_entitlements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.taste_products(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.controlled_share_links (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  resource_type text not null check (resource_type in ('lookbook', 'paid_edit')),
  resource_id uuid not null,
  token_hash text not null unique,
  passcode_hash text,
  expires_at timestamptz,
  revoked_at timestamptz,
  max_views integer check (max_views is null or max_views > 0),
  view_count integer not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.creator_referral_links (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  code text not null unique check (code ~ '^[a-zA-Z0-9_-]{3,80}$'),
  destination_type text not null default 'storefront' check (destination_type in ('storefront', 'taste_product', 'service')),
  destination_id uuid,
  campaign text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (
    event_name in (
      'storefront_view',
      'product_preview_view',
      'service_view',
      'share_clicked',
      'checkout_started',
      'checkout_completed',
      'booking_started',
      'booking_completed'
    )
  ),
  creator_id uuid references public.creator_profiles(id) on delete set null,
  product_id uuid references public.taste_products(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_session_id text,
  referral_code text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

do $$ begin
  alter table public.creator_profiles
    add constraint creator_profiles_featured_product_fk
    foreign key (featured_product_id) references public.taste_products(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.creator_profiles
    add constraint creator_profiles_featured_service_fk
    foreign key (featured_service_id) references public.services(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

drop trigger if exists taste_products_set_updated_at on public.taste_products;
create trigger taste_products_set_updated_at
before update on public.taste_products
for each row execute function public.set_updated_at();

drop trigger if exists taste_product_items_set_updated_at on public.taste_product_items;
create trigger taste_product_items_set_updated_at
before update on public.taste_product_items
for each row execute function public.set_updated_at();

drop trigger if exists taste_product_outfits_set_updated_at on public.taste_product_outfits;
create trigger taste_product_outfits_set_updated_at
before update on public.taste_product_outfits
for each row execute function public.set_updated_at();

drop trigger if exists purchases_set_updated_at on public.purchases;
create trigger purchases_set_updated_at
before update on public.purchases
for each row execute function public.set_updated_at();

drop trigger if exists creator_referral_links_set_updated_at on public.creator_referral_links;
create trigger creator_referral_links_set_updated_at
before update on public.creator_referral_links
for each row execute function public.set_updated_at();

create unique index if not exists product_entitlements_one_active_idx
  on public.product_entitlements(customer_id, product_id)
  where revoked_at is null;

create unique index if not exists purchases_one_successful_product_idx
  on public.purchases(customer_id, product_id)
  where payment_status in ('paid', 'released');

create index if not exists taste_products_creator_status_idx on public.taste_products(creator_id, status);
create index if not exists taste_product_items_product_preview_idx on public.taste_product_items(product_id, is_preview);
create index if not exists taste_product_outfits_product_preview_idx on public.taste_product_outfits(product_id, is_preview);
create index if not exists purchases_customer_status_idx on public.purchases(customer_id, payment_status);
create index if not exists purchases_product_status_idx on public.purchases(product_id, payment_status);
create index if not exists commerce_events_creator_created_idx on public.commerce_events(creator_id, created_at desc);

create or replace function public.owns_taste_product(taste_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.taste_products tp
    join public.creator_profiles cp on cp.id = tp.creator_id
    where tp.id = taste_product_id
    and cp.user_id = auth.uid()
  );
$$;

create or replace function public.has_product_entitlement(taste_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.product_entitlements e
    where e.product_id = taste_product_id
    and e.customer_id = auth.uid()
    and e.revoked_at is null
  );
$$;

create or replace function public.increment_share_view(share_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.controlled_share_links
  set view_count = view_count + 1
  where id = share_id;
$$;

alter table public.taste_products enable row level security;
alter table public.taste_product_items enable row level security;
alter table public.taste_product_outfits enable row level security;
alter table public.taste_product_outfit_items enable row level security;
alter table public.purchases enable row level security;
alter table public.product_entitlements enable row level security;
alter table public.controlled_share_links enable row level security;
alter table public.creator_referral_links enable row level security;
alter table public.commerce_events enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists "Public reads published taste products" on public.taste_products;
create policy "Public reads published taste products" on public.taste_products
  for select using (status = 'published' or public.owns_creator_profile(creator_id) or public.is_admin());

drop policy if exists "Creators manage own taste products" on public.taste_products;
create policy "Creators manage own taste products" on public.taste_products
  for all using (public.owns_creator_profile(creator_id) or public.is_admin())
  with check (public.owns_creator_profile(creator_id) or public.is_admin());

drop policy if exists "Preview or entitled users read product items" on public.taste_product_items;
create policy "Preview or entitled users read product items" on public.taste_product_items
  for select using (
    is_preview
    or public.has_product_entitlement(product_id)
    or public.owns_taste_product(product_id)
    or public.is_admin()
  );

drop policy if exists "Creators manage own product items" on public.taste_product_items;
create policy "Creators manage own product items" on public.taste_product_items
  for all using (public.owns_taste_product(product_id) or public.is_admin())
  with check (public.owns_taste_product(product_id) or public.is_admin());

drop policy if exists "Preview or entitled users read product outfits" on public.taste_product_outfits;
create policy "Preview or entitled users read product outfits" on public.taste_product_outfits
  for select using (
    is_preview
    or public.has_product_entitlement(product_id)
    or public.owns_taste_product(product_id)
    or public.is_admin()
  );

drop policy if exists "Creators manage own product outfits" on public.taste_product_outfits;
create policy "Creators manage own product outfits" on public.taste_product_outfits
  for all using (public.owns_taste_product(product_id) or public.is_admin())
  with check (public.owns_taste_product(product_id) or public.is_admin());

drop policy if exists "Preview or entitled users read outfit item links" on public.taste_product_outfit_items;
create policy "Preview or entitled users read outfit item links" on public.taste_product_outfit_items
  for select using (
    exists (
      select 1
      from public.taste_product_outfits o
      where o.id = outfit_id
      and (
        o.is_preview
        or public.has_product_entitlement(o.product_id)
        or public.owns_taste_product(o.product_id)
        or public.is_admin()
      )
    )
  );

drop policy if exists "Creators manage own outfit item links" on public.taste_product_outfit_items;
create policy "Creators manage own outfit item links" on public.taste_product_outfit_items
  for all using (
    exists (
      select 1
      from public.taste_product_outfits o
      where o.id = outfit_id
      and (public.owns_taste_product(o.product_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1
      from public.taste_product_outfits o
      where o.id = outfit_id
      and (public.owns_taste_product(o.product_id) or public.is_admin())
    )
  );

drop policy if exists "Customers and creators read relevant purchases" on public.purchases;
create policy "Customers and creators read relevant purchases" on public.purchases
  for select using (
    customer_id = auth.uid()
    or exists (
      select 1
      from public.taste_products tp
      where tp.id = product_id
      and public.owns_creator_profile(tp.creator_id)
    )
    or public.is_admin()
  );

drop policy if exists "Customers read own entitlements" on public.product_entitlements;
create policy "Customers read own entitlements" on public.product_entitlements
  for select using (customer_id = auth.uid() or public.is_admin());

drop policy if exists "Owners manage share links" on public.controlled_share_links;
create policy "Owners manage share links" on public.controlled_share_links
  for all using (owner_user_id = auth.uid() or public.is_admin())
  with check (owner_user_id = auth.uid() or public.is_admin());

drop policy if exists "Public reads active referral links" on public.creator_referral_links;
create policy "Public reads active referral links" on public.creator_referral_links
  for select using (active = true or public.owns_creator_profile(creator_id) or public.is_admin());

drop policy if exists "Creators manage own referral links" on public.creator_referral_links;
create policy "Creators manage own referral links" on public.creator_referral_links
  for all using (public.owns_creator_profile(creator_id) or public.is_admin())
  with check (public.owns_creator_profile(creator_id) or public.is_admin());

drop policy if exists "Anyone may create limited commerce events" on public.commerce_events;
create policy "Anyone may create limited commerce events" on public.commerce_events
  for insert with check (true);

drop policy if exists "Creators read own commerce events" on public.commerce_events;
create policy "Creators read own commerce events" on public.commerce_events
  for select using (
    user_id = auth.uid()
    or public.owns_creator_profile(creator_id)
    or public.is_admin()
  );

drop policy if exists "Admins manage stripe event log" on public.stripe_events;
create policy "Admins manage stripe event log" on public.stripe_events
  for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('paid-product-media', 'paid-product-media', false)
on conflict (id) do nothing;

drop policy if exists "Creators upload own paid product media" on storage.objects;
create policy "Creators upload own paid product media" on storage.objects
  for insert with check (
    bucket_id = 'paid-product-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Creators manage own paid product media" on storage.objects;
create policy "Creators manage own paid product media" on storage.objects
  for update using (
    bucket_id = 'paid-product-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
