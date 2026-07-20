import type { Creator, Service } from "../../types";
import { creators } from "../../data";

const emptyStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export function mapServiceRow(row: any): Service {
  const priceCents = typeof row.price_cents === "number" ? row.price_cents : 0;
  return {
    id: row.slug || row.id,
    title: row.title || "Styling service",
    shortTitle: row.short_title || row.title || "Service",
    price: Math.round(priceCents / 100),
    priceLabel: priceCents ? `$${Math.round(priceCents / 100)}` : "$0",
    turnaround: row.turnaround || "3 days",
    summary: row.summary || row.description || "Private styling service.",
    deliverables: emptyStringArray(row.deliverables),
    intakePrompts: emptyStringArray(row.intake_prompts),
    addOns: emptyStringArray(row.add_ons),
    whoFor: emptyStringArray(row.who_for),
    notFor: emptyStringArray(row.not_for),
    youSend: row.you_send || undefined,
    youReceive: row.you_receive || undefined,
    customerEffortMins: typeof row.customer_effort_mins === "number" ? row.customer_effort_mins : undefined,
    revisionTerms: row.revision_terms || undefined,
    exampleResultImage: row.example_result_image || undefined,
    effortNote: row.effort_note || undefined,
  };
}

export function mapCreatorRow(row: any): Creator {
  const fallback = creators.find((creator) => creator.handle === row.handle) ?? creators[0];
  const services = Array.isArray(row.services) && row.services.length ? row.services.map(mapServiceRow) : fallback.services;

  return {
    ...fallback,
    id: row.id || fallback.id,
    handle: row.handle || fallback.handle,
    displayName: row.display_name || row.name || fallback.displayName,
    location: row.location || fallback.location,
    avatar: row.avatar_url || row.avatar_path || fallback.avatar,
    cover: row.cover_url || row.hero_path || row.cover_path || fallback.cover,
    bio: row.bio || fallback.bio,
    aesthetics: emptyStringArray(row.aesthetics).length ? emptyStringArray(row.aesthetics) : fallback.aesthetics,
    followerCount: typeof row.follower_count === "number" ? row.follower_count : fallback.followerCount,
    rating: typeof row.average_rating === "number" ? row.average_rating : fallback.rating,
    reviewCount: typeof row.review_count === "number" ? row.review_count : fallback.reviewCount,
    avgTurnaround: row.avg_turnaround || fallback.avgTurnaround,
    verified: Boolean(row.verified ?? fallback.verified),
    rising: Boolean(row.rising ?? fallback.rising),
    services,
    tasteSignature: row.taste_signature || fallback.tasteSignature,
    tastePrinciples: emptyStringArray(row.taste_principles).length
      ? emptyStringArray(row.taste_principles)
      : fallback.tastePrinciples,
    storefrontHeadline: row.custom_headline || row.storefront_headline || fallback.storefrontHeadline,
    storefrontDescription: row.storefront_description || fallback.storefrontDescription,
    primaryOfferType: row.primary_offer_type || fallback.primaryOfferType,
    featuredProductId: row.featured_product_id || fallback.featuredProductId,
    featuredServiceId: row.featured_service_id || fallback.featuredServiceId,
    instagramUrl: row.instagram_url || fallback.instagramUrl,
    tiktokUrl: row.tiktok_url || fallback.tiktokUrl,
    socialVerifiedAt: row.social_verified_at || fallback.socialVerifiedAt,
    storefrontPublished: Boolean(row.storefront_published ?? row.published ?? fallback.storefrontPublished),
    availability: row.availability || fallback.availability,
    socials: {
      instagram: row.instagram_handle || fallback.socials.instagram,
      tiktok: row.tiktok_handle || fallback.socials.tiktok,
    },
  };
}
