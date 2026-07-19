-- ByTaste catalog seed.
--
-- Run after migrations 0001-0005. The seed intentionally attaches the demo
-- creator catalog to an existing Supabase profile instead of inserting auth
-- users by hand. If the project has no signed-in profile yet, create one
-- through the app or Supabase Auth first, then rerun this file.

do $$
declare
  owner_id uuid;
  amara_id uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  lena_id uuid := 'aaaaaaaa-0000-4000-8000-000000000002';
  noor_id uuid := 'aaaaaaaa-0000-4000-8000-000000000003';
  ivy_id uuid := 'aaaaaaaa-0000-4000-8000-000000000004';
begin
  select id
    into owner_id
  from public.profiles
  order by
    case role
      when 'admin' then 0
      when 'creator' then 1
      else 2
    end,
    created_at
  limit 1;

  if owner_id is null then
    raise notice 'ByTaste seed skipped: create at least one Supabase auth profile, then rerun supabase/seed/0001_seed_catalog.sql.';
    return;
  end if;

  insert into public.creator_profiles (
    id,
    user_id,
    handle,
    display_name,
    location,
    bio,
    cover_url,
    avatar_url,
    verticals,
    aesthetics,
    instagram,
    tiktok,
    follower_count,
    rating,
    review_count,
    avg_turnaround,
    verified,
    rising,
    published,
    taste_signature,
    taste_principles,
    storefront_headline,
    storefront_description,
    instagram_url,
    tiktok_url,
    social_verified_at,
    storefront_published
  )
  values
    (
      amara_id,
      owner_id,
      'amara-okafor',
      'Amara Okafor',
      'Lagos and London',
      'Soft minimalist wardrobes with practical polish and warm-weather tailoring.',
      '/assets/media/bytaste-media-03.jpg',
      '/assets/media/bytaste-media-01.jpg',
      array['Fashion']::text[],
      array['soft minimalist', 'tailoring', 'warm neutrals', 'workwear']::text[],
      '@amara.styles',
      '@amarafits',
      87000,
      4.96,
      142,
      '2d',
      true,
      false,
      true,
      'Warm minimalism with one precise statement.',
      array['Repeatable outfit formulas', 'Soft structure before trend', 'Buy fewer gaps, style harder']::text[],
      'Make your everyday wardrobe feel finished.',
      'Amara sells tight seasonal edits and calm one-to-one styling for followers who want polished outfits without overbuying.',
      'https://instagram.com/amara.styles',
      'https://tiktok.com/@amarafits',
      '2026-07-01'::timestamptz,
      true
    ),
    (
      lena_id,
      owner_id,
      'lena-park',
      'Lena Park',
      'Seoul',
      'Sharp city uniforms, modular layers, and capsule systems for small closets.',
      '/assets/media/bytaste-media-08.jpg',
      '/assets/media/bytaste-media-07.jpg',
      array['Fashion']::text[],
      array['streetwear', 'monochrome', 'modular', 'city']::text[],
      '@lena.layers',
      null,
      34000,
      4.91,
      67,
      '3d',
      false,
      true,
      true,
      'Modular city layers that earn their space.',
      array['Weatherproof but intentional', 'Small-closet systems', 'Black, grey, denim, one tension point']::text[],
      'Build the city uniform you actually repeat.',
      'Lena turns creator trust into compact shopping edits and outfit systems for followers with small closets and busy weeks.',
      'https://instagram.com/lena.layers',
      null,
      '2026-06-22'::timestamptz,
      true
    ),
    (
      noor_id,
      owner_id,
      'noor-hassan',
      'Noor Hassan',
      'Toronto',
      'Modest occasionwear, elegant proportions, and color stories that photograph beautifully.',
      '/assets/media/bytaste-media-13.jpg',
      '/assets/media/bytaste-media-10.jpg',
      array['Fashion']::text[],
      array['modest', 'occasionwear', 'romantic', 'color']::text[],
      '@noor.edits',
      '@noorwears',
      52000,
      4.93,
      88,
      '2d',
      true,
      false,
      true,
      'Elegant coverage, saturated color, camera-ready proportions.',
      array['Modesty without flattening shape', 'One color story per event', 'Accessories set the formality']::text[],
      'Occasionwear that photographs beautifully and still feels like you.',
      'Noor packages her event styling taste into wedding-guest edits and personal look selection for modest dressers.',
      'https://instagram.com/noor.edits',
      'https://tiktok.com/@noorwears',
      '2026-06-28'::timestamptz,
      true
    ),
    (
      ivy_id,
      owner_id,
      'ivy-marlowe',
      'Ivy Marlowe',
      'New York',
      'Dark academia, thrifted tailoring, and designer drops for people who love texture.',
      '/assets/media/bytaste-media-14.jpg',
      '/assets/media/bytaste-media-15.jpg',
      array['Fashion', 'Design']::text[],
      array['dark academia', 'vintage', 'texture', 'designer']::text[],
      '@ivymakes',
      null,
      18000,
      4.88,
      31,
      '4d',
      false,
      true,
      true,
      'Texture-led vintage with a designer eye.',
      array['Material first', 'Repairable flaws are opportunity', 'Academic shapes, modern fit']::text[],
      'Find the secondhand pieces worth building around.',
      'Ivy monetises a sharp archive eye through weekly vintage edits, texture guides, and slow-fashion styling.',
      'https://instagram.com/ivymakes',
      null,
      null,
      true
    )
  on conflict (handle) do update set
    user_id = excluded.user_id,
    display_name = excluded.display_name,
    location = excluded.location,
    bio = excluded.bio,
    cover_url = excluded.cover_url,
    avatar_url = excluded.avatar_url,
    verticals = excluded.verticals,
    aesthetics = excluded.aesthetics,
    instagram = excluded.instagram,
    tiktok = excluded.tiktok,
    follower_count = excluded.follower_count,
    rating = excluded.rating,
    review_count = excluded.review_count,
    avg_turnaround = excluded.avg_turnaround,
    verified = excluded.verified,
    rising = excluded.rising,
    published = excluded.published,
    taste_signature = excluded.taste_signature,
    taste_principles = excluded.taste_principles,
    storefront_headline = excluded.storefront_headline,
    storefront_description = excluded.storefront_description,
    instagram_url = excluded.instagram_url,
    tiktok_url = excluded.tiktok_url,
    social_verified_at = excluded.social_verified_at,
    storefront_published = excluded.storefront_published,
    updated_at = now();

  select id into amara_id from public.creator_profiles where handle = 'amara-okafor';
  select id into lena_id from public.creator_profiles where handle = 'lena-park';
  select id into noor_id from public.creator_profiles where handle = 'noor-hassan';
  select id into ivy_id from public.creator_profiles where handle = 'ivy-marlowe';

  insert into public.services (
    id,
    creator_id,
    slug,
    title,
    short_title,
    price_cents,
    turnaround,
    summary,
    deliverables,
    intake_prompts,
    add_ons,
    active
  )
  values
    ('10000000-0000-4000-8000-000000000001', amara_id, 'quick-take', 'Quick Take', 'Quick Take', 2500, '24h', 'One styling question answered with a short voice or video-style note.', array['90-second creator note', 'One outfit or purchase call', 'One revision']::text[], array['What decision do you need help with?', 'Where will you wear it?']::text[], array['Rush reply', 'Second option']::text[], true),
    ('10000000-0000-4000-8000-000000000002', amara_id, 'style-diagnosis', 'Style Diagnosis', 'Diagnosis', 6500, '2 days', 'A clear read on your current aesthetic, palette, silhouettes, and next direction.', array['Written style read', 'Reference board', 'Palette and silhouette notes', 'One revision']::text[], array['What feels off about your style right now?', 'Which references feel closest?']::text[], array['Voice walkthrough', 'Occasion capsule']::text[], true),
    ('10000000-0000-4000-8000-000000000003', amara_id, 'wardrobe-audit', 'Wardrobe Audit', 'Audit', 9500, '3-5 days', 'Upload your closet and get keep, donate, repair calls plus outfits from what you own.', array['Tagged closet inventory', 'Keep, donate, repair calls', '8-12 styled outfits', 'Voice walkthrough']::text[], array['What do you want your wardrobe to do better?', 'Which pieces are hardest to wear?']::text[], array['Rush delivery', 'Extra 5 outfits', 'Shopping gap list']::text[], true),
    ('10000000-0000-4000-8000-000000000004', amara_id, 'capsule-build', 'Capsule Build', 'Capsule', 16500, '5 days', 'A focused shopping edit for a season, trip, or aesthetic shift with budget tiers.', array['8-15 linked pieces', 'Budget tier guidance', 'Fit and styling notes', 'Affiliate-ready shopping list']::text[], array['What is the capsule for?', 'What total budget should the edit respect?']::text[], array['Plus-size alternatives', 'Sustainable-only edit', 'Designer piece integration']::text[], true),
    ('20000000-0000-4000-8000-000000000001', lena_id, 'quick-take', 'Quick Take', 'Quick Take', 2500, '24h', 'One styling question answered with a short voice or video-style note.', array['90-second creator note', 'One outfit or purchase call', 'One revision']::text[], array['What decision do you need help with?', 'Where will you wear it?']::text[], array['Rush reply', 'Second option']::text[], true),
    ('20000000-0000-4000-8000-000000000002', lena_id, 'style-diagnosis', 'Style Diagnosis', 'Diagnosis', 6500, '2 days', 'A clear read on your current aesthetic, palette, silhouettes, and next direction.', array['Written style read', 'Reference board', 'Palette and silhouette notes', 'One revision']::text[], array['What feels off about your style right now?', 'Which references feel closest?']::text[], array['Voice walkthrough', 'Occasion capsule']::text[], true),
    ('20000000-0000-4000-8000-000000000003', lena_id, 'wardrobe-audit', 'Wardrobe Audit', 'Audit', 11500, '3-5 days', 'Upload your closet and get keep, donate, repair calls plus outfits from what you own.', array['Tagged closet inventory', 'Keep, donate, repair calls', '8-12 styled outfits', 'Voice walkthrough']::text[], array['What do you want your wardrobe to do better?', 'Which pieces are hardest to wear?']::text[], array['Rush delivery', 'Extra 5 outfits', 'Shopping gap list']::text[], true),
    ('20000000-0000-4000-8000-000000000004', lena_id, 'capsule-build', 'Capsule Build', 'Capsule', 14500, '5 days', 'A focused shopping edit for a season, trip, or aesthetic shift with budget tiers.', array['8-15 linked pieces', 'Budget tier guidance', 'Fit and styling notes', 'Affiliate-ready shopping list']::text[], array['What is the capsule for?', 'What total budget should the edit respect?']::text[], array['Plus-size alternatives', 'Sustainable-only edit', 'Designer piece integration']::text[], true),
    ('30000000-0000-4000-8000-000000000001', noor_id, 'quick-take', 'Quick Take', 'Quick Take', 2500, '24h', 'One styling question answered with a short voice or video-style note.', array['90-second creator note', 'One outfit or purchase call', 'One revision']::text[], array['What decision do you need help with?', 'Where will you wear it?']::text[], array['Rush reply', 'Second option']::text[], true),
    ('30000000-0000-4000-8000-000000000002', noor_id, 'style-diagnosis', 'Style Diagnosis', 'Diagnosis', 6500, '2 days', 'A clear read on your current aesthetic, palette, silhouettes, and next direction.', array['Written style read', 'Reference board', 'Palette and silhouette notes', 'One revision']::text[], array['What feels off about your style right now?', 'Which references feel closest?']::text[], array['Voice walkthrough', 'Occasion capsule']::text[], true),
    ('30000000-0000-4000-8000-000000000003', noor_id, 'wardrobe-audit', 'Wardrobe Audit', 'Audit', 11500, '3-5 days', 'Upload your closet and get keep, donate, repair calls plus outfits from what you own.', array['Tagged closet inventory', 'Keep, donate, repair calls', '8-12 styled outfits', 'Voice walkthrough']::text[], array['What do you want your wardrobe to do better?', 'Which pieces are hardest to wear?']::text[], array['Rush delivery', 'Extra 5 outfits', 'Shopping gap list']::text[], true),
    ('30000000-0000-4000-8000-000000000004', noor_id, 'capsule-build', 'Capsule Build', 'Capsule', 16500, '5 days', 'A focused shopping edit for a season, trip, or aesthetic shift with budget tiers.', array['8-15 linked pieces', 'Budget tier guidance', 'Fit and styling notes', 'Affiliate-ready shopping list']::text[], array['What is the capsule for?', 'What total budget should the edit respect?']::text[], array['Plus-size alternatives', 'Sustainable-only edit', 'Designer piece integration']::text[], true),
    ('40000000-0000-4000-8000-000000000002', ivy_id, 'style-diagnosis', 'Style Diagnosis', 'Diagnosis', 6500, '2 days', 'A clear read on your current aesthetic, palette, silhouettes, and next direction.', array['Written style read', 'Reference board', 'Palette and silhouette notes', 'One revision']::text[], array['What feels off about your style right now?', 'Which references feel closest?']::text[], array['Voice walkthrough', 'Occasion capsule']::text[], true),
    ('40000000-0000-4000-8000-000000000003', ivy_id, 'wardrobe-audit', 'Wardrobe Audit', 'Audit', 11500, '3-5 days', 'Upload your closet and get keep, donate, repair calls plus outfits from what you own.', array['Tagged closet inventory', 'Keep, donate, repair calls', '8-12 styled outfits', 'Voice walkthrough']::text[], array['What do you want your wardrobe to do better?', 'Which pieces are hardest to wear?']::text[], array['Rush delivery', 'Extra 5 outfits', 'Shopping gap list']::text[], true),
    ('40000000-0000-4000-8000-000000000004', ivy_id, 'capsule-build', 'Capsule Build', 'Capsule', 16500, '5 days', 'A focused shopping edit for a season, trip, or aesthetic shift with budget tiers.', array['8-15 linked pieces', 'Budget tier guidance', 'Fit and styling notes', 'Affiliate-ready shopping list']::text[], array['What is the capsule for?', 'What total budget should the edit respect?']::text[], array['Plus-size alternatives', 'Sustainable-only edit', 'Designer piece integration']::text[], true)
  on conflict (creator_id, slug) do update set
    title = excluded.title,
    short_title = excluded.short_title,
    price_cents = excluded.price_cents,
    turnaround = excluded.turnaround,
    summary = excluded.summary,
    deliverables = excluded.deliverables,
    intake_prompts = excluded.intake_prompts,
    add_ons = excluded.add_ons,
    active = excluded.active,
    updated_at = now();

  update public.creator_profiles
  set primary_offer_type = case handle
    when 'lena-park' then 'edit'
    when 'ivy-marlowe' then 'edit'
    else 'service'
  end,
  updated_at = now()
  where handle in ('amara-okafor', 'lena-park', 'noor-hassan', 'ivy-marlowe');

  update public.services
  set
    who_for = case slug
      when 'quick-take' then array['Fast purchase decisions', 'One event outfit', 'Followers who already trust the creator eye']::text[]
      when 'style-diagnosis' then array['Style resets', 'Aesthetic transitions', 'People who want a sharper repeatable direction']::text[]
      when 'wardrobe-audit' then array['Closet cleanups', 'No-buy months', 'People with good pieces that are hard to combine']::text[]
      when 'capsule-build' then array['Seasonal capsules', 'Travel wardrobes', 'Followers ready to buy with a clear budget']::text[]
      else who_for
    end,
    effort_note = case slug
      when 'quick-take' then 'Best with 1-3 photos and a short decision prompt.'
      when 'style-diagnosis' then 'Best with a few current outfits and 2-3 reference images.'
      when 'wardrobe-audit' then 'Best with clear photos of the pieces you actually wear.'
      when 'capsule-build' then 'Best with your budget, sizes, no-go brands, and two references.'
      else effort_note
    end,
    updated_at = now()
  where creator_id in (amara_id, lena_id, noor_id, ivy_id);

  insert into public.taste_products (
    id,
    creator_id,
    slug,
    title,
    subtitle,
    description,
    cover_url,
    preview_text,
    price_cents,
    currency,
    access_type,
    status,
    affiliate_disclosure,
    published_at
  )
  values
    ('11111111-1111-4111-8111-111111111111', amara_id, 'copenhagen-2027-edit', 'Copenhagen 2027 Edit', 'Twenty warm-minimal pieces I would actually buy now.', 'A paid seasonal taste product for followers who want Amara''s buying eye without booking a full wardrobe audit.', '/assets/media/bytaste-media-03.jpg', 'The edit is built around soft tailoring, controlled texture, and pieces that can move from office to travel.', 1900, 'usd', 'paid', 'published', 'Some shopping links may be affiliate links. Amara''s notes stay independent of commission.', '2026-07-08'::timestamptz),
    ('22222222-2222-4222-8222-222222222222', lena_id, 'rainy-city-capsule', 'Rainy City Capsule', 'A compact weatherproof edit for small closets.', 'Lena''s one-to-many shopping list for followers who want city layers that look intentional, not tactical.', '/assets/media/bytaste-media-09.jpg', 'Start with one technical shell, one clean trouser, and one bag that can handle weather.', 1500, 'usd', 'paid', 'published', 'Contains affiliate shopping links where available.', '2026-07-06'::timestamptz),
    ('33333333-3333-4333-8333-333333333333', noor_id, 'wedding-guest-under-200', 'Wedding Guest Dresses Under $200', 'Modest, camera-ready options with accessory formulas.', 'Noor''s paid edit for followers who need event polish fast and want a clear read on fit, color, and formality.', '/assets/media/bytaste-media-11.jpg', 'The strongest low-stress guest looks usually need one saturated color and one metallic tension point.', 1700, 'usd', 'paid', 'published', 'Some product links may generate affiliate revenue.', '2026-07-03'::timestamptz),
    ('44444444-4444-4444-8444-444444444444', ivy_id, 'vintage-listings-worth-buying', 'Vintage Listings Worth Buying This Week', 'Texture, tailoring, and repairable finds before they disappear.', 'A weekly paid edit that turns Ivy''s archive eye into a fast shopping decision layer for followers.', '/assets/media/bytaste-media-12.jpg', 'This week is about wool texture, narrow collars, and suede accessories with fixable flaws.', 1200, 'usd', 'paid', 'published', 'Listings may disappear quickly; some links may be affiliate links.', '2026-07-07'::timestamptz)
  on conflict (id) do update set
    creator_id = excluded.creator_id,
    slug = excluded.slug,
    title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    cover_url = excluded.cover_url,
    preview_text = excluded.preview_text,
    price_cents = excluded.price_cents,
    currency = excluded.currency,
    access_type = excluded.access_type,
    status = excluded.status,
    affiliate_disclosure = excluded.affiliate_disclosure,
    published_at = excluded.published_at,
    updated_at = now();

  update public.creator_profiles
  set featured_product_id = '11111111-1111-4111-8111-111111111111',
      featured_service_id = (select id from public.services where creator_id = amara_id and slug = 'quick-take'),
      updated_at = now()
  where id = amara_id;

  update public.creator_profiles
  set featured_product_id = '22222222-2222-4222-8222-222222222222',
      featured_service_id = (select id from public.services where creator_id = lena_id and slug = 'capsule-build'),
      updated_at = now()
  where id = lena_id;

  update public.creator_profiles
  set featured_product_id = '33333333-3333-4333-8333-333333333333',
      featured_service_id = (select id from public.services where creator_id = noor_id and slug = 'quick-take'),
      updated_at = now()
  where id = noor_id;

  update public.creator_profiles
  set featured_product_id = '44444444-4444-4444-8444-444444444444',
      featured_service_id = (select id from public.services where creator_id = ivy_id and slug = 'style-diagnosis'),
      updated_at = now()
  where id = ivy_id;

  insert into public.taste_product_items (
    id,
    product_id,
    name,
    brand,
    image_url,
    destination_url,
    price_label,
    creator_note,
    is_preview,
    verdict,
    sort_order
  )
  values
    ('11111111-aaaa-4aaa-8aaa-000000000001', '11111111-1111-4111-8111-111111111111', 'Washed linen blazer', 'Arket', '/assets/media/bytaste-media-16.jpg', null, '$189', 'Preview: the shoulder is soft enough for travel but still gives the outfit a frame.', true, 'chosen', 1),
    ('11111111-aaaa-4aaa-8aaa-000000000002', '11111111-1111-4111-8111-111111111111', 'Cream column tank', 'COS', '/assets/media/bytaste-media-05.jpg', null, '$45', 'Preview: use this as the quiet base under every stronger texture.', true, 'chosen', 2),
    ('11111111-aaaa-4aaa-8aaa-000000000003', '11111111-1111-4111-8111-111111111111', 'Cognac city slingback', 'Independent seller', '/assets/media/bytaste-media-06.jpg', 'https://example.com/cognac-city-slingback', '$128', 'Full edit: this warms the entire palette and stops the neutral base from going flat.', false, 'chosen', 3),
    ('11111111-aaaa-4aaa-8aaa-000000000004', '11111111-1111-4111-8111-111111111111', 'Structured raffia tote', 'Cuyana', '/assets/media/bytaste-media-06.jpg', 'https://example.com/structured-raffia-tote', '$268', 'Full edit: the texture makes the office pieces feel summer-specific without becoming beachwear.', false, 'chosen', 4),
    ('11111111-aaaa-4aaa-8aaa-000000000005', '11111111-1111-4111-8111-111111111111', 'Cropped puffer', 'Trend rack', '/assets/media/bytaste-media-03.jpg', null, null, 'Preview: skip it here. The cropped volume fights the long-line tailoring this edit is built around.', true, 'rejected', 5),
    ('22222222-aaaa-4aaa-8aaa-000000000001', '22222222-2222-4222-8222-222222222222', 'Matte shell jacket', 'Rains', '/assets/media/bytaste-media-09.jpg', null, '$140', 'Preview: matte finish keeps the technical layer from taking over the whole outfit.', true, 'chosen', 1),
    ('22222222-aaaa-4aaa-8aaa-000000000002', '22222222-2222-4222-8222-222222222222', 'Nylon midi skirt', 'Weekday', '/assets/media/bytaste-media-08.jpg', 'https://example.com/nylon-midi-skirt', '$69', 'Full edit: gives the capsule motion while staying weather-safe.', false, 'chosen', 2),
    ('33333333-aaaa-4aaa-8aaa-000000000001', '33333333-3333-4333-8333-333333333333', 'Long-sleeve satin dress', 'Aab', '/assets/media/bytaste-media-11.jpg', null, '$178', 'Preview: the sleeve and drape give coverage without losing occasion softness.', true, 'chosen', 1),
    ('33333333-aaaa-4aaa-8aaa-000000000002', '33333333-3333-4333-8333-333333333333', 'Metallic low mule', 'Reformation', '/assets/media/bytaste-media-06.jpg', 'https://example.com/metallic-low-mule', '$168', 'Full edit: a low metallic shoe raises formality while keeping the dress wearable.', false, 'chosen', 2),
    ('44444444-aaaa-4aaa-8aaa-000000000001', '44444444-4444-4444-8444-444444444444', 'Narrow-collar wool blazer', 'Vintage', '/assets/media/bytaste-media-12.jpg', null, '$88', 'Preview: inspect collar roll and lining first; this shape is worth tailoring.', true, 'chosen', 1),
    ('44444444-aaaa-4aaa-8aaa-000000000002', '44444444-4444-4444-8444-444444444444', 'Deadstock ribbon bag', 'Archive seller', '/assets/media/bytaste-media-06.jpg', 'https://example.com/deadstock-ribbon-bag', '$126', 'Full edit: the trim reads intentional with wool, not costume, if the outfit stays otherwise matte.', false, 'chosen', 2)
  on conflict (id) do update set
    product_id = excluded.product_id,
    name = excluded.name,
    brand = excluded.brand,
    image_url = excluded.image_url,
    destination_url = excluded.destination_url,
    price_label = excluded.price_label,
    creator_note = excluded.creator_note,
    is_preview = excluded.is_preview,
    verdict = excluded.verdict,
    sort_order = excluded.sort_order,
    updated_at = now();

  insert into public.taste_product_outfits (
    id,
    product_id,
    title,
    image_url,
    creator_note,
    is_preview,
    sort_order
  )
  values
    ('11111111-bbbb-4bbb-8bbb-000000000001', '11111111-1111-4111-8111-111111111111', 'Arrival day tailoring', '/assets/media/bytaste-media-16.jpg', 'Preview outfit: blazer, column tank, and linen trouser. Keep accessories warm, not black.', true, 1),
    ('11111111-bbbb-4bbb-8bbb-000000000002', '11111111-1111-4111-8111-111111111111', 'Office to dinner without changing clothes', '/assets/media/bytaste-media-02.jpg', 'Full edit: the shoe and tote do the evening work; do not add jewelry unless it is sculptural.', false, 2),
    ('22222222-bbbb-4bbb-8bbb-000000000001', '22222222-2222-4222-8222-222222222222', 'Rain commute, gallery after', '/assets/media/bytaste-media-09.jpg', 'Preview outfit: keep the shell matte and the base column dark.', true, 1),
    ('33333333-bbbb-4bbb-8bbb-000000000001', '33333333-3333-4333-8333-333333333333', 'Garden ceremony', '/assets/media/bytaste-media-11.jpg', 'Preview outfit: saturated dress, low metallic shoe, and one soft wrap.', true, 1),
    ('44444444-bbbb-4bbb-8bbb-000000000001', '44444444-4444-4444-8444-444444444444', 'Library texture stack', '/assets/media/bytaste-media-12.jpg', 'Preview outfit: narrow wool over heavy cotton with one small decorative texture.', true, 1)
  on conflict (id) do update set
    product_id = excluded.product_id,
    title = excluded.title,
    image_url = excluded.image_url,
    creator_note = excluded.creator_note,
    is_preview = excluded.is_preview,
    sort_order = excluded.sort_order,
    updated_at = now();

  insert into public.taste_product_outfit_items (outfit_id, item_id, sort_order)
  values
    ('11111111-bbbb-4bbb-8bbb-000000000001', '11111111-aaaa-4aaa-8aaa-000000000001', 1),
    ('11111111-bbbb-4bbb-8bbb-000000000001', '11111111-aaaa-4aaa-8aaa-000000000002', 2),
    ('11111111-bbbb-4bbb-8bbb-000000000002', '11111111-aaaa-4aaa-8aaa-000000000002', 1),
    ('11111111-bbbb-4bbb-8bbb-000000000002', '11111111-aaaa-4aaa-8aaa-000000000003', 2),
    ('11111111-bbbb-4bbb-8bbb-000000000002', '11111111-aaaa-4aaa-8aaa-000000000004', 3),
    ('22222222-bbbb-4bbb-8bbb-000000000001', '22222222-aaaa-4aaa-8aaa-000000000001', 1),
    ('33333333-bbbb-4bbb-8bbb-000000000001', '33333333-aaaa-4aaa-8aaa-000000000001', 1),
    ('44444444-bbbb-4bbb-8bbb-000000000001', '44444444-aaaa-4aaa-8aaa-000000000001', 1)
  on conflict (outfit_id, item_id) do update set
    sort_order = excluded.sort_order;

  insert into public.creator_referral_links (
    id,
    creator_id,
    code,
    destination_type,
    destination_id,
    campaign,
    active
  )
  values
    ('55555555-0000-4000-8000-000000000001', amara_id, 'amara-launch', 'storefront', null, 'launch-seed', true),
    ('55555555-0000-4000-8000-000000000002', lena_id, 'lena-launch', 'storefront', null, 'launch-seed', true),
    ('55555555-0000-4000-8000-000000000003', noor_id, 'noor-launch', 'storefront', null, 'launch-seed', true),
    ('55555555-0000-4000-8000-000000000004', ivy_id, 'ivy-launch', 'storefront', null, 'launch-seed', true)
  on conflict (code) do update set
    creator_id = excluded.creator_id,
    destination_type = excluded.destination_type,
    destination_id = excluded.destination_id,
    campaign = excluded.campaign,
    active = excluded.active,
    updated_at = now();
end $$;
