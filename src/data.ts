import type { Booking, ClosetItem, Creator, DesignerPiece, Post, QuizLook, Review, Service } from "./types";

const mediaMap: Record<string, string> = {
  "photo-1524504388940-b1c1722653e1": "fitcheck-media-01.jpg",
  "photo-1515886657613-9f3515b0c78f": "fitcheck-media-03.jpg",
  "photo-1494790108377-be9c29b29330": "fitcheck-media-07.jpg",
  "photo-1529139574466-a303027c1d8b": "fitcheck-media-08.jpg",
  "photo-1531123897727-8f129e1688ce": "fitcheck-media-10.jpg",
  "photo-1496747611176-843222e1e57c": "fitcheck-media-13.jpg",
  "photo-1534528741775-53994a69daeb": "fitcheck-media-15.jpg",
  "photo-1503342217505-b0a15ec3261c": "fitcheck-media-14.jpg",
  "photo-1516762689617-e1cffcef479d": "fitcheck-media-02.jpg",
  "photo-1485968579580-b6d095142e6e": "fitcheck-media-16.jpg",
  "photo-1523398002811-999ca8dec234": "fitcheck-media-09.jpg",
  "photo-1487412720507-e7ab37603c6f": "fitcheck-media-11.jpg",
  "photo-1512436991641-6745cdb1723f": "fitcheck-media-12.jpg",
  "photo-1542291026-7eec264c27ff": "fitcheck-media-06.jpg",
  "photo-1506629905607-d9c297d1461d": "fitcheck-media-04.jpg",
  "photo-1542060748-10c28b62716f": "fitcheck-media-05.jpg",
  "photo-1543163521-1bf539c55dd2": "fitcheck-media-06.jpg",
  "photo-1551488831-00ddcb6c6bd3": "fitcheck-media-14.jpg",
};

const image = (id: string, _width = 1200) => `/assets/media/${mediaMap[id] ?? "fitcheck-media-01.jpg"}`;

const fashionServices: Service[] = [
  {
    id: "quick-take",
    title: "Quick Take",
    shortTitle: "Quick Take",
    price: 25,
    priceLabel: "$25",
    turnaround: "24h",
    summary: "One styling question answered with a short voice or video-style note.",
    deliverables: ["90-second creator note", "One outfit or purchase call", "One revision"],
    intakePrompts: ["What decision do you need help with?", "Where will you wear it?"],
    addOns: ["Rush reply", "Second option"],
  },
  {
    id: "style-diagnosis",
    title: "Style Diagnosis",
    shortTitle: "Diagnosis",
    price: 65,
    priceLabel: "$65",
    turnaround: "2 days",
    summary: "A clear read on your current aesthetic, palette, silhouettes, and next direction.",
    deliverables: ["Written style read", "Reference board", "Palette and silhouette notes", "One revision"],
    intakePrompts: ["What feels off about your style right now?", "Which references feel closest?"],
    addOns: ["Voice walkthrough", "Occasion capsule"],
  },
  {
    id: "wardrobe-audit",
    title: "Wardrobe Audit",
    shortTitle: "Audit",
    price: 115,
    priceLabel: "$115",
    turnaround: "3-5 days",
    summary: "Upload your closet and get keep, donate, repair calls plus outfits from what you own.",
    deliverables: ["Tagged closet inventory", "Keep, donate, repair calls", "8-12 styled outfits", "Voice walkthrough"],
    intakePrompts: ["What do you want your wardrobe to do better?", "Which pieces are hardest to wear?"],
    addOns: ["Rush delivery", "Extra 5 outfits", "Shopping gap list"],
  },
  {
    id: "capsule-build",
    title: "Capsule Build",
    shortTitle: "Capsule",
    price: 165,
    priceLabel: "$165",
    turnaround: "5 days",
    summary: "A focused shopping edit for a season, trip, or aesthetic shift with budget tiers.",
    deliverables: ["8-15 linked pieces", "Budget tier guidance", "Fit and styling notes", "Affiliate-ready shopping list"],
    intakePrompts: ["What is the capsule for?", "What total budget should the edit respect?"],
    addOns: ["Plus-size alternatives", "Sustainable-only edit", "Designer piece integration"],
  },
];

export const creators: Creator[] = [
  {
    id: "creator-amara",
    handle: "amara-okafor",
    displayName: "Amara Okafor",
    location: "Lagos and London",
    avatar: image("photo-1524504388940-b1c1722653e1", 500),
    cover: image("photo-1515886657613-9f3515b0c78f"),
    bio: "Soft minimalist wardrobes with practical polish and warm-weather tailoring.",
    verticals: ["Fashion"],
    aesthetics: ["soft minimalist", "tailoring", "warm neutrals", "workwear"],
    followers: "87k",
    rating: 4.96,
    reviewCount: 142,
    avgTurnaround: "2d",
    verified: true,
    rising: false,
    services: fashionServices.map((service) =>
      service.id === "wardrobe-audit" ? { ...service, price: 95, priceLabel: "$95" } : service,
    ),
    socials: { instagram: "@amara.styles", tiktok: "@amarafits" },
  },
  {
    id: "creator-lena",
    handle: "lena-park",
    displayName: "Lena Park",
    location: "Seoul",
    avatar: image("photo-1494790108377-be9c29b29330", 500),
    cover: image("photo-1529139574466-a303027c1d8b"),
    bio: "Sharp city uniforms, modular layers, and capsule systems for small closets.",
    verticals: ["Fashion"],
    aesthetics: ["streetwear", "monochrome", "modular", "city"],
    followers: "34k",
    rating: 4.91,
    reviewCount: 67,
    avgTurnaround: "3d",
    verified: false,
    rising: true,
    services: fashionServices.map((service) =>
      service.id === "capsule-build" ? { ...service, price: 145, priceLabel: "$145" } : service,
    ),
    socials: { instagram: "@lena.layers" },
  },
  {
    id: "creator-noor",
    handle: "noor-hassan",
    displayName: "Noor Hassan",
    location: "Toronto",
    avatar: image("photo-1531123897727-8f129e1688ce", 500),
    cover: image("photo-1496747611176-843222e1e57c"),
    bio: "Modest occasionwear, elegant proportions, and color stories that photograph beautifully.",
    verticals: ["Fashion"],
    aesthetics: ["modest", "occasionwear", "romantic", "color"],
    followers: "52k",
    rating: 4.93,
    reviewCount: 88,
    avgTurnaround: "2d",
    verified: true,
    rising: false,
    services: fashionServices,
    socials: { instagram: "@noor.edits", tiktok: "@noorwears" },
  },
  {
    id: "creator-ivy",
    handle: "ivy-marlowe",
    displayName: "Ivy Marlowe",
    location: "New York",
    avatar: image("photo-1534528741775-53994a69daeb", 500),
    cover: image("photo-1503342217505-b0a15ec3261c"),
    bio: "Dark academia, thrifted tailoring, and designer drops for people who love texture.",
    verticals: ["Fashion", "Design"],
    aesthetics: ["dark academia", "vintage", "texture", "designer"],
    followers: "18k",
    rating: 4.88,
    reviewCount: 31,
    avgTurnaround: "4d",
    verified: false,
    rising: true,
    services: fashionServices.filter((service) => service.id !== "quick-take"),
    socials: { instagram: "@ivymakes" },
  },
];

export const posts: Post[] = [
  {
    id: "post-amara-01",
    creatorHandle: "amara-okafor",
    type: "transformation",
    title: "Maya's summer wardrobe reset",
    date: "2026-06-28",
    image: image("photo-1516762689617-e1cffcef479d"),
    summary: "A closet of almost-right basics became ten office-to-dinner looks.",
    body: "Maya had strong pieces, but every outfit felt unfinished. The fix was not more shopping. We built repeatable formulas around linen trousers, crisp tanks, one structured blazer, and two accent shoes.",
    tags: ["soft minimalist", "workwear", "transformation"],
    pinned: true,
    portfolio: true,
    taggedItems: [
      { name: "Cream linen trouser", brand: "Owned by customer" },
      { name: "Black column tank", brand: "COS" },
      { name: "Cognac slingback", brand: "Independent seller" },
    ],
  },
  {
    id: "post-amara-02",
    creatorHandle: "amara-okafor",
    type: "outfit",
    title: "The travel blazer formula",
    date: "2026-06-18",
    image: image("photo-1485968579580-b6d095142e6e"),
    summary: "A carry-on friendly outfit that still looks deliberate after a long flight.",
    body: "The blazer is soft enough to fold, the trouser does not crease badly, and the shoe is polished without asking too much of your feet.",
    tags: ["tailoring", "travel", "capsule"],
    portfolio: true,
    taggedItems: [
      { name: "Soft blazer", brand: "Arket", price: "$189" },
      { name: "Wide trouser", brand: "Uniqlo", price: "$49" },
      { name: "Leather tote", brand: "Cuyana", price: "$268" },
    ],
  },
  {
    id: "post-lena-01",
    creatorHandle: "lena-park",
    type: "moodboard",
    title: "Five-piece rainy city capsule",
    date: "2026-06-22",
    image: image("photo-1523398002811-999ca8dec234"),
    summary: "Weatherproof pieces that still feel precise, not tactical.",
    body: "The trick is choosing one technical layer, one clean trouser, and a bag that can handle weather without looking like hiking gear.",
    tags: ["streetwear", "monochrome", "city"],
    pinned: true,
    portfolio: true,
    taggedItems: [
      { name: "Shell jacket", brand: "Rains" },
      { name: "Nylon midi skirt", brand: "Weekday" },
      { name: "Chelsea boot", brand: "Vagabond" },
    ],
  },
  {
    id: "post-noor-01",
    creatorHandle: "noor-hassan",
    type: "outfit",
    title: "One dress, three wedding guest reads",
    date: "2026-06-20",
    image: image("photo-1487412720507-e7ab37603c6f"),
    summary: "A romantic base look adapted for garden, city hall, and evening receptions.",
    body: "The same dress can move across formality if the accessories shift the structure. I used metallic tension, a soft wrap, and one saturated bag.",
    tags: ["modest", "romantic", "occasionwear"],
    pinned: true,
    portfolio: true,
    taggedItems: [
      { name: "Long-sleeve satin dress", brand: "Aab" },
      { name: "Metallic mule", brand: "Reformation" },
      { name: "Silk wrap", brand: "Vintage" },
    ],
  },
  {
    id: "post-ivy-01",
    creatorHandle: "ivy-marlowe",
    type: "designer-drop",
    title: "Study Coat No. 02",
    date: "2026-06-12",
    image: image("photo-1512436991641-6745cdb1723f"),
    summary: "A cropped wool coat designed for layered autumn uniforms.",
    body: "This drop started from a thrifted men's coat and became a small run of cropped wool jackets with deep pockets and a narrow collar.",
    tags: ["dark academia", "designer", "vintage"],
    pinned: true,
    portfolio: true,
    taggedItems: [
      { name: "Study Coat No. 02", brand: "Ivy Marlowe Studio", price: "$340" },
      { name: "Pleated trouser", brand: "Vintage" },
    ],
  },
  {
    id: "post-ivy-02",
    creatorHandle: "ivy-marlowe",
    type: "article",
    title: "How to buy texture secondhand",
    date: "2026-05-30",
    image: image("photo-1515886657613-9f3515b0c78f"),
    summary: "A field guide for wool, suede, heavy cotton, and pieces worth repairing.",
    body: "Texture is what makes a small wardrobe feel rich. The best secondhand finds usually have one excellent material and one repairable flaw.",
    tags: ["vintage", "texture", "dark academia"],
    portfolio: false,
    taggedItems: [
      { name: "Wool blazer", brand: "Vintage" },
      { name: "Suede belt", brand: "Vintage" },
    ],
  },
];

export const designerPieces: DesignerPiece[] = [
  {
    id: "piece-ivy-01",
    creatorHandle: "ivy-marlowe",
    title: "Study Coat No. 02",
    image: image("photo-1512436991641-6745cdb1723f"),
    price: "$340",
    shopLabel: "Shop Ivy Studio",
    description: "Cropped wool outer layer with a narrow collar and reinforced pockets.",
  },
  {
    id: "piece-ivy-02",
    creatorHandle: "ivy-marlowe",
    title: "Archive Ribbon Bag",
    image: image("photo-1542291026-7eec264c27ff"),
    price: "$126",
    shopLabel: "View drop",
    description: "Small structured bag made from reclaimed ribbon trim and deadstock lining.",
  },
];

export const reviews: Review[] = [
  {
    id: "review-01",
    creatorHandle: "amara-okafor",
    customerName: "Maya R.",
    rating: 5,
    serviceTitle: "Wardrobe Audit",
    text: "Amara made my own clothes feel new. The voice notes were direct, kind, and easy to act on.",
  },
  {
    id: "review-02",
    creatorHandle: "noor-hassan",
    customerName: "Elena P.",
    rating: 5,
    serviceTitle: "Capsule Build",
    text: "Noor understood modest wedding guest styling better than anyone I found locally.",
  },
  {
    id: "review-03",
    creatorHandle: "lena-park",
    customerName: "Jules K.",
    rating: 5,
    serviceTitle: "Quick Take",
    text: "Fast, specific, and honestly saved me from buying the wrong coat.",
  },
];

export const closetSeed: ClosetItem[] = [
  {
    id: "closet-01",
    name: "Cream linen trouser",
    category: "Bottom",
    color: "Cream",
    image: image("photo-1506629905607-d9c297d1461d", 800),
    tags: ["linen", "workwear", "summer"],
    lastWorn: "2026-06-25",
  },
  {
    id: "closet-02",
    name: "Black column tank",
    category: "Top",
    color: "Black",
    image: image("photo-1542060748-10c28b62716f", 800),
    tags: ["basic", "layering"],
    lastWorn: "2026-06-29",
  },
  {
    id: "closet-03",
    name: "Cognac slingback",
    category: "Shoe",
    color: "Cognac",
    image: image("photo-1543163521-1bf539c55dd2", 800),
    tags: ["leather", "polished"],
    lastWorn: "2026-06-22",
  },
  {
    id: "closet-04",
    name: "Charcoal soft blazer",
    category: "Outerwear",
    color: "Charcoal",
    image: image("photo-1551488831-00ddcb6c6bd3", 800),
    tags: ["tailoring", "travel"],
    lastWorn: "2026-06-18",
  },
];

export const bookingSeed: Booking[] = [
  {
    id: "booking-2841",
    creatorHandle: "amara-okafor",
    serviceId: "wardrobe-audit",
    serviceTitle: "Wardrobe Audit",
    customerName: "Maya R.",
    price: 95,
    status: "ready",
    paymentStatus: "paid",
    createdAt: "2026-06-29",
    dueDate: "2026-07-04",
    brief: "Soft minimalist summer work wardrobe with fewer repeated panic outfits.",
    budget: "$400 gap budget",
    closetItemIds: ["closet-01", "closet-02", "closet-03", "closet-04"],
    deliverable: {
      title: "Maya's Summer Work Reset",
      voiceNoteLabel: "6 min creator walkthrough",
      outfits: [
        {
          id: "look-01",
          title: "Monday clean start",
          image: image("photo-1529139574466-a303027c1d8b"),
          notes: "Use the charcoal blazer as the structure and let the linen trouser keep it light.",
          items: ["Charcoal soft blazer", "Cream linen trouser", "Black column tank", "Cognac slingback"],
        },
        {
          id: "look-02",
          title: "Dinner after office",
          image: image("photo-1516762689617-e1cffcef479d"),
          notes: "Swap the blazer for a bare shoulder line and keep the cognac shoe for warmth.",
          items: ["Cream linen trouser", "Black column tank", "Cognac slingback"],
        },
      ],
    },
  },
];

export const quizLooks: QuizLook[] = [
  {
    id: "quiz-01",
    image: image("photo-1515886657613-9f3515b0c78f"),
    title: "Clean tailoring",
    tags: ["soft minimalist", "tailoring", "workwear"],
  },
  {
    id: "quiz-02",
    image: image("photo-1523398002811-999ca8dec234"),
    title: "City layers",
    tags: ["streetwear", "monochrome", "city"],
  },
  {
    id: "quiz-03",
    image: image("photo-1487412720507-e7ab37603c6f"),
    title: "Romantic occasion",
    tags: ["romantic", "occasionwear", "modest"],
  },
  {
    id: "quiz-04",
    image: image("photo-1512436991641-6745cdb1723f"),
    title: "Textured vintage",
    tags: ["dark academia", "vintage", "texture"],
  },
  {
    id: "quiz-05",
    image: image("photo-1503342217505-b0a15ec3261c"),
    title: "Quiet weekend",
    tags: ["soft minimalist", "capsule", "warm neutrals"],
  },
  {
    id: "quiz-06",
    image: image("photo-1485968579580-b6d095142e6e"),
    title: "Travel uniform",
    tags: ["travel", "tailoring", "capsule"],
  },
];

export const aestheticTags = Array.from(new Set(creators.flatMap((creator) => creator.aesthetics))).sort();

export const getCreator = (handle: string) => creators.find((creator) => creator.handle === handle);

export const getService = (creatorHandle: string, serviceId: string) =>
  getCreator(creatorHandle)?.services.find((service) => service.id === serviceId);

export const getPost = (postId: string) => posts.find((post) => post.id === postId);

export const creatorPosts = (handle: string) => posts.filter((post) => post.creatorHandle === handle);

export const creatorPortfolio = (handle: string) =>
  posts.filter((post) => post.creatorHandle === handle && post.portfolio);

export const creatorReviews = (handle: string) => reviews.filter((review) => review.creatorHandle === handle);

export const creatorDesignerPieces = (handle: string) =>
  designerPieces.filter((piece) => piece.creatorHandle === handle);
