create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('customer', 'creator', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.booking_status as enum ('intake', 'in_progress', 'ready', 'completed', 'revision_requested', 'disputed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum ('not_started', 'requires_payment', 'paid', 'released', 'refunded', 'failed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.application_status as enum ('submitted', 'reviewing', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.user_role not null default 'customer',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9-]{3,40}$'),
  display_name text not null,
  location text,
  bio text not null default '',
  cover_url text,
  avatar_url text,
  verticals text[] not null default array['Fashion'],
  aesthetics text[] not null default '{}',
  instagram text,
  tiktok text,
  follower_count integer not null default 0,
  rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  avg_turnaround text,
  verified boolean not null default false,
  rising boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  slug text not null,
  title text not null,
  short_title text not null,
  price_cents integer not null check (price_cents >= 0),
  turnaround text not null,
  summary text not null,
  deliverables text[] not null default '{}',
  intake_prompts text[] not null default '{}',
  add_ons text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, slug)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  slug text not null,
  post_type text not null check (post_type in ('outfit', 'transformation', 'moodboard', 'designer-drop', 'article', 'photo-set')),
  title text not null,
  image_url text,
  summary text not null,
  body text not null default '',
  tags text[] not null default '{}',
  tagged_items jsonb not null default '[]',
  pinned boolean not null default false,
  portfolio boolean not null default false,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, slug)
);

create table if not exists public.designer_pieces (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  title text not null,
  image_url text,
  price_label text,
  shop_url text,
  description text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  color text,
  image_url text,
  tags text[] not null default '{}',
  last_worn date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  status public.booking_status not null default 'intake',
  payment_status public.payment_status not null default 'requires_payment',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  price_cents integer not null check (price_cents >= 0),
  platform_fee_cents integer not null default 0,
  creator_payout_cents integer not null default 0,
  brief text not null default '',
  budget text,
  due_at timestamptz,
  revision_requested_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_closet_items (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  closet_item_id uuid not null references public.closet_items(id) on delete cascade,
  primary key (booking_id, closet_item_id)
);

create table if not exists public.booking_uploads (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  content_type text,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'flagged', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.lookbooks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  title text not null,
  voice_note_url text,
  notes text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lookbook_outfits (
  id uuid primary key default gen_random_uuid(),
  lookbook_id uuid not null references public.lookbooks(id) on delete cascade,
  title text not null,
  image_url text,
  notes text,
  items text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text,
  creator_response text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_creators (
  user_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, creator_id)
);

create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  handle text not null,
  aesthetic text not null,
  links text not null,
  status public.application_status not null default 'submitted',
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moderation_items (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid references public.booking_uploads(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  opened_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'needs_creator', 'needs_customer', 'resolved_refund', 'resolved_release')),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creator_profiles_handle_idx on public.creator_profiles(handle);
create index if not exists creator_profiles_aesthetics_idx on public.creator_profiles using gin(aesthetics);
create index if not exists services_creator_id_idx on public.services(creator_id);
create index if not exists posts_creator_id_idx on public.posts(creator_id);
create index if not exists posts_tags_idx on public.posts using gin(tags);
create index if not exists bookings_customer_id_idx on public.bookings(customer_id);
create index if not exists bookings_creator_id_idx on public.bookings(creator_id);
create index if not exists closet_items_user_id_idx on public.closet_items(user_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists creator_profiles_set_updated_at on public.creator_profiles;
create trigger creator_profiles_set_updated_at before update on public.creator_profiles for each row execute function public.set_updated_at();
drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at before update on public.services for each row execute function public.set_updated_at();
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts for each row execute function public.set_updated_at();
drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at before update on public.bookings for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.services enable row level security;
alter table public.posts enable row level security;
alter table public.designer_pieces enable row level security;
alter table public.closet_items enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_closet_items enable row level security;
alter table public.booking_uploads enable row level security;
alter table public.lookbooks enable row level security;
alter table public.lookbook_outfits enable row level security;
alter table public.reviews enable row level security;
alter table public.saved_creators enable row level security;
alter table public.saved_posts enable row level security;
alter table public.creator_applications enable row level security;
alter table public.moderation_items enable row level security;
alter table public.disputes enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

create or replace function public.owns_creator_profile(creator_profile_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.creator_profiles
    where id = creator_profile_id
    and user_id = auth.uid()
  );
$$;

create policy "Public can read published creators" on public.creator_profiles
  for select using (published = true or user_id = auth.uid() or public.is_admin());
create policy "Creators can update own profile" on public.creator_profiles
  for update using (user_id = auth.uid() or public.is_admin());
create policy "Authenticated creators can create profile" on public.creator_profiles
  for insert with check (user_id = auth.uid() or public.is_admin());

create policy "Users can read own profile" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "Users can update own profile" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
create policy "Users can insert own profile" on public.profiles
  for insert with check (id = auth.uid());

create policy "Public can read active services" on public.services
  for select using (active = true or public.owns_creator_profile(creator_id) or public.is_admin());
create policy "Creators manage own services" on public.services
  for all using (public.owns_creator_profile(creator_id) or public.is_admin())
  with check (public.owns_creator_profile(creator_id) or public.is_admin());

create policy "Public can read published posts" on public.posts
  for select using (published = true or public.owns_creator_profile(creator_id) or public.is_admin());
create policy "Creators manage own posts" on public.posts
  for all using (public.owns_creator_profile(creator_id) or public.is_admin())
  with check (public.owns_creator_profile(creator_id) or public.is_admin());

create policy "Public can read published designer pieces" on public.designer_pieces
  for select using (published = true or public.owns_creator_profile(creator_id) or public.is_admin());
create policy "Creators manage own designer pieces" on public.designer_pieces
  for all using (public.owns_creator_profile(creator_id) or public.is_admin())
  with check (public.owns_creator_profile(creator_id) or public.is_admin());

create policy "Users manage own closet" on public.closet_items
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "Customers and creators read bookings" on public.bookings
  for select using (
    customer_id = auth.uid()
    or public.owns_creator_profile(creator_id)
    or public.is_admin()
  );
create policy "Customers create own bookings" on public.bookings
  for insert with check (customer_id = auth.uid());
create policy "Creators and customers update visible bookings" on public.bookings
  for update using (
    customer_id = auth.uid()
    or public.owns_creator_profile(creator_id)
    or public.is_admin()
  );

create policy "Booking participants read closet links" on public.booking_closet_items
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
      and (b.customer_id = auth.uid() or public.owns_creator_profile(b.creator_id) or public.is_admin())
    )
  );
create policy "Customers attach own closet items to bookings" on public.booking_closet_items
  for insert with check (
    exists (
      select 1 from public.bookings b
      join public.closet_items c on c.id = closet_item_id
      where b.id = booking_id
      and b.customer_id = auth.uid()
      and c.user_id = auth.uid()
    )
  );

create policy "Booking participants read uploads" on public.booking_uploads
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id
      and public.owns_creator_profile(b.creator_id)
    )
    or public.is_admin()
  );
create policy "Customers add booking uploads" on public.booking_uploads
  for insert with check (user_id = auth.uid());

create policy "Booking participants read lookbooks" on public.lookbooks
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
      and (b.customer_id = auth.uid() or public.owns_creator_profile(b.creator_id) or public.is_admin())
    )
  );
create policy "Creators manage booking lookbooks" on public.lookbooks
  for all using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
      and (public.owns_creator_profile(b.creator_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
      and (public.owns_creator_profile(b.creator_id) or public.is_admin())
    )
  );

create policy "Booking participants read outfits" on public.lookbook_outfits
  for select using (
    exists (
      select 1 from public.lookbooks l
      join public.bookings b on b.id = l.booking_id
      where l.id = lookbook_id
      and (b.customer_id = auth.uid() or public.owns_creator_profile(b.creator_id) or public.is_admin())
    )
  );
create policy "Creators manage lookbook outfits" on public.lookbook_outfits
  for all using (
    exists (
      select 1 from public.lookbooks l
      join public.bookings b on b.id = l.booking_id
      where l.id = lookbook_id
      and (public.owns_creator_profile(b.creator_id) or public.is_admin())
    )
  );

create policy "Public can read published reviews" on public.reviews
  for select using (published = true or customer_id = auth.uid() or public.owns_creator_profile(creator_id) or public.is_admin());
create policy "Customers review own completed bookings" on public.reviews
  for insert with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
      and b.customer_id = auth.uid()
      and b.status = 'completed'
    )
  );

create policy "Users manage saved creators" on public.saved_creators
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage saved posts" on public.saved_posts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users create applications" on public.creator_applications
  for insert with check (user_id = auth.uid() or user_id is null);
create policy "Applicants and admins read applications" on public.creator_applications
  for select using (user_id = auth.uid() or public.is_admin());
create policy "Admins manage applications" on public.creator_applications
  for update using (public.is_admin());

create policy "Admins manage moderation" on public.moderation_items
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Booking participants manage disputes" on public.disputes
  for all using (
    opened_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id
      and (b.customer_id = auth.uid() or public.owns_creator_profile(b.creator_id))
    )
  )
  with check (
    opened_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id
      and (b.customer_id = auth.uid() or public.owns_creator_profile(b.creator_id))
    )
  );

insert into storage.buckets (id, name, public)
values
  ('public-media', 'public-media', true),
  ('private-booking-uploads', 'private-booking-uploads', false)
on conflict (id) do nothing;

create policy "Public reads public media" on storage.objects
  for select using (bucket_id = 'public-media');
create policy "Authenticated users upload own public media" on storage.objects
  for insert with check (
    bucket_id = 'public-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users manage own public media" on storage.objects
  for update using (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users upload own private booking media" on storage.objects
  for insert with check (
    bucket_id = 'private-booking-uploads'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users read own private booking media" on storage.objects
  for select using (
    bucket_id = 'private-booking-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
