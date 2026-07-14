import type { TasteProduct, TasteProductItem, TasteProductOutfit } from "../types/commerce";
import { supabase } from "./supabase";

export type PaidEditAccessState =
  | "entitled"
  | "not_signed_in"
  | "purchase_pending"
  | "refunded"
  | "revoked"
  | "missing_product"
  | "missing_purchase"
  | "network_error";

interface ApiProduct {
  id: string;
  creator_id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  cover_url?: string | null;
  preview_text?: string | null;
  price_cents: number;
  currency: string;
  access_type: "free" | "paid";
  status: "draft" | "published" | "archived";
  affiliate_disclosure?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
}

interface ApiItem {
  id: string;
  product_id: string;
  name: string;
  brand?: string | null;
  image_url?: string | null;
  destination_url?: string | null;
  price_label?: string | null;
  creator_note?: string | null;
  is_preview: boolean;
  verdict?: "chosen" | "rejected" | null;
  sort_order: number;
}

interface ApiOutfit {
  id: string;
  product_id: string;
  title: string;
  image_url?: string | null;
  creator_note?: string | null;
  is_preview: boolean;
  sort_order: number;
}

interface ApiOutfitItem {
  outfit_id: string;
  item_id: string;
}

interface ApiCreator {
  handle?: string | null;
}

interface PaidEditAccessPayload {
  state: PaidEditAccessState;
  message?: string;
  product?: ApiProduct | null;
  creator?: ApiCreator | null;
  items?: ApiItem[];
  outfits?: ApiOutfit[];
  outfitItems?: ApiOutfitItem[];
}

export interface PaidEditAccessResult {
  state: PaidEditAccessState;
  message?: string;
  product?: TasteProduct;
  items: TasteProductItem[];
  outfits: TasteProductOutfit[];
}

const fallbackDate = "2026-07-14";

function mapProduct(row: ApiProduct, creator: ApiCreator | null | undefined, items: ApiItem[], outfits: ApiOutfit[]): TasteProduct {
  return {
    id: row.id,
    creatorId: row.creator_id,
    creatorHandle: creator?.handle ?? "creator",
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? "",
    description: row.description ?? "",
    coverImageUrl: row.cover_url ?? "",
    previewText: row.preview_text ?? "",
    previewItemCount: items.filter((item) => item.is_preview).length,
    totalItemCount: items.length,
    outfitCount: outfits.length,
    priceCents: row.price_cents,
    currency: row.currency,
    status: row.status,
    accessType: row.access_type,
    affiliateDisclosure: row.affiliate_disclosure ?? undefined,
    publishedAt: row.published_at ?? undefined,
    updatedAt: row.updated_at ?? row.published_at ?? fallbackDate,
    whoIsItFor: [],
    theme: "",
  };
}

function mapItem(row: ApiItem): TasteProductItem {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    brand: row.brand ?? "",
    imageUrl: row.image_url ?? undefined,
    destinationUrl: row.destination_url ?? undefined,
    priceLabel: row.price_label ?? undefined,
    creatorNote: row.creator_note ?? "",
    isPreview: row.is_preview,
    verdict: row.verdict ?? "chosen",
    sortOrder: row.sort_order,
  };
}

function mapOutfit(row: ApiOutfit, links: ApiOutfitItem[]): TasteProductOutfit {
  return {
    id: row.id,
    productId: row.product_id,
    title: row.title,
    imageUrl: row.image_url ?? undefined,
    creatorNote: row.creator_note ?? "",
    itemIds: links.filter((link) => link.outfit_id === row.id).map((link) => link.item_id),
    isPreview: row.is_preview,
    sortOrder: row.sort_order,
  };
}

export async function getPaidEditAccess(purchaseId: string): Promise<PaidEditAccessResult> {
  if (!supabase) {
    return { state: "network_error", message: "Supabase is not configured.", items: [], outfits: [] };
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    return { state: "not_signed_in", message: "Sign in to open this edit.", items: [], outfits: [] };
  }

  try {
    const response = await fetch(`/api/paid-edit-access?purchaseId=${encodeURIComponent(purchaseId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await response.json()) as PaidEditAccessPayload;
    if (!response.ok || payload.state !== "entitled" || !payload.product) {
      return {
        state: payload.state || "network_error",
        message: payload.message,
        items: [],
        outfits: [],
      };
    }

    const apiItems = payload.items ?? [];
    const apiOutfits = payload.outfits ?? [];
    return {
      state: "entitled",
      product: mapProduct(payload.product, payload.creator, apiItems, apiOutfits),
      items: apiItems.map(mapItem),
      outfits: apiOutfits.map((outfit) => mapOutfit(outfit, payload.outfitItems ?? [])),
    };
  } catch {
    return {
      state: "network_error",
      message: "Paid edit access could not be verified. Try again in a moment.",
      items: [],
      outfits: [],
    };
  }
}
