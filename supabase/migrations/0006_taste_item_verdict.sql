alter table public.taste_product_items
  add column if not exists verdict text not null default 'chosen'
  check (verdict in ('chosen', 'rejected'));
