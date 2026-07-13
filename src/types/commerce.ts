export type TasteProductStatus = "draft" | "published" | "archived";
export type TasteProductAccess = "free" | "paid";

export interface TasteProduct {
  id: string;
  creatorId: string;
  creatorHandle: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  coverImageUrl: string;
  previewText: string;
  previewItemCount: number;
  totalItemCount: number;
  outfitCount: number;
  priceCents: number;
  currency: string;
  status: TasteProductStatus;
  accessType: TasteProductAccess;
  affiliateDisclosure?: string;
  publishedAt?: string;
  updatedAt: string;
  whoIsItFor: string[];
  theme: string;
}

export interface TasteProductItem {
  id: string;
  productId: string;
  name: string;
  brand: string;
  imageUrl?: string;
  destinationUrl?: string;
  priceLabel?: string;
  creatorNote: string;
  isPreview: boolean;
  sortOrder: number;
}

export interface TasteProductOutfit {
  id: string;
  productId: string;
  title: string;
  imageUrl?: string;
  creatorNote: string;
  itemIds: string[];
  isPreview: boolean;
  sortOrder: number;
}

export interface Purchase {
  id: string;
  customerId: string;
  productId: string;
  paymentStatus: "requires_payment" | "paid" | "refunded" | "failed";
  amountCents: number;
  currency: string;
  purchasedAt?: string;
}

export interface ProductEntitlement {
  id: string;
  customerId: string;
  productId: string;
  sourcePurchaseId: string;
  grantedAt: string;
  revokedAt?: string;
}

export interface ControlledShareLink {
  id: string;
  resourceType: "lookbook" | "paid_edit";
  resourceId: string;
  expiresAt?: string;
  revokedAt?: string;
  maxViews?: number;
  viewCount: number;
}
