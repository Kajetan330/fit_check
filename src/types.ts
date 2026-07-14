import type { ProductEntitlement, Purchase } from "./types/commerce";

export type Role = "customer" | "creator" | "admin";
export type AppMode = "browse" | "studio";
export type BookingStatus = "intake" | "in_progress" | "ready" | "completed";

export interface User {
  name: string;
  email?: string;
  role: Role;
  mode: AppMode;
}

export interface Service {
  id: string;
  title: string;
  shortTitle: string;
  price: number;
  priceLabel: string;
  turnaround: string;
  summary: string;
  deliverables: string[];
  intakePrompts: string[];
  addOns: string[];
}

export interface Creator {
  id: string;
  handle: string;
  displayName: string;
  location: string;
  avatar: string;
  cover: string;
  bio: string;
  verticals: string[];
  aesthetics: string[];
  followerCount: number;
  rating: number;
  reviewCount: number;
  avgTurnaround: string;
  verified: boolean;
  rising: boolean;
  services: Service[];
  tasteSignature: string;
  tastePrinciples: string[];
  storefrontHeadline: string;
  storefrontDescription: string;
  featuredProductId?: string;
  featuredServiceId?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  socialVerifiedAt?: string;
  storefrontPublished: boolean;
  availability: string;
  socials: {
    instagram: string;
    tiktok?: string;
  };
}

export interface TaggedItem {
  name: string;
  brand: string;
  price?: string;
  link?: string;
}

export interface Post {
  id: string;
  creatorHandle: string;
  type: "outfit" | "transformation" | "moodboard" | "designer-drop" | "article";
  title: string;
  date: string;
  image: string;
  summary: string;
  body: string;
  tags: string[];
  pinned?: boolean;
  portfolio?: boolean;
  taggedItems: TaggedItem[];
}

export interface DesignerPiece {
  id: string;
  creatorHandle: string;
  title: string;
  image: string;
  price: string;
  shopLabel: string;
  description: string;
}

export interface Review {
  id: string;
  creatorHandle: string;
  customerName: string;
  rating: number;
  serviceTitle: string;
  text: string;
}

export interface ClosetItem {
  id: string;
  name: string;
  category: string;
  color: string;
  image: string;
  tags: string[];
  lastWorn: string;
}

export interface LookbookOutfit {
  id: string;
  title: string;
  image: string;
  notes: string;
  items: string[];
}

export interface Booking {
  id: string;
  creatorHandle: string;
  serviceId: string;
  serviceTitle: string;
  customerName: string;
  price: number;
  status: BookingStatus;
  paymentStatus?: "demo" | "requires_payment" | "paid" | "released" | "refunded" | "failed";
  createdAt: string;
  dueDate: string;
  brief: string;
  budget: string;
  closetItemIds: string[];
  deliverable?: {
    title: string;
    voiceNoteLabel: string;
    outfits: LookbookOutfit[];
  };
}

export interface AppState {
  user: User | null;
  savedCreatorHandles: string[];
  savedPostIds: string[];
  closet: ClosetItem[];
  bookings: Booking[];
  creatorApplications: CreatorApplication[];
  creatorDrafts: Record<string, CreatorDraft>;
  studioPosts: Post[];
  purchases: Purchase[];
  entitlements: ProductEntitlement[];
}

export interface CreatorApplication {
  id: string;
  handle: string;
  aesthetic: string;
  links: string;
  status: "submitted" | "reviewing" | "approved" | "rejected";
  createdAt: string;
}

export interface CreatorDraft {
  displayName: string;
  bio: string;
  location: string;
  aesthetics: string;
}
