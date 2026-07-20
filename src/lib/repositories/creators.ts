import { creatorReviews, creatorTasteProducts, getCreator } from "../../data";
import type { Creator, Review, Service } from "../../types";
import type { TasteProduct } from "../../types/commerce";
import { demoMode } from "../../state";
import { supabase } from "../supabase";
import { mapCreatorRow, mapServiceRow } from "./mappers";

const cache = new Map<string, unknown>();

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (cache.has(key)) return cache.get(key) as T;
  const value = await loader();
  cache.set(key, value);
  return value;
}

export async function getPublishedCreator(handle: string): Promise<Creator | null> {
  if (!supabase) return demoMode ? getCreator(handle) ?? null : null;
  const db = supabase;
  return cached(`creator:${handle}`, async () => {
    const { data } = await db
      .from("creator_profiles")
      .select("*, services(*)")
      .eq("handle", handle)
      .eq("storefront_published", true)
      .maybeSingle();
    return data ? mapCreatorRow(data) : null;
  });
}

export async function getCreatorServices(creatorId: string): Promise<Service[]> {
  if (!supabase) return [];
  const db = supabase;
  return cached(`services:${creatorId}`, async () => {
    const { data } = await db.from("services").select("*").eq("creator_id", creatorId).eq("active", true);
    return data?.map(mapServiceRow) ?? [];
  });
}

export async function getCreatorReviews(creatorId: string, handle?: string): Promise<Review[]> {
  if (!supabase) return demoMode && handle ? creatorReviews(handle) : [];
  const db = supabase;
  return cached(`reviews:${creatorId}`, async () => {
    const { data } = await db
      .from("reviews")
      .select("id,rating,body,customer_name,service_title,creator_id")
      .eq("creator_id", creatorId)
      .eq("verified", true);
    return (
      data?.map((row: any) => ({
        id: row.id,
        creatorHandle: handle ?? "",
        customerName: row.customer_name || "Customer",
        rating: Math.round(row.rating || 0),
        serviceTitle: row.service_title || "Service",
        text: row.body || "",
      })) ?? []
    );
  });
}

export async function getCreatorProducts(creatorId: string, handle?: string): Promise<TasteProduct[]> {
  if (!supabase) return demoMode && handle ? creatorTasteProducts(handle) : [];
  const db = supabase;
  return cached(`products:${creatorId}`, async () => {
    const { data } = await db
      .from("taste_products")
      .select("*")
      .eq("creator_id", creatorId)
      .eq("status", "published");
    return (
      data?.map((row: any) => ({
        id: row.id,
        creatorId: row.creator_id,
        creatorHandle: handle ?? "",
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle || "",
        description: row.description || "",
        coverImageUrl: row.cover_image_url || row.cover_path || "",
        previewText: row.preview_text || "",
        previewItemCount: row.preview_item_count ?? 0,
        totalItemCount: row.total_item_count ?? 0,
        outfitCount: row.outfit_count ?? 0,
        priceCents: row.price_cents ?? 0,
        currency: row.currency || "usd",
        status: row.status,
        accessType: row.access_type,
        affiliateDisclosure: row.affiliate_disclosure || undefined,
        publishedAt: row.published_at || undefined,
        updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
        whoIsItFor: Array.isArray(row.who_is_it_for) ? row.who_is_it_for : [],
        theme: row.theme || "",
      })) ?? []
    );
  });
}

export interface CreatorProof {
  completedBookings: number;
  repeatCustomers: number;
  reviewCount: number;
  averageRating: number | null;
}

export async function getCreatorProof(creatorId: string): Promise<CreatorProof> {
  if (!supabase) return { completedBookings: 0, repeatCustomers: 0, reviewCount: 0, averageRating: null };
  const db = supabase;
  return cached(`proof:${creatorId}`, async () => {
    const [{ count: completedBookings }, { count: reviewCount }, { data: reviews }] = await Promise.all([
      db.from("bookings").select("id", { count: "exact", head: true }).eq("creator_id", creatorId).not("approved_at", "is", null),
      db.from("reviews").select("id", { count: "exact", head: true }).eq("creator_id", creatorId).eq("verified", true),
      db.from("reviews").select("rating").eq("creator_id", creatorId).eq("verified", true),
    ]);
    const ratings = reviews?.map((row: any) => Number(row.rating)).filter(Number.isFinite) ?? [];
    const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
    return {
      completedBookings: completedBookings ?? 0,
      repeatCustomers: 0,
      reviewCount: reviewCount ?? 0,
      averageRating,
    };
  });
}
