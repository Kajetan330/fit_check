import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  Database,
  FileText,
  Gavel,
  Globe2,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  LockKeyhole,
  Mic2,
  Search,
  Settings,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Upload,
  UserRound,
  WalletCards,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  aestheticTags,
  creatorDesignerPieces,
  creatorPortfolio,
  creatorPosts,
  creatorReviews,
  creatorTasteProducts,
  creators,
  getCreator,
  getPost,
  getService,
  getTasteProduct,
  getTasteProductById,
  posts,
  tasteProductFullItems,
  tasteProductFullOutfits,
  tasteProductPreviewItems,
  tasteProductPreviewOutfits,
} from "./data";
import { useAppState } from "./state";
import { ShareButton } from "./features/sharing/ShareButton";
import { createCommerceCheckout } from "./lib/commerce";
import { getProductionHealth, type ProductionHealth } from "./lib/health";
import { createCheckoutSession, getCheckoutStatus } from "./lib/payments";
import { captureReferral, creatorSharePath, editSharePath, safeRedirectPath, serviceSharePath, sharePageUrl } from "./lib/sharing";
import { supabase, supabaseStatus } from "./lib/supabase";
import { uploadPrivateImage } from "./lib/uploads";
import type { Booking, ClosetItem, Creator, CreatorDraft, Post, Service } from "./types";
import type { TasteProduct, TasteProductItem, TasteProductOutfit } from "./types/commerce";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const productMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(cents / 100);
const formatFollowerCount = (value: number) => compactNumber.format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

const dueDateFor = (service: Service) => {
  const days = service.turnaround.includes("24") ? 1 : service.id === "wardrobe-audit" ? 5 : 3;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const statusLabel: Record<Booking["status"], string> = {
  intake: "Intake received",
  in_progress: "In progress",
  ready: "Ready to review",
  completed: "Completed",
};

const paymentLabel: Record<NonNullable<Booking["paymentStatus"]>, string> = {
  demo: "Demo payment",
  requires_payment: "Payment pending",
  paid: "Paid",
  released: "Released",
  refunded: "Refunded",
  failed: "Payment failed",
};

const newBookingReference = () =>
  `booking-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`;

const applyCreatorDraft = (creator: Creator, draft?: CreatorDraft): Creator => {
  if (!draft) return creator;
  return {
    ...creator,
    displayName: draft.displayName || creator.displayName,
    bio: draft.bio || creator.bio,
    location: draft.location || creator.location,
    aesthetics: draft.aesthetics
      ? draft.aesthetics
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : creator.aesthetics,
  };
};

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/quiz" element={<Navigate to="/" replace />} />
        <Route path="/c/:handle" element={<CreatorRedirectPage />} />
        <Route path="/creator/:handle" element={<CreatorProfilePage />} />
        <Route path="/creator/:handle/edit/:slug" element={<EditLandingPage />} />
        <Route path="/creator/:handle/service/:serviceSlug" element={<ServiceDetailPage />} />
        <Route path="/post/:postId" element={<PostPage />} />
        <Route path="/book/:handle/:serviceId" element={<BookingPage />} />
        <Route path="/library" element={<CustomerLibraryPage />} />
        <Route path="/library/edits/:purchaseId" element={<PaidEditReaderPage />} />
        <Route path="/share/:token" element={<ControlledSharePage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/bookings/:bookingId" element={<BookingDetailPage />} />
        <Route path="/closet" element={<ClosetPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/studio/storefront" element={<StorefrontStudioPage />} />
        <Route path="/studio/edits" element={<StudioEditsPage />} />
        <Route path="/studio/edits/new" element={<EditEditorPage />} />
        <Route path="/studio/analytics" element={<StudioAnalyticsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/launch" element={<LaunchReadinessPage />} />
        <Route path="/legal/:slug" element={<LegalPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/creator/signin" element={<CreatorSignInPage />} />
        <Route path="/apply" element={<CreatorApplyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function AppShell() {
  const { state, setMode, signOut } = useAppState();
  const user = state.user;
  const location = useLocation();

  useEffect(() => {
    captureReferral(location.search);
  }, [location.search]);

  const navItems =
    user?.role === "admin"
      ? [
          ["/", "Discover"],
          ["/admin", "Admin"],
          ["/launch", "Launch"],
          ["/studio", "Studio"],
        ]
      : user?.role === "creator"
        ? [
            ["/studio/storefront", "Storefront"],
            ["/studio", "Orders"],
            ["/studio/edits", "Edits"],
            ["/studio/analytics", "Earnings"],
          ]
        : user?.role === "customer"
          ? [
              ["/", "Discover"],
              ["/library", "Library"],
              ["/closet", "Closet"],
              ["/bookings", "Bookings"],
            ]
          : [
              ["/", "Discover"],
              [`/creator/${creators[0].handle}/edit/${creatorTasteProducts(creators[0].handle)[0]?.slug ?? ""}`, "Edits"],
              ["/apply", "Become a creator"],
            ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="FitCheck home">
          <span className="brand-mark">F</span>
          <span>FitCheck</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-actions">
          {user?.role === "creator" || user?.role === "admin" ? (
            <div className="mode-toggle" aria-label="Mode">
              <NavLink onClick={() => setMode("browse")} to="/">
                Browse
              </NavLink>
              <NavLink onClick={() => setMode("studio")} to="/studio">
                Studio
              </NavLink>
            </div>
          ) : null}
          {user ? (
            <>
              <Link className="user-chip" to={user.role === "admin" ? "/admin" : user.role === "creator" ? "/studio" : "/bookings"}>
                <UserRound size={16} />
                <span>{user.name}</span>
              </Link>
              <button className="icon-button" title="Sign out" aria-label="Sign out" onClick={signOut}>
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link className="button small dark" to="/signin">
              <UserRound size={16} />
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="page-frame">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {user?.role === "creator" ? (
          <>
            <NavLink to="/studio/storefront">
              <UserRound size={19} />
              <span>Storefront</span>
            </NavLink>
            <NavLink to="/studio">
              <CalendarDays size={19} />
              <span>Orders</span>
            </NavLink>
            <NavLink to="/studio/edits">
              <FileText size={19} />
              <span>Edits</span>
            </NavLink>
            <NavLink to="/studio/analytics">
              <WalletCards size={19} />
              <span>Earnings</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/">
          <Search size={19} />
          <span>Discover</span>
        </NavLink>
            <NavLink to="/library">
              <Bookmark size={19} />
              <span>Library</span>
            </NavLink>
        <NavLink to="/closet">
          <Shirt size={19} />
          <span>Closet</span>
        </NavLink>
        <NavLink to="/bookings">
          <CalendarDays size={19} />
          <span>Bookings</span>
        </NavLink>
          </>
        )}
      </nav>
    </div>
  );
}

function DiscoverPage() {
  const { state } = useAppState();
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const recentPosts = [...state.studioPosts, ...posts].slice(0, 4);

  const filteredCreators = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return creators.filter((creator) => {
      const matchesQuery =
        !normalized ||
        [creator.displayName, creator.handle, creator.bio, creator.location, ...creator.aesthetics]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesTag = activeTag === "all" || creator.aesthetics.includes(activeTag);
      return matchesQuery && matchesTag;
    });
  }, [activeTag, query]);

  const featured = creators[0];
  const rising = creators.filter((creator) => creator.rising);

  return (
    <div className="page-stack">
      <section className="discover-hero">
        <div className="discover-copy">
          <p className="eyebrow">Creator-led styling</p>
          <h1>Find the creator whose taste already feels like yours.</h1>
          <p className="lead">
            Browse profiles, save posts, and book productised styling services with clear scope and deliverables.
          </p>
          <div className="search-panel">
            <Search size={20} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search creators, aesthetics, cities"
              aria-label="Search creators"
            />
          </div>
          <div className="quick-actions">
            <Link className="button dark" to={`/creator/${featured.handle}`}>
              <ArrowRight size={18} />
              Open featured profile
            </Link>
          </div>
        </div>
        <Link className="featured-profile" to={`/creator/${featured.handle}`}>
          <img src={featured.cover} alt={`${featured.displayName} styling work`} />
          <div className="featured-profile-info">
            <div>
              <p>Featured creator</p>
              <h2>{featured.displayName}</h2>
              <span>{featured.bio}</span>
            </div>
            <ChevronRight size={24} />
          </div>
        </Link>
      </section>

      <section className="filter-strip" aria-label="Aesthetic filters">
        <button className={activeTag === "all" ? "active" : ""} onClick={() => setActiveTag("all")}>
          All
        </button>
        {aestheticTags.map((tag) => (
          <button key={tag} className={activeTag === tag ? "active" : ""} onClick={() => setActiveTag(tag)}>
            {tag}
          </button>
        ))}
      </section>

      <section className="section-block">
        <SectionHeading
          eyebrow="Profiles"
          title={filteredCreators.length ? "Creators to book now" : "No creators matched"}
        />
        {filteredCreators.length ? (
          <div className="creator-grid">
            {filteredCreators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search size={26} />}
            title="No profile found"
            text="Try a different aesthetic, city, or creator name."
          />
        )}
      </section>

      <section className="section-block">
        <SectionHeading eyebrow="Rising Stars" title="Small creators with sharp points of view" />
        <div className="creator-grid compact">
          {rising.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} compact />
          ))}
        </div>
      </section>

      <section className="section-block">
        <SectionHeading eyebrow="Recent posts" title="Looks worth saving" action={<Link to="/bookings">Bookings</Link>} />
        <div className="post-grid">
          {recentPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CreatorRedirectPage() {
  const { handle = "" } = useParams();
  return <Navigate to={`/creator/${handle}`} replace />;
}

function CreatorProfilePage() {
  const { handle = "" } = useParams();
  const { state, toggleCreator } = useAppState();
  const baseCreator = getCreator(handle);
  const [activeTab, setActiveTab] = useState<"posts" | "portfolio" | "services">("posts");

  if (!baseCreator) {
    return <NotFoundPanel title="Creator not found" text="This profile URL does not match an active FitCheck creator." />;
  }

  const creator = applyCreatorDraft(baseCreator, state.creatorDrafts[baseCreator.handle]);
  const profilePosts = [
    ...state.studioPosts.filter((post) => post.creatorHandle === creator.handle),
    ...creatorPosts(creator.handle),
  ];
  const portfolio = [
    ...state.studioPosts.filter((post) => post.creatorHandle === creator.handle && post.portfolio),
    ...creatorPortfolio(creator.handle),
  ];
  const reviews = creatorReviews(creator.handle);
  const pieces = creatorDesignerPieces(creator.handle);
  const products = creatorTasteProducts(creator.handle);
  const featuredProduct = products.find((product) => product.id === creator.featuredProductId) ?? products[0];
  const featuredService =
    creator.services.find((service) => service.id === creator.featuredServiceId) ?? creator.services[0];
  const isSaved = state.savedCreatorHandles.includes(creator.handle);

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <img className="profile-cover" src={creator.cover} alt={`${creator.displayName} profile cover`} />
        <div className="profile-identity">
          <img className="avatar large" src={creator.avatar} alt={creator.displayName} />
          <div>
            <div className="profile-name-line">
              <h1>{creator.displayName}</h1>
              {creator.verified ? (
                <span className="verified-badge">
                  <BadgeCheck size={18} />
                  Verified
                </span>
              ) : null}
            </div>
            <p>{creator.storefrontHeadline || creator.bio}</p>
            <div className="tag-row">
              {creator.aesthetics.slice(0, 4).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="profile-stats">
          <Stat label="Audience" value={formatFollowerCount(creator.followerCount)} />
          <Stat label="Rating" value={creator.rating.toFixed(2)} />
          <Stat label="Reviews" value={String(creator.reviewCount)} />
          <Stat label="Avg turn" value={creator.avgTurnaround} />
        </div>
        <div className="profile-actions">
          {featuredProduct ? (
            <Link className="button dark" to={`/creator/${creator.handle}/edit/${featuredProduct.slug}`}>
              <FileText size={18} />
              Shop my edits
            </Link>
          ) : null}
          <Link className="button light" to={`/creator/${creator.handle}/service/${featuredService.id}`}>
            <CalendarDays size={18} />
            Book my taste
          </Link>
          <button className="button light" onClick={() => toggleCreator(creator.handle)}>
            <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
            {isSaved ? "Following" : "Follow"}
          </button>
          <ShareButton
            title={`${creator.displayName} on FitCheck`}
            text={creator.tasteSignature}
            url={sharePageUrl(creatorSharePath(creator.handle))}
          />
        </div>
      </section>

      <section className="storefront-offer-grid">
        <article className="detail-panel taste-panel">
          <p className="eyebrow">Taste signature</p>
          <h2>{creator.tasteSignature}</h2>
          <p>{creator.storefrontDescription}</p>
          <div className="principle-list">
            {creator.tastePrinciples.map((principle) => (
              <span key={principle}>{principle}</span>
            ))}
          </div>
          <div className="creator-meta">
            {creator.socialVerifiedAt ? (
              <span>
                <BadgeCheck size={15} />
                Social verified
              </span>
            ) : null}
            <span>{creator.availability}</span>
          </div>
        </article>
        {featuredProduct ? (
          <TasteProductCard product={featuredProduct} variant="featured" />
        ) : null}
        {featuredService ? (
          <article className="detail-panel featured-offer">
            <p className="eyebrow">Book my taste</p>
            <h2>{featuredService.title}</h2>
            <p>{featuredService.summary}</p>
            <div className="summary-row">
              <span>{featuredService.priceLabel}</span>
              <span>{featuredService.turnaround}</span>
            </div>
            <Link className="button dark full" to={`/creator/${creator.handle}/service/${featuredService.id}`}>
              Open service
              <ArrowRight size={18} />
            </Link>
          </article>
        ) : null}
      </section>

      {products.length ? (
        <section className="section-block">
          <SectionHeading eyebrow="Shop my edits" title="Paid taste products" />
          <div className="product-grid">
            {products.map((product) => (
              <TasteProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <SectionHeading eyebrow="Pinned" title="First impression" />
        <div className="post-grid featured">
          {profilePosts
            .filter((post) => post.pinned)
            .map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
        </div>
      </section>

      <section className="profile-tabs" aria-label="Profile sections">
        <button className={activeTab === "posts" ? "active" : ""} onClick={() => setActiveTab("posts")}>
          Posts
        </button>
        <button className={activeTab === "portfolio" ? "active" : ""} onClick={() => setActiveTab("portfolio")}>
          Portfolio
        </button>
        <button className={activeTab === "services" ? "active" : ""} onClick={() => setActiveTab("services")}>
          Services
        </button>
      </section>

      {activeTab === "posts" ? (
        <section className="section-block">
          <SectionHeading eyebrow="Posts" title="Recent work" />
          <div className="post-grid">
            {profilePosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "portfolio" ? (
        <section className="section-block">
          <SectionHeading eyebrow="Portfolio" title="Curated highlights" />
          <div className="portfolio-layout">
            {portfolio.map((post) => (
              <Link className="portfolio-piece" key={post.id} to={`/post/${post.id}`}>
                <img src={post.image} alt={post.title} />
                <div>
                  <span>{post.type.replace("-", " ")}</span>
                  <h3>{post.title}</h3>
                  <p>{post.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "services" ? (
        <section className="section-block">
          <SectionHeading eyebrow="Services" title="Book structured styling" />
          <div className="service-grid">
            {creator.services.map((service) => (
              <ServiceCard key={service.id} creator={creator} service={service} />
            ))}
          </div>
        </section>
      ) : null}

      {pieces.length ? (
        <section className="section-block">
          <SectionHeading eyebrow="Designer pieces" title="Original work in context" />
          <div className="piece-grid">
            {pieces.map((piece) => (
              <article className="piece-card" key={piece.id}>
                <img src={piece.image} alt={piece.title} />
                <div>
                  <h3>{piece.title}</h3>
                  <p>{piece.description}</p>
                  <span>{piece.price}</span>
                  <button className="text-button">
                    {piece.shopLabel}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <SectionHeading eyebrow="Reviews" title="Customer proof" />
        {reviews.length ? (
          <div className="review-grid">
            {reviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="stars" aria-label={`${review.rating} star review`}>
                  {Array.from({ length: review.rating }).map((_, idx) => (
                    <Star key={idx} size={16} fill="currentColor" />
                  ))}
                </div>
                <p>{review.text}</p>
                <strong>
                  {review.customerName} / {review.serviceTitle}
                </strong>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Star size={26} />} title="No reviews yet" text="New creators can still show proof through pinned transformations." />
        )}
      </section>
    </div>
  );
}

function EditLandingPage() {
  const { handle = "", slug = "" } = useParams();
  const { state } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const creator = getCreator(handle);
  const product = getTasteProduct(handle, slug);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [startingCheckout, setStartingCheckout] = useState(false);

  if (!creator || !product) {
    return <NotFoundPanel title="Edit not found" text="This paid edit is not published on FitCheck." />;
  }

  const previewItems = tasteProductPreviewItems(product.id);
  const previewOutfits = tasteProductPreviewOutfits(product.id);
  const hasLocalEntitlement = state.entitlements.some(
    (entitlement) => entitlement.productId === product.id && !entitlement.revokedAt,
  );

  const startCheckout = async () => {
    if (!state.user) {
      navigate(`/signin?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    setStartingCheckout(true);
    setCheckoutMessage("");
    const result = await createCommerceCheckout({ checkoutType: "taste_product", referenceId: product.id });
    setStartingCheckout(false);

    if (result.ok && result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
      return;
    }

    setCheckoutMessage(result.message);
  };

  return (
    <div className="page-stack">
      <section className="edit-hero">
        <img src={product.coverImageUrl} alt={product.title} />
        <div>
          <CreatorMini creator={creator} />
          <p className="eyebrow">Paid edit</p>
          <h1>{product.title}</h1>
          <p className="lead">{product.subtitle}</p>
          <p>{product.description}</p>
          <div className="tag-row">
            <span>{product.theme}</span>
            <span>{product.totalItemCount} products</span>
            <span>{product.outfitCount} outfits</span>
            <span>Updated {formatDate(product.updatedAt)}</span>
          </div>
          <div className="quick-actions">
            <button className="button dark" onClick={startCheckout} disabled={startingCheckout}>
              {startingCheckout ? <Loader2 className="spin" size={18} /> : <CreditCard size={18} />}
              {hasLocalEntitlement ? "Buy another copy" : `Buy ${productMoney(product.priceCents, product.currency)}`}
            </button>
            {hasLocalEntitlement ? (
              <Link className="button light" to="/library/edits/purchase-demo-amara-copenhagen">
                Open owned demo
              </Link>
            ) : null}
            <ShareButton
              title={product.title}
              text={product.previewText}
              url={sharePageUrl(editSharePath(creator.handle, product.slug))}
            />
          </div>
          {checkoutMessage ? <p className="form-error">{checkoutMessage}</p> : null}
          <div className="setup-note">
            <LockKeyhole size={18} />
            Preview rows are public. Full rows are designed to load only after a Supabase entitlement exists.
          </div>
        </div>
      </section>

      <section className="section-block">
        <SectionHeading eyebrow="Who this is for" title="Creator-led buying context" />
        <div className="detail-grid">
          <article className="detail-panel">
            <h2>{product.previewText}</h2>
            <p>{product.affiliateDisclosure}</p>
          </article>
          <article className="detail-panel">
            <h2>Best fit</h2>
            <div className="principle-list">
              {product.whoIsItFor.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="section-block">
        <SectionHeading eyebrow="Preview products" title="A few public picks" />
        <div className="product-item-grid">
          {previewItems.map((item) => (
            <ProductItemCard key={item.id} item={item} />
          ))}
          <LockedPreviewCard count={Math.max(product.totalItemCount - previewItems.length, 0)} />
        </div>
      </section>

      <section className="section-block">
        <SectionHeading eyebrow="Preview outfit" title="How the edit thinks" />
        <div className="lookbook-grid">
          {previewOutfits.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      </section>

      <section className="section-block">
        <SectionHeading eyebrow="Related service" title="Want this taste applied to you?" />
        <div className="service-grid">
          {creator.services.slice(0, 2).map((service) => (
            <ServiceCard key={service.id} creator={creator} service={service} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ServiceDetailPage() {
  const { handle = "", serviceSlug = "" } = useParams();
  const creator = getCreator(handle);
  const service = getService(handle, serviceSlug);

  if (!creator || !service) {
    return <NotFoundPanel title="Service not found" text="This service is not active on FitCheck." />;
  }

  return (
    <div className="booking-page">
      <aside className="booking-summary">
        <CreatorMini creator={creator} />
        <ShareButton
          title={`${service.title} by ${creator.displayName}`}
          text={service.summary}
          url={sharePageUrl(serviceSharePath(creator.handle, service.id))}
        />
      </aside>
      <section className="form-panel service-detail-panel">
        <p className="eyebrow">Book my taste</p>
        <h1>{service.title}</h1>
        <p className="lead">{service.summary}</p>
        <div className="summary-row">
          <span>{service.priceLabel}</span>
          <span>{service.turnaround}</span>
        </div>
        <div className="service-deliverables">
          {service.deliverables.map((deliverable) => (
            <span key={deliverable}>
              <Check size={16} />
              {deliverable}
            </span>
          ))}
        </div>
        <div className="detail-panel">
          <h2>Intake prompts</h2>
          <div className="principle-list">
            {service.intakePrompts.map((prompt) => (
              <span key={prompt}>{prompt}</span>
            ))}
          </div>
        </div>
        <Link className="button dark" to={`/book/${creator.handle}/${service.id}`}>
          Start booking
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}

function CustomerLibraryPage() {
  const { state } = useAppState();
  const location = useLocation();

  if (!state.user) {
    return (
      <AuthGate
        title="Sign in to open your library"
        text="Purchased edits and delivered styling work stay attached to your account."
        redirect={location.pathname}
      />
    );
  }

  const purchasedProducts = state.purchases
    .map((purchase) => ({ purchase, product: getTasteProductById(purchase.productId) }))
    .filter((item): item is { purchase: (typeof state.purchases)[number]; product: TasteProduct } => Boolean(item.product));

  return (
    <div className="page-stack">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Library</p>
          <h1>Your paid edits and lookbooks</h1>
          <p className="lead">A customer-owned surface for purchases and delivered one-to-one services.</p>
        </div>
        <Link className="button light" to="/">
          Find more creators
        </Link>
      </section>

      <section className="section-block">
        <SectionHeading eyebrow="Paid edits" title="Purchased taste products" />
        {purchasedProducts.length ? (
          <div className="product-grid">
            {purchasedProducts.map(({ purchase, product }) => (
              <Link className="product-card" key={purchase.id} to={`/library/edits/${purchase.id}`}>
                <img src={product.coverImageUrl} alt={product.title} />
                <div>
                  <span>{paymentLabel[purchase.paymentStatus === "requires_payment" ? "requires_payment" : purchase.paymentStatus]}</span>
                  <h3>{product.title}</h3>
                  <p>{product.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={<FileText size={26} />} title="No paid edits yet" text="Buy a creator edit to unlock it here." />
        )}
      </section>

      <section className="section-block">
        <SectionHeading eyebrow="Services" title="Delivered styling" />
        {state.bookings.length ? (
          <div className="booking-list">
            {state.bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<CalendarDays size={26} />} title="No services yet" text="Book a creator to start." />
        )}
      </section>
    </div>
  );
}

function PaidEditReaderPage() {
  const { purchaseId = "" } = useParams();
  const { state } = useAppState();
  const location = useLocation();

  if (!state.user) {
    return (
      <AuthGate
        title="Sign in to read this edit"
        text="Paid edits require an account and an active entitlement."
        redirect={location.pathname}
      />
    );
  }

  const purchase = state.purchases.find((item) => item.id === purchaseId);
  if (!purchase) {
    return <NotFoundPanel title="Purchase not found" text="This paid edit is not in your local library." />;
  }

  const product = getTasteProductById(purchase.productId);
  if (!product) {
    return <NotFoundPanel title="Product unavailable" text="This paid edit is no longer available." />;
  }

  const entitlement = state.entitlements.find(
    (item) => item.productId === product.id && item.sourcePurchaseId === purchase.id && !item.revokedAt,
  );

  if (purchase.paymentStatus === "requires_payment") {
    return <AccessStatePanel title="Payment pending" text="Finish checkout before the full edit opens." />;
  }

  if (purchase.paymentStatus === "refunded" || !entitlement) {
    return <AccessStatePanel title="Access revoked" text="This purchase no longer has an active entitlement." />;
  }

  const items = tasteProductFullItems(product.id);
  const outfits = tasteProductFullOutfits(product.id);

  return (
    <div className="page-stack">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Paid edit reader</p>
          <h1>{product.title}</h1>
          <p className="lead">{product.subtitle}</p>
        </div>
        <span className="verified-badge">
          <LockKeyhole size={16} />
          Entitled
        </span>
      </section>
      <div className="setup-note">
        <Database size={18} />
        This reader uses a local demo entitlement. Production access is enforced by `/api/paid-edit-access`.
      </div>
      <section className="section-block">
        <SectionHeading eyebrow="All products" title={`${items.length} creator-vetted picks`} />
        <div className="product-item-grid">
          {items.map((item) => (
            <ProductItemCard key={item.id} item={item} unlocked />
          ))}
        </div>
      </section>
      <section className="section-block">
        <SectionHeading eyebrow="Outfits" title="Creator formulas" />
        <div className="lookbook-grid">
          {outfits.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ControlledSharePage() {
  const { token = "" } = useParams();
  const [state, setState] = useState<"loading" | "demo" | "invalid">("loading");

  useEffect(() => {
    if (token === "demo") {
      setState("demo");
      return;
    }

    setState("invalid");
  }, [token]);

  if (state === "loading") {
    return (
      <CenteredPanel>
        <Loader2 className="spin" size={34} />
        <h1>Checking share link</h1>
        <p>Controlled links are validated by a trusted endpoint before private content is shown.</p>
      </CenteredPanel>
    );
  }

  if (state === "invalid") {
    return <AccessStatePanel title="Share link unavailable" text="This link is expired, revoked, or not recognised." />;
  }

  const product = getTasteProductById("11111111-1111-4111-8111-111111111111")!;
  return (
    <article className="legal-page">
      <p className="eyebrow">Controlled preview</p>
      <h1>{product.title}</h1>
      <p>{product.previewText}</p>
      <div className="setup-note">
        <ShieldCheck size={18} />
        Private shopping lists, customer fit details, and storage IDs are not exposed on share links.
      </div>
      <Link className="button dark" to={`/creator/${product.creatorHandle}/edit/${product.slug}`}>
        Open public edit page
      </Link>
    </article>
  );
}

function PostPage() {
  const { postId = "" } = useParams();
  const { state } = useAppState();
  const post = state.studioPosts.find((item) => item.id === postId) ?? getPost(postId);

  if (!post) {
    return <NotFoundPanel title="Post not found" text="This post may have been moved or removed." />;
  }

  const creator = getCreator(post.creatorHandle);
  if (!creator) {
    return <NotFoundPanel title="Creator not found" text="The creator attached to this post is unavailable." />;
  }

  const related = creatorPosts(creator.handle).filter((item) => item.id !== post.id).slice(0, 3);

  return (
    <div className="post-detail">
      <article className="post-article">
        <img className="post-hero-image" src={post.image} alt={post.title} />
        <div className="post-copy">
          <p className="eyebrow">{post.type.replace("-", " ")} / {formatDate(post.date)}</p>
          <h1>{post.title}</h1>
          <p className="lead">{post.summary}</p>
          <p>{post.body}</p>
          <div className="tag-row">
            {post.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </article>

      <aside className="post-sidebar">
        <CreatorMini creator={creator} />
        <section className="side-section">
          <h2>Tagged pieces</h2>
          {post.taggedItems.map((item) => (
            <div className="tagged-item" key={`${item.brand}-${item.name}`}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.brand}</span>
              </div>
              {item.price ? <span>{item.price}</span> : null}
            </div>
          ))}
        </section>
        <Link className="button dark full" to={`/book/${creator.handle}/${creator.services[0].id}`}>
          <CalendarDays size={18} />
          Book {creator.displayName.split(" ")[0]}
        </Link>
      </aside>

      {related.length ? (
        <section className="section-block span-all">
          <SectionHeading eyebrow="More from this creator" title="Keep browsing" />
          <div className="post-grid">
            {related.map((item) => (
              <PostCard key={item.id} post={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function BookingPage() {
  const { handle = "", serviceId = "" } = useParams();
  const creator = getCreator(handle);
  const service = getService(handle, serviceId);
  const { state, addBooking } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [uploadCount, setUploadCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCloset, setSelectedCloset] = useState<string[]>(state.closet.slice(0, 3).map((item) => item.id));
  const [form, setForm] = useState({
    occasion: "",
    budget: "",
    notes: "",
    constraints: "",
  });

  if (!creator || !service) {
    return <NotFoundPanel title="Service not found" text="This booking link does not match an active creator service." />;
  }

  if (!state.user) {
    return (
      <AuthGate
        title="Sign in to book"
        text="Bookings need an account so your closet, brief, and deliverable stay attached to you."
        redirect={location.pathname}
      />
    );
  }

  const toggleCloset = (itemId: string) => {
    setSelectedCloset((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  };

  const submit = async () => {
    if (!form.occasion.trim()) {
      setError("Add the main occasion or style problem before confirming.");
      setStep(1);
      return;
    }

    setSubmitting(true);
    const id = newBookingReference();
    const booking: Booking = {
      id,
      creatorHandle: creator.handle,
      serviceId: service.id,
      serviceTitle: service.title,
      customerName: state.user?.name ?? "Customer",
      price: service.price,
      status: "intake",
      paymentStatus: "requires_payment",
      createdAt: new Date().toISOString().slice(0, 10),
      dueDate: dueDateFor(service),
      brief: [form.occasion, form.notes, form.constraints].filter(Boolean).join(" / "),
      budget: form.budget || "Not specified",
      closetItemIds: selectedCloset,
    };

    const checkout = await createCheckoutSession({ booking, customerEmail: state.user?.email });
    addBooking({ ...booking, paymentStatus: checkout.ok ? "requires_payment" : "demo" });

    if (checkout.ok && checkout.checkoutUrl) {
      window.location.href = checkout.checkoutUrl;
      return;
    }

    navigate(`/bookings/${id}?payment=demo`);
  };

  return (
    <div className="booking-page">
      <aside className="booking-summary">
        <CreatorMini creator={creator} />
        <div className="service-summary">
          <p className="eyebrow">Booking</p>
          <h1>{service.title}</h1>
          <p>{service.summary}</p>
          <div className="summary-row">
            <span>{service.priceLabel}</span>
            <span>{service.turnaround}</span>
          </div>
          <div className="escrow-note">
            <ShieldCheck size={18} />
            Mock escrow holds payment until delivery approval.
          </div>
        </div>
      </aside>

      <section className="booking-flow">
        <div className="stepper" aria-label="Booking progress">
          {[1, 2, 3].map((item) => (
            <span key={item} className={step >= item ? "active" : ""}>
              {item}
            </span>
          ))}
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        {step === 1 ? (
          <div className="form-panel">
            <p className="eyebrow">Brief</p>
            <h2>Tell {creator.displayName.split(" ")[0]} what you need</h2>
            <label>
              Occasion or style problem
              <input
                value={form.occasion}
                onChange={(event) => setForm({ ...form, occasion: event.target.value })}
                placeholder="Summer office wardrobe, wedding guest, first date"
              />
            </label>
            <label>
              Budget
              <input
                value={form.budget}
                onChange={(event) => setForm({ ...form, budget: event.target.value })}
                placeholder="$300 total, no new buys, under $100 per item"
              />
            </label>
            <label>
              Style direction
              <textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="What should the finished look feel like?"
              />
            </label>
            <label>
              Constraints
              <textarea
                value={form.constraints}
                onChange={(event) => setForm({ ...form, constraints: event.target.value })}
                placeholder="Fit concerns, climate, dress codes, colors to avoid"
              />
            </label>
            <div className="form-actions">
              <button className="button dark" onClick={() => setStep(2)}>
                Next
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form-panel">
            <p className="eyebrow">Closet</p>
            <h2>Select pieces to include</h2>
            <div className="closet-select-grid">
              {state.closet.map((item) => (
                <label className={`closet-select ${selectedCloset.includes(item.id) ? "selected" : ""}`} key={item.id}>
                  <input
                    type="checkbox"
                    checked={selectedCloset.includes(item.id)}
                    onChange={() => toggleCloset(item.id)}
                  />
                  <img src={item.image} alt={item.name} />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
            <label className="upload-box">
              <Upload size={22} />
              <span>{uploadCount ? `${uploadCount} local file(s) selected` : "Add more photos for this booking"}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(event) => setUploadCount(event.currentTarget.files?.length ?? 0)}
              />
            </label>
            <div className="form-actions spread">
              <button className="button light" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="button dark" onClick={() => setStep(3)}>
                Review
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="form-panel">
            <p className="eyebrow">Confirm</p>
            <h2>Ready to place booking</h2>
            <div className="confirm-list">
              <ConfirmRow label="Creator" value={creator.displayName} />
              <ConfirmRow label="Service" value={service.title} />
              <ConfirmRow label="Price" value={money.format(service.price)} />
              <ConfirmRow label="Due" value={formatDate(dueDateFor(service))} />
              <ConfirmRow label="Closet pieces" value={String(selectedCloset.length + uploadCount)} />
            </div>
            <div className="service-deliverables">
              {service.deliverables.map((deliverable) => (
                <span key={deliverable}>
                  <Check size={16} />
                  {deliverable}
                </span>
              ))}
            </div>
            <div className="form-actions spread">
              <button className="button light" onClick={() => setStep(2)}>
                Back
              </button>
              <button className="button dark" onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
                {submitting ? "Preparing checkout" : "Confirm booking"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ClosetPage() {
  const { state, addClosetItem } = useAppState();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Top", color: "" });
  const [itemFile, setItemFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");

  if (!state.user) {
    return (
      <AuthGate
        title="Sign in to view closet"
        text="Your closet powers audits, capsules, and repeat bookings."
        redirect={location.pathname}
      />
    );
  }

  const filtered = state.closet.filter((item) =>
    [item.name, item.category, item.color, ...item.tags].join(" ").toLowerCase().includes(query.toLowerCase()),
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setUploadError("");
    let imageUrl = "/assets/media/fitcheck-media-14.jpg";

    if (itemFile) {
      try {
        const upload = await uploadPrivateImage(itemFile, state.user?.email ?? state.user?.name ?? "demo-user");
        imageUrl = upload.url || imageUrl;
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed.");
        return;
      }
    }

    const newItem: ClosetItem = {
      id: `closet-${Date.now()}`,
      name: form.name,
      category: form.category,
      color: form.color || "Unspecified",
      image: imageUrl,
      tags: [form.category.toLowerCase(), form.color.toLowerCase()].filter(Boolean),
      lastWorn: new Date().toISOString().slice(0, 10),
    };
    addClosetItem(newItem);
    setForm({ name: "", category: "Top", color: "" });
    setItemFile(null);
    setShowForm(false);
  };

  return (
    <div className="page-stack">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Customer closet</p>
          <h1>Your wardrobe library</h1>
          <p className="lead">Saved pieces stay available across every booking.</p>
        </div>
        <button className="button dark" onClick={() => setShowForm((value) => !value)}>
          <Camera size={18} />
          Add item
        </button>
      </section>

      {showForm ? (
        <form className="inline-form" onSubmit={submit}>
          <label>
            Item name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            Category
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option>Top</option>
              <option>Bottom</option>
              <option>Outerwear</option>
              <option>Shoe</option>
              <option>Accessory</option>
            </select>
          </label>
          <label>
            Color
            <input value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
          </label>
          <label>
            Photo
            <input type="file" accept="image/*" onChange={(event) => setItemFile(event.currentTarget.files?.[0] ?? null)} />
          </label>
          <button className="button dark" type="submit">
            <Check size={18} />
            Save
          </button>
          {uploadError ? <p className="form-error">{uploadError}</p> : null}
        </form>
      ) : null}

      <section className="search-panel wide">
        <Search size={20} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by item, color, tag" />
      </section>

      {filtered.length ? (
        <section className="closet-grid">
          {filtered.map((item) => (
            <article className="closet-card" key={item.id}>
              <img src={item.image} alt={item.name} />
              <div>
                <span>{item.category}</span>
                <h2>{item.name}</h2>
                <p>
                  {item.color} / worn {formatDate(item.lastWorn)}
                </p>
                <div className="tag-row">
                  {item.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState icon={<Shirt size={26} />} title="No closet items" text="Add a piece or clear the filter." />
      )}
    </div>
  );
}

function BookingsPage() {
  const { state } = useAppState();
  const location = useLocation();

  if (!state.user) {
    return (
      <AuthGate
        title="Sign in to view bookings"
        text="Bookings, briefs, and lookbooks live inside your account."
        redirect={location.pathname}
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Bookings</p>
          <h1>Your styling work</h1>
          <p className="lead">Track active services and revisit delivered lookbooks.</p>
        </div>
        <Link className="button light" to="/">
          <Search size={18} />
          Find creator
        </Link>
      </section>
      {state.bookings.length ? (
        <section className="booking-list">
          {state.bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </section>
      ) : (
        <EmptyState icon={<CalendarDays size={26} />} title="No bookings yet" text="Book a creator service to start." />
      )}
    </div>
  );
}

function BookingDetailPage() {
  const { bookingId = "" } = useParams();
  const { state, updateBookingPaymentStatus } = useAppState();
  const [params] = useSearchParams();
  const [checkoutSync, setCheckoutSync] = useState<"idle" | "checking" | "synced" | "pending">("idle");
  const booking = state.bookings.find((item) => item.id === bookingId);
  const checkoutResult = params.get("checkout");

  useEffect(() => {
    if (!booking || checkoutResult !== "success" || booking.paymentStatus === "paid") return;

    let active = true;
    let attempts = 0;
    let timeoutId: number | undefined;

    const syncStatus = async () => {
      if (!active) return;
      attempts += 1;
      setCheckoutSync("checking");

      const result = await getCheckoutStatus(booking.id);
      if (!active) return;

      if (result.paymentStatus === "paid" && booking.paymentStatus !== "paid") {
        updateBookingPaymentStatus(booking.id, "paid");
        setCheckoutSync("synced");
        return;
      }

      if (result.paymentStatus === "failed" && booking.paymentStatus !== "failed") {
        updateBookingPaymentStatus(booking.id, "failed");
        setCheckoutSync("synced");
        return;
      }

      if (result.paymentStatus === "refunded" && booking.paymentStatus !== "refunded") {
        updateBookingPaymentStatus(booking.id, "refunded");
        setCheckoutSync("synced");
        return;
      }

      if (attempts < 8) {
        timeoutId = window.setTimeout(syncStatus, 2500);
      } else {
        setCheckoutSync("pending");
      }
    };

    syncStatus();

    return () => {
      active = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [booking, checkoutResult, updateBookingPaymentStatus]);

  if (!booking) {
    return <NotFoundPanel title="Booking not found" text="This booking is not in your local FitCheck workspace." />;
  }

  const creator = getCreator(booking.creatorHandle);

  return (
    <div className="booking-detail">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">{booking.id}</p>
          <h1>{booking.serviceTitle}</h1>
          <p className="lead">{booking.brief}</p>
        </div>
        <span className={`status-pill ${booking.status}`}>{statusLabel[booking.status]}</span>
      </section>

      <section className="detail-grid">
        <div className="detail-panel">
          <h2>Booking details</h2>
          <ConfirmRow label="Creator" value={creator?.displayName ?? booking.creatorHandle} />
          <ConfirmRow label="Customer" value={booking.customerName} />
          <ConfirmRow label="Budget" value={booking.budget} />
          <ConfirmRow label="Price" value={money.format(booking.price)} />
          <ConfirmRow label="Payment" value={paymentLabel[booking.paymentStatus ?? "demo"]} />
          <ConfirmRow label="Due date" value={formatDate(booking.dueDate)} />
        </div>
        <div className="detail-panel">
          <h2>Progress</h2>
          {params.get("payment") === "demo" ? (
            <div className="setup-note compact">
              <CreditCard size={18} />
              Stripe is not configured locally, so this booking was saved without charging.
            </div>
          ) : null}
          {checkoutResult === "success" ? (
            <div className="setup-note compact success">
              <ShieldCheck size={18} />
              {checkoutSync === "checking"
                ? "Stripe checkout returned. Syncing payment status..."
                : checkoutSync === "synced" || booking.paymentStatus === "paid"
                  ? "Stripe payment status synced."
                  : checkoutSync === "pending"
                    ? "Stripe checkout returned. Webhook status is still pending."
                    : "Stripe checkout returned successfully."}
            </div>
          ) : null}
          <Timeline status={booking.status} />
        </div>
      </section>

      {booking.deliverable ? (
        <section className="section-block">
          <SectionHeading
            eyebrow="Lookbook"
            title={booking.deliverable.title}
            action={
              <span className="voice-label">
                <Mic2 size={16} />
                {booking.deliverable.voiceNoteLabel}
              </span>
            }
          />
          <div className="lookbook-grid">
            {booking.deliverable.outfits.map((outfit) => (
              <article className="look-card" key={outfit.id}>
                <img src={outfit.image} alt={outfit.title} />
                <div>
                  <h3>{outfit.title}</h3>
                  <p>{outfit.notes}</p>
                  <span>{outfit.items.join(" / ")}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={<Clock3 size={26} />}
          title="Deliverable not ready yet"
          text="The creator has your intake and closet selection. This booking will turn into a lookbook when delivered."
        />
      )}
    </div>
  );
}

function StudioPage() {
  const { state, updateBookingStatus, saveCreatorDraft, addStudioPost } = useAppState();
  const baseCreator = creators[0];
  const creator = applyCreatorDraft(baseCreator, state.creatorDrafts[baseCreator.handle]);
  const [profileDraft, setProfileDraft] = useState({
    displayName: creator.displayName,
    bio: creator.bio,
    location: creator.location,
    aesthetics: creator.aesthetics.join(", "),
  });
  const [postDraft, setPostDraft] = useState({
    title: "",
    summary: "",
    body: "",
    tags: "",
  });

  if (!state.user || state.user.role !== "creator") {
    return (
      <CenteredPanel>
        <LayoutDashboard size={34} />
        <h1>Creator Studio</h1>
        <p>Creator tools require a creator account. Sign in as a creator or apply for access.</p>
        <div className="quick-actions centered">
          <Link className="button dark" to="/creator/signin">
            <Sparkles size={18} />
            Creator sign in
          </Link>
          <Link className="button light" to="/apply">
            Apply as creator
          </Link>
        </div>
      </CenteredPanel>
    );
  }

  const activeBookings = state.bookings.filter((booking) => booking.status !== "completed");
  const monthlyRevenue = state.bookings.reduce((total, booking) => total + booking.price, 0);
  const publishPost = (event: FormEvent) => {
    event.preventDefault();
    if (!postDraft.title.trim()) return;
    addStudioPost({
      id: `studio-post-${Date.now()}`,
      creatorHandle: creator.handle,
      type: "outfit",
      title: postDraft.title,
      date: new Date().toISOString().slice(0, 10),
      image: creator.cover,
      summary: postDraft.summary || "New creator post drafted in Studio.",
      body: postDraft.body || postDraft.summary || "Studio draft.",
      tags: postDraft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      pinned: false,
      portfolio: true,
      taggedItems: [],
    });
    setPostDraft({ title: "", summary: "", body: "", tags: "" });
  };

  return (
    <div className="page-stack">
      <section className="workspace-header studio">
        <div>
          <p className="eyebrow">Studio</p>
          <h1>Good evening, {state.user.name}</h1>
          <p className="lead">Bookings, profile content, and lookbook assembly for {creator.displayName}.</p>
        </div>
        <Link className="button light" to={`/creator/${creator.handle}`}>
          View profile
          <ArrowRight size={18} />
        </Link>
      </section>

      <section className="metric-grid">
        <Metric icon={<CalendarDays size={19} />} label="Active bookings" value={String(activeBookings.length)} />
        <Metric icon={<WalletCards size={19} />} label="Booked revenue" value={money.format(monthlyRevenue)} />
        <Metric icon={<Star size={19} />} label="Rating" value={creator.rating.toFixed(2)} />
        <Metric icon={<Clock3 size={19} />} label="Avg turnaround" value={creator.avgTurnaround} />
      </section>

      <section className="studio-grid">
        <div className="studio-column">
          <SectionHeading eyebrow="Queue" title="Bookings to move forward" />
          {activeBookings.length ? (
            <div className="booking-list compact-list">
              {activeBookings.map((booking) => (
                <article className="studio-booking" key={booking.id}>
                  <div>
                    <span className={`status-pill ${booking.status}`}>{statusLabel[booking.status]}</span>
                    <h3>{booking.serviceTitle}</h3>
                    <p>{booking.brief}</p>
                  </div>
                  <div className="studio-booking-actions">
                    <Link className="text-button" to={`/bookings/${booking.id}`}>
                      Open
                      <ArrowRight size={16} />
                    </Link>
                    {booking.status !== "ready" ? (
                      <button className="button small light" onClick={() => updateBookingStatus(booking.id, "ready")}>
                        Mark ready
                      </button>
                    ) : (
                      <button className="button small light" onClick={() => updateBookingStatus(booking.id, "completed")}>
                        Complete
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={<CalendarDays size={26} />} title="Queue is clear" text="New bookings will appear here." />
          )}
        </div>

        <div className="studio-column">
          <SectionHeading eyebrow="Atelier" title="Lookbook builder" />
          <div className="atelier-board">
            <div>
              <h3>Tagged wardrobe</h3>
              {state.closet.slice(0, 4).map((item) => (
                <span key={item.id}>{item.name}</span>
              ))}
            </div>
            <div>
              <h3>Suggested looks</h3>
              <p>3 strong outfit formulas from the selected closet.</p>
              <button className="button light small">
                <Check size={16} />
                Approve set
              </button>
            </div>
            <div>
              <h3>Voice note</h3>
              <p>Record a short walkthrough before delivery.</p>
              <button className="button light small">
                <Mic2 size={16} />
                Record
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="studio-grid">
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            saveCreatorDraft(creator.handle, profileDraft);
          }}
        >
          <p className="eyebrow">Profile editor</p>
          <h2>Public profile draft</h2>
          <label>
            Display name
            <input
              value={profileDraft.displayName}
              onChange={(event) => setProfileDraft({ ...profileDraft, displayName: event.target.value })}
            />
          </label>
          <label>
            Bio
            <textarea
              value={profileDraft.bio}
              onChange={(event) => setProfileDraft({ ...profileDraft, bio: event.target.value })}
            />
          </label>
          <label>
            Location
            <input
              value={profileDraft.location}
              onChange={(event) => setProfileDraft({ ...profileDraft, location: event.target.value })}
            />
          </label>
          <label>
            Aesthetics
            <input
              value={profileDraft.aesthetics}
              onChange={(event) => setProfileDraft({ ...profileDraft, aesthetics: event.target.value })}
            />
          </label>
          <button className="button dark" type="submit">
            <Settings size={18} />
            Save profile draft
          </button>
        </form>

        <form className="form-panel" onSubmit={publishPost}>
          <p className="eyebrow">Post composer</p>
          <h2>Publish a portfolio piece</h2>
          <label>
            Title
            <input
              value={postDraft.title}
              onChange={(event) => setPostDraft({ ...postDraft, title: event.target.value })}
              placeholder="Client capsule before and after"
            />
          </label>
          <label>
            Summary
            <input
              value={postDraft.summary}
              onChange={(event) => setPostDraft({ ...postDraft, summary: event.target.value })}
              placeholder="One-line public hook"
            />
          </label>
          <label>
            Body
            <textarea
              value={postDraft.body}
              onChange={(event) => setPostDraft({ ...postDraft, body: event.target.value })}
              placeholder="Tell the styling story"
            />
          </label>
          <label>
            Tags
            <input
              value={postDraft.tags}
              onChange={(event) => setPostDraft({ ...postDraft, tags: event.target.value })}
              placeholder="capsule, workwear, transformation"
            />
          </label>
          <button className="button dark" type="submit">
            <FileText size={18} />
            Publish locally
          </button>
        </form>
      </section>

      <section className="section-block">
        <SectionHeading eyebrow="Services" title="Live catalogue" />
        <div className="service-grid">
          {creator.services.map((service) => (
            <ServiceCard key={service.id} creator={creator} service={service} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RequireCreatorPanel() {
  return (
    <CenteredPanel>
      <LayoutDashboard size={34} />
      <h1>Creator access required</h1>
      <p>Sign in with a creator account to manage storefronts, paid edits, services, and analytics.</p>
      <Link className="button dark" to="/creator/signin">
        Creator sign in
      </Link>
    </CenteredPanel>
  );
}

function StorefrontStudioPage() {
  const { state, saveCreatorDraft } = useAppState();
  const baseCreator = creators[0];
  const creator = applyCreatorDraft(baseCreator, state.creatorDrafts[baseCreator.handle]);
  const [draft, setDraft] = useState({
    displayName: creator.displayName,
    bio: creator.bio,
    location: creator.location,
    aesthetics: creator.aesthetics.join(", "),
  });

  if (state.user?.role !== "creator") return <RequireCreatorPanel />;

  return (
    <div className="page-stack">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Storefront</p>
          <h1>Manage your sales page</h1>
          <p className="lead">The storefront is the direct landing page for followers from Instagram, TikTok, and email.</p>
        </div>
        <Link className="button light" to={`/creator/${creator.handle}`}>
          View storefront
        </Link>
      </section>
      <section className="studio-grid">
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            saveCreatorDraft(creator.handle, draft);
          }}
        >
          <p className="eyebrow">Profile basics</p>
          <label>
            Display name
            <input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
          </label>
          <label>
            Bio
            <textarea value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} />
          </label>
          <label>
            Location
            <input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
          </label>
          <label>
            Aesthetics
            <input value={draft.aesthetics} onChange={(event) => setDraft({ ...draft, aesthetics: event.target.value })} />
          </label>
          <button className="button dark" type="submit">
            Save storefront draft
          </button>
        </form>
        <div className="detail-panel">
          <p className="eyebrow">Taste positioning</p>
          <h2>{creator.tasteSignature}</h2>
          <p>{creator.storefrontDescription}</p>
          <div className="principle-list">
            {creator.tastePrinciples.map((principle) => (
              <span key={principle}>{principle}</span>
            ))}
          </div>
          <div className="setup-note">
            <Database size={18} />
            Production editing should write these fields to `creator_profiles`.
          </div>
        </div>
      </section>
    </div>
  );
}

function StudioEditsPage() {
  const { state } = useAppState();
  const creator = creators[0];
  const products = creatorTasteProducts(creator.handle);

  if (state.user?.role !== "creator") return <RequireCreatorPanel />;

  return (
    <div className="page-stack">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Paid edits</p>
          <h1>One-to-many taste products</h1>
          <p className="lead">Products your followers can buy without a personal intake process.</p>
        </div>
        <Link className="button dark" to="/studio/edits/new">
          New edit
        </Link>
      </section>
      <div className="product-grid">
        {products.map((product) => (
          <TasteProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function EditEditorPage() {
  const { state } = useAppState();

  if (state.user?.role !== "creator") return <RequireCreatorPanel />;

  return (
    <div className="page-stack">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">New paid edit</p>
          <h1>Draft a product followers can buy</h1>
          <p className="lead">This is the validation surface. The production editor should persist to `taste_products` and item tables.</p>
        </div>
      </section>
      <form className="form-panel">
        <label>
          Title
          <input placeholder="My Zara Sale Picks" />
        </label>
        <label>
          Description
          <textarea placeholder="Who this is for and what the full edit contains" />
        </label>
        <label>
          Price
          <input placeholder="$19" />
        </label>
        <label>
          Affiliate disclosure
          <textarea placeholder="Tell customers whether links may be affiliate links" />
        </label>
        <div className="setup-note">
          <AlertTriangle size={18} />
          Publishing is intentionally disabled until Supabase product persistence is applied.
        </div>
      </form>
    </div>
  );
}

function StudioAnalyticsPage() {
  const { state } = useAppState();
  const creator = creators[0];
  const products = creatorTasteProducts(creator.handle);
  const gross = products.reduce((total, product) => total + product.priceCents, 0) / 100;

  if (state.user?.role !== "creator") return <RequireCreatorPanel />;

  return (
    <div className="page-stack">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Creator monetisation pulse</h1>
          <p className="lead">A lightweight read on storefront views, checkout starts, purchases, and referral intent.</p>
        </div>
      </section>
      <section className="metric-grid">
        <Metric icon={<Globe2 size={19} />} label="Storefront views" value="1.2k" />
        <Metric icon={<CreditCard size={19} />} label="Checkout starts" value="84" />
        <Metric icon={<WalletCards size={19} />} label="Mock gross" value={money.format(gross)} />
        <Metric icon={<Bookmark size={19} />} label="Products" value={String(products.length)} />
      </section>
      <div className="setup-note">
        <Database size={18} />
        Production analytics should read `commerce_events` after event tracking is enabled.
      </div>
    </div>
  );
}

function SignInPage() {
  const { signIn } = useAppState();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirectPath(params.get("redirect"), "/");
  const [name, setName] = useState("Maya");
  const [email, setEmail] = useState("maya@example.com");
  const [notice, setNotice] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (supabase && email.includes("@")) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${redirect}`,
        },
      });

      if (error) {
        setNotice(error.message);
        return;
      } else {
        setNotice("Magic link sent. Demo mode also continues locally so you can keep testing.");
      }
    }

    signIn(name, "customer", email);
    navigate(redirect);
  };

  return (
    <CenteredPanel>
      <UserRound size={34} />
      <h1>Welcome to FitCheck</h1>
      <p>Sign in as a customer to save creators, buy edits, build a closet, and book services.</p>
      <div className={`setup-note compact ${supabaseStatus === "connected" ? "success" : ""}`}>
        <Database size={18} />
        {supabaseStatus === "connected"
          ? "Supabase is configured. Magic-link auth is enabled."
          : "Demo auth is active until Supabase environment variables are added."}
      </div>
      {notice ? <p className="form-error">{notice}</p> : null}
      <form className="signin-form" onSubmit={submit}>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <button className="button dark full" type="submit">
          Continue
          <ArrowRight size={18} />
        </button>
        <Link className="text-button" to={`/creator/signin?redirect=${encodeURIComponent(redirect)}`}>
          Creator sign in
          <ArrowRight size={16} />
        </Link>
      </form>
    </CenteredPanel>
  );
}

function CreatorSignInPage() {
  const { signIn, setMode } = useAppState();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirectPath(params.get("redirect"), "/studio/storefront");
  const [name, setName] = useState("Amara");
  const [email, setEmail] = useState("amara@example.com");
  const [notice, setNotice] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (supabase && email.includes("@")) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${redirect}`,
        },
      });

      if (error) {
        setNotice(error.message);
        return;
      }

      setNotice("Magic link sent. Local creator mode also continues for this prototype.");
    }

    signIn(name, "creator", email);
    setMode("studio");
    navigate(redirect);
  };

  return (
    <CenteredPanel>
      <Sparkles size={34} />
      <h1>Creator sign in</h1>
      <p>Manage your storefront, paid edits, service queue, and earnings from Studio.</p>
      {notice ? <p className="form-error">{notice}</p> : null}
      <form className="signin-form" onSubmit={submit}>
        <label>
          Creator name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <button className="button dark full" type="submit">
          <LayoutDashboard size={18} />
          Open Studio
        </button>
      </form>
    </CenteredPanel>
  );
}

function CreatorApplyPage() {
  const { addCreatorApplication } = useAppState();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    handle: "",
    aesthetic: "",
    links: "",
  });

  if (submitted) {
    return (
      <CenteredPanel>
        <Check size={34} />
        <h1>Application received</h1>
        <p>Your creator profile is in mock review. Approved creators get Studio access and a public FitCheck URL.</p>
        <Link className="button dark" to="/studio">
          Open Studio
        </Link>
      </CenteredPanel>
    );
  }

  return (
    <div className="apply-page">
      <section>
        <p className="eyebrow">Creator application</p>
        <h1>Build your profile, then sell structured styling work.</h1>
        <p className="lead">FitCheck is taste-led, not audience-size-led. Small creators with a sharp point of view belong here.</p>
      </section>
      <form className="form-panel" onSubmit={(event) => {
        event.preventDefault();
        addCreatorApplication({
          id: `application-${Date.now()}`,
          handle: form.handle || "new-creator",
          aesthetic: form.aesthetic || "fashion styling",
          links: form.links || "No links added",
          status: "submitted",
          createdAt: new Date().toISOString().slice(0, 10),
        });
        setSubmitted(true);
      }}>
        <label>
          Creator handle
          <input
            placeholder="@yourstyle"
            value={form.handle}
            onChange={(event) => setForm({ ...form, handle: event.target.value })}
          />
        </label>
        <label>
          Primary aesthetic
          <input
            placeholder="modest occasionwear, city capsule, dark academia"
            value={form.aesthetic}
            onChange={(event) => setForm({ ...form, aesthetic: event.target.value })}
          />
        </label>
        <label>
          Links to work
          <textarea
            placeholder="Instagram, TikTok, portfolio, or a short note about your styling work"
            value={form.links}
            onChange={(event) => setForm({ ...form, links: event.target.value })}
          />
        </label>
        <button className="button dark" type="submit">
          Submit application
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}

function AdminPage() {
  const { state, updateCreatorApplicationStatus, updateBookingStatus } = useAppState();

  if (state.user?.role !== "admin") {
    return (
      <CenteredPanel>
        <LockKeyhole size={34} />
        <h1>Admin console</h1>
        <p>Creator vetting, disputes, and moderation are admin-only. Use a configured admin account to access this route.</p>
      </CenteredPanel>
    );
  }

  const openBookings = state.bookings.filter((booking) => booking.status !== "completed");

  return (
    <div className="page-stack">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Operations console</h1>
          <p className="lead">The minimum queues needed before real creators, customer uploads, and paid bookings go live.</p>
        </div>
        <Link className="button light" to="/launch">
          <Globe2 size={18} />
          Launch checklist
        </Link>
      </section>

      <section className="metric-grid">
        <Metric icon={<UserRound size={19} />} label="Applications" value={String(state.creatorApplications.length)} />
        <Metric icon={<CalendarDays size={19} />} label="Open bookings" value={String(openBookings.length)} />
        <Metric icon={<AlertTriangle size={19} />} label="Moderation flags" value="2" />
        <Metric icon={<Gavel size={19} />} label="Disputes" value="1" />
      </section>

      <section className="admin-grid">
        <div className="studio-column">
          <SectionHeading eyebrow="Vetting" title="Creator applications" />
          {state.creatorApplications.map((application) => (
            <article className="studio-booking" key={application.id}>
              <div>
                <span className={`status-pill ${application.status === "approved" ? "ready" : "intake"}`}>
                  {application.status}
                </span>
                <h3>@{application.handle.replace(/^@/, "")}</h3>
                <p>{application.aesthetic}</p>
                <small>{application.links}</small>
              </div>
              <div className="studio-booking-actions">
                <button
                  className="button small light"
                  onClick={() => updateCreatorApplicationStatus(application.id, "approved")}
                >
                  Approve
                </button>
                <button
                  className="button small light"
                  onClick={() => updateCreatorApplicationStatus(application.id, "rejected")}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="studio-column">
          <SectionHeading eyebrow="Quality" title="Bookings and disputes" />
          {openBookings.map((booking) => (
            <article className="studio-booking" key={booking.id}>
              <div>
                <span className={`status-pill ${booking.status}`}>{statusLabel[booking.status]}</span>
                <h3>{booking.serviceTitle}</h3>
                <p>{booking.brief}</p>
              </div>
              <div className="studio-booking-actions">
                <Link className="text-button" to={`/bookings/${booking.id}`}>
                  Review
                  <ArrowRight size={16} />
                </Link>
                <button className="button small light" onClick={() => updateBookingStatus(booking.id, "completed")}>
                  Resolve
                </button>
              </div>
            </article>
          ))}
          <div className="setup-note">
            <AlertTriangle size={18} />
            Moderation/dispute rows are represented in the Supabase schema. Full queues need backend-connected data.
          </div>
        </div>
      </section>
    </div>
  );
}

function LaunchReadinessPage() {
  const [health, setHealth] = useState<ProductionHealth | null>(null);
  const [healthChecked, setHealthChecked] = useState(false);

  useEffect(() => {
    let active = true;

    getProductionHealth().then((result) => {
      if (!active) return;
      setHealth(result);
      setHealthChecked(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const productionChecks = [
    ["Supabase project", supabaseStatus === "connected", "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."],
    ["Database schema", false, "Run supabase/migrations/0001_initial_schema.sql."],
    ["Stripe checkout", false, "Add STRIPE_SECRET_KEY and configure webhook endpoint."],
    ["Storage buckets", false, "Created by migration; verify public/private policies in Supabase."],
    ["Domain and email", false, "Set production domain, auth redirect URLs, and transactional email provider."],
  ] as const;

  const productChecks = [
    "Recruit 15-25 founding creators in one focused aesthetic vertical.",
    "Review platform policies: 18% standard take rate, 12% Founding/Pro rate, 72-hour approval window.",
    "Collect creator/customer media releases for every non-generated production photo.",
    "Run mobile QA on iOS Safari and Android Chrome.",
    "Send the legal review packet to counsel before taking real payments.",
  ];

  return (
    <div className="page-stack">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Launch</p>
          <h1>Readiness checklist</h1>
          <p className="lead">Everything that has to be true before FitCheck can accept real users and payments.</p>
        </div>
        <Link className="button dark" to="/admin">
          <ShieldCheck size={18} />
          Admin console
        </Link>
      </section>

      <section className="readiness-grid">
        <div className="detail-panel">
          <h2>Technical readiness</h2>
          {productionChecks.map(([label, done, note]) => (
            <div className="check-row" key={label}>
              <span className={done ? "done" : ""}>{done ? <Check size={16} /> : <Clock3 size={16} />}</span>
              <div>
                <strong>{label}</strong>
                <p>{note}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="detail-panel">
          <h2>Live production health</h2>
          <HealthRow label="App URL" done={Boolean(health?.appUrlConfigured)} checked={healthChecked} />
          <HealthRow label="Stripe secret" done={Boolean(health?.stripeSecretConfigured)} checked={healthChecked} />
          <HealthRow
            label="Stripe webhook secret"
            done={Boolean(health?.stripeWebhookSecretConfigured)}
            checked={healthChecked}
          />
          <HealthRow label="Supabase admin" done={Boolean(health?.supabaseAdminConfigured)} checked={healthChecked} />
          <HealthRow
            label="Checkout table"
            done={Boolean(health?.checkoutSessionsReachable)}
            checked={healthChecked}
            note={health?.checkoutSessionsMessage ?? "Checking production health..."}
          />
          {healthChecked && !health ? (
            <div className="setup-note">
              <AlertTriangle size={18} />
              The health endpoint did not respond. Check the latest Vercel deployment and function logs.
            </div>
          ) : null}
        </div>
      </section>

      <section className="section-block">
        <SectionHeading eyebrow="Product readiness" title="Manual launch work" />
        <div className="detail-panel">
          {productChecks.map((item) => (
            <div className="check-row" key={item}>
              <span>
                <Clock3 size={16} />
              </span>
              <div>
                <strong>{item}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block">
        <SectionHeading eyebrow="Policies" title="Draft policy pages" />
        <div className="policy-link-grid">
          <Link to="/legal/terms">Terms</Link>
          <Link to="/legal/privacy">Privacy</Link>
          <Link to="/legal/creator-terms">Creator Terms</Link>
          <Link to="/legal/refunds">Refunds</Link>
          <Link to="/legal/platform-policies">Platform Policies</Link>
        </div>
      </section>
    </div>
  );
}

function HealthRow({ label, done, checked, note }: { label: string; done: boolean; checked: boolean; note?: string }) {
  return (
    <div className="check-row">
      <span className={done ? "done" : ""}>{done ? <Check size={16} /> : <Clock3 size={16} />}</span>
      <div>
        <strong>{label}</strong>
        <p>{note ?? (checked ? (done ? "Configured" : "Not confirmed") : "Checking production health...")}</p>
      </div>
    </div>
  );
}

const legalContent: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms of Service (Draft for Counsel)",
    body: [
      "Last updated: [DATE]. Operator: [LEGAL ENTITY NAME], [REGISTERED ADDRESS], Slovenia ([COMPANY REG NO / VAT ID]). Contact: [SUPPORT EMAIL].",
      "## 1. What FitCheck Is",
      "FitCheck is an online marketplace that connects customers with independent fashion creators who provide asynchronous styling deliverables such as wardrobe audits, outfit reviews, and capsule plans. FitCheck provides the platform, payment processing, and dispute framework. The styling service itself is provided by the creator, who acts as an independent provider and not as an employee or agent of FitCheck.",
      "## 2. Eligibility and Accounts",
      "You must be at least 18 years old to create an account or use FitCheck. You are responsible for keeping your login credentials confidential and for all activity under your account. You must provide accurate information and keep it current.",
      "## 3. Bookings and Customer Responsibilities",
      "Customers are responsible for providing an accurate brief, appropriate uploads, and timely responses to revision requests. Each service listing states its scope, expected turnaround, number of revision rounds, and deliverables. The listing at the time of booking is the agreed scope.",
      "## 4. Creator Responsibilities",
      "Creators must deliver the purchased scope within the stated turnaround, keep customer uploads confidential, and use customer materials only to complete the booked service. Public use of customer content, including before-and-after posts, requires the customer's explicit prior permission.",
      "## 5. Payments, Fees, and Currency",
      "Payments are processed by Stripe. FitCheck charges a marketplace fee on completed services as described in the Platform Policies. Prices are shown at checkout, including applicable VAT where required. FitCheck does not store full card numbers; payment data is handled by Stripe under its own terms and privacy policy.",
      "## 6. Payment Hold, Approval, and Release",
      "Customer payments are held until delivery approval. After the creator delivers, the customer has 72 hours to approve, request the included revision, or open a dispute. If the customer takes no action within 72 hours, the booking auto-approves and funds become releasable to the creator. This is a contractual payment-hold arrangement, not a regulated escrow service. [COUNSEL: confirm this characterization and whether any payment-services licensing analysis is needed given Stripe intermediation.]",
      "## 7. Right of Withdrawal (EU Consumers)",
      "EU consumers normally have a 14-day right of withdrawal for online purchases. By booking a service and requesting that work begin before the 14-day period ends, you expressly consent to early performance and acknowledge that once the service has been fully performed, the right of withdrawal is lost, and if you withdraw after work has started but before completion, you may owe a proportionate amount for work already performed. Cancellation before work starts is governed by the Refund Policy. [COUNSEL: confirm wording against Directive 2011/83/EU and Slovenian ZVPot-1 implementation.]",
      "## 8. Content and Licenses",
      "You retain ownership of content you upload. You grant FitCheck a limited, non-exclusive license to host, process, and display your content solely to operate the platform and deliver the booked services. Creators grant FitCheck a license to display their public profile content for marketing the platform. You must not upload content that infringes others' rights, is unlawful, or depicts anyone without appropriate consent.",
      "## 9. Prohibited Conduct",
      "No off-platform payment circumvention for services initiated on FitCheck, no harassment, no scraping, no impersonation, no uploading of unlawful or infringing content, and no use of the platform by or for anyone under 18.",
      "## 10. Termination",
      "You may close your account at any time. FitCheck may suspend or terminate accounts that violate these terms, with notice where legally required. Bookings in progress at termination are handled under the Refund Policy.",
      "## 11. Liability",
      "FitCheck provides the platform 'as is' to the fullest extent permitted by law. FitCheck is not a party to the styling service and is not liable for creator advice or outcomes. Nothing in these terms limits liability that cannot be limited under applicable law, including liability for intent or gross negligence. [COUNSEL: align limitation clause with Slovenian / EU consumer law.]",
      "## 12. Governing Law and Disputes",
      "These terms are governed by the law of the Republic of Slovenia. EU consumers retain the protection of mandatory provisions of the law of their country of residence and may use the platform's internal dispute process before, and without prejudice to, any court or ADR route. [COUNSEL: advise on arbitration/ADR clause and ODR references.]",
      "## 13. Changes",
      "We may update these terms. Material changes will be announced in the app or by email with reasonable notice; continued use after the effective date constitutes acceptance.",
      "This document is a working draft prepared for lawyer review. It must not be treated as legally approved until counsel signs off.",
    ],
  },
  privacy: {
    title: "Privacy Policy (Draft for Counsel)",
    body: [
      "Last updated: [DATE]. Data controller: [LEGAL ENTITY NAME], [REGISTERED ADDRESS], Slovenia. Contact: [PRIVACY EMAIL].",
      "## 1. What We Collect",
      "Account data (name, email, authentication identifiers); creator profile content; booking briefs and chat messages; closet items and uploads, which may include photographs of your body, face, wardrobe, and personal spaces; service and payment history; and technical data such as device, log, and usage information.",
      "## 2. Why We Process It (Legal Bases)",
      "To provide the platform and deliver booked services (performance of a contract, GDPR Art. 6(1)(b)); to process payments and prevent fraud (contract and legitimate interests, Art. 6(1)(b) and (f)); to secure and improve the platform (legitimate interests, Art. 6(1)(f)); to comply with accounting and tax law (legal obligation, Art. 6(1)(c)); and, where required, with your consent (Art. 6(1)(a)), which you can withdraw at any time.",
      "## 3. Photo Uploads Are Private by Default",
      "Booking uploads are visible only to you and the creator you booked. Creators may use your uploads only to complete the booked service. Any public use, including before-and-after posts, requires your explicit prior permission. We do not use your photos for biometric identification.",
      "## 4. Who We Share Data With (Processors)",
      "Supabase (database, authentication, file storage), Vercel (hosting), and Stripe (payments). These providers process data on our behalf under data processing agreements. Some processing may occur outside the EU/EEA; where it does, transfers rely on adequacy decisions or Standard Contractual Clauses. [COUNSEL: verify each subprocessor's current transfer mechanism and list regions.]",
      "## 5. Retention",
      "Account data is kept while your account is active. Booking records and invoices are retained as required by Slovenian accounting and tax law. Uploads tied to a booking are retained [X months] after completion and then deleted, unless you delete them earlier or law requires longer retention. [COUNSEL: set concrete retention periods.]",
      "## 6. Your Rights",
      "You have the right to access, rectify, erase, and receive a copy of your data, to restrict or object to processing, and to withdraw consent. To exercise these rights, contact [PRIVACY EMAIL]. You also have the right to lodge a complaint with your supervisory authority; in Slovenia this is the Information Commissioner (Informacijski pooblascenec, www.ip-rs.si).",
      "## 7. Minors",
      "FitCheck is not directed at anyone under 18, and we do not knowingly process minors' data. If you believe a minor has provided data, contact us and we will delete it.",
      "## 8. Cookies and Local Storage",
      "The app uses strictly necessary local storage for sessions and app state. If analytics or marketing cookies are added, they will require consent and will be listed here. [COUNSEL: confirm ePrivacy/ZEKom position for current storage use.]",
      "## 9. Security",
      "Data is encrypted in transit, access is restricted through row-level security and role-based keys, and secrets are stored in environment configuration rather than code.",
      "This document is a working draft prepared for lawyer review. It must not be treated as legally approved until counsel signs off.",
    ],
  },
  "creator-terms": {
    title: "Creator Terms (Draft for Counsel)",
    body: [
      "Last updated: [DATE]. These terms apply to creators offering services on FitCheck and supplement the Terms of Service.",
      "## 1. Independent Status",
      "Creators are independent providers, not employees, workers, or agents of FitCheck. Creators are responsible for their own taxes, social contributions, registrations, and legal compliance in their country. [COUNSEL: confirm classification language for Slovenian and cross-border creators.]",
      "## 2. Content Standards",
      "Creators must publish original or properly licensed content, must not upload third-party material without rights, and must never disclose or reuse private customer uploads. Verification is a quality signal, not a guaranteed discovery boost.",
      "## 3. Service Templates and Scope",
      "Services follow platform templates so customers can understand scope, turnaround, revision rounds, and deliverables. The published listing at the time of booking defines the agreed scope. Creators must deliver within the stated turnaround or proactively communicate delays.",
      "## 4. Economics",
      "Standard platform take rate: 18% of the service price. Founding Creator / Pro take rate: 12%. Payment processing fees are passed through before payout. Capsule Build affiliate revenue is split 70% to the creator and 30% to FitCheck. Affiliate recommendations must be disclosed to customers as such.",
      "## 5. Payouts",
      "Funds become releasable after customer approval or 72-hour auto-approval; disputed bookings remain held until resolved. Payouts are batched weekly on Friday through Stripe Connect. New creators have a 7-day payout hold on their first 5 completed bookings. Creators must complete Stripe Connect onboarding, including identity verification, before receiving payouts.",
      "## 6. Refunds and Disputes",
      "Creators participate in the dispute process in good faith. Where a refund is issued under the Refund Policy, the corresponding creator earnings and platform fee are reversed. Chargebacks initiated by customers follow Stripe's process; FitCheck may pass on chargeback outcomes.",
      "## 7. Termination",
      "Either side may end the relationship at any time. Bookings in progress must be completed or refunded. FitCheck may suspend creators for content, confidentiality, or conduct violations, with notice where legally required.",
      "This document is a working draft prepared for lawyer review. It must not be treated as legally approved until counsel signs off.",
    ],
  },
  refunds: {
    title: "Refund and Revision Policy (Draft for Counsel)",
    body: [
      "Last updated: [DATE]. This policy applies to all paid services booked on FitCheck.",
      "## 1. Included Revision",
      "Every paid service includes one revision round. Revision requests must stay within the originally booked scope.",
      "## 2. Approval Window",
      "Customers have 72 hours after delivery to approve, request the included revision, or open a dispute. If no action is taken within 72 hours, the booking auto-approves and payment becomes releasable to the creator.",
      "## 3. Cancellation",
      "Customers may cancel for a full refund before creator work starts or within 2 hours of booking, whichever comes first. After work has started, refunds are governed by the dispute process and, for EU consumers, the proportional rules described in the Terms of Service withdrawal section.",
      "## 4. Disputes",
      "Disputes must be opened within 7 days of delivery. Disputes are reviewed using the booking brief, chat history, deliverable, and revision record. Outcomes can be full refund, partial refund, or release to the creator. Funds stay held while a dispute is open.",
      "## 5. Refund Method and Timing",
      "Approved refunds are returned to the original payment method through Stripe, typically within 5-10 business days depending on the customer's bank.",
      "## 6. Statutory Rights",
      "Nothing in this policy limits statutory rights that EU consumers have under applicable law, including remedies for services not performed with due care.",
      "This document is a working draft prepared for lawyer review. It must not be treated as legally approved until counsel signs off.",
    ],
  },
  "platform-policies": {
    title: "Platform Policies (Draft for Counsel)",
    body: [
      "Last updated: [DATE]. Operational policies for the FitCheck marketplace.",
      "## 1. Economics",
      "Standard creator take rate: 18%. Founding Creator / Pro take rate: 12%. Capsule affiliate split: 70% creator and 30% FitCheck. Payment processing fees are passed through before payout.",
      "## 2. Funds Flow",
      "Funds become releasable after customer approval or 72-hour auto-approval. Disputed bookings remain held until resolved. Creator payouts are batched weekly on Friday through Stripe Connect. New creators have a 7-day payout hold for their first 5 completed bookings.",
      "## 3. Language Rule",
      "Do not describe the system as formal legal escrow until counsel approves that language. Use 'payment held until delivery approval'.",
      "## 4. Content and Takedowns",
      "Infringing or unlawful content is removed on notice. Rights holders can report content to [SUPPORT EMAIL] with identification of the work and its location; the uploader is notified and may respond. Repeat infringers are removed. [COUNSEL: shape into a formal notice-and-action procedure consistent with the DSA.]",
      "## 5. Safety and Privacy",
      "Customer uploads are private by default. Creators must not share, publish, or train on customer materials. No content involving minors. Harassment, hate, and sexualized content of non-consenting persons are prohibited.",
      "## 6. Affiliate Disclosure",
      "Capsule Build recommendations that carry affiliate revenue must be identifiable as affiliate recommendations to the customer.",
      "This document is a working draft prepared for lawyer review. It must not be treated as legally approved until counsel signs off.",
    ],
  },
};

function LegalPage() {
  const { slug = "terms" } = useParams();
  const content = legalContent[slug] ?? legalContent.terms;

  return (
    <article className="legal-page">
      <p className="eyebrow">Legal draft</p>
      <h1>{content.title}</h1>
      {content.body.map((paragraph) =>
        paragraph.startsWith("## ") ? (
          <h2 key={paragraph}>{paragraph.slice(3)}</h2>
        ) : (
          <p key={paragraph}>{paragraph}</p>
        ),
      )}
      <div className="setup-note">
        <Gavel size={18} />
        This is launch planning copy, not legal advice. Final terms should be prepared or reviewed by a lawyer.
      </div>
    </article>
  );
}

function NotFoundPage() {
  return <NotFoundPanel title="Page not found" text="That route is not part of the FitCheck MVP." />;
}

function TasteProductCard({ product, variant = "default" }: { product: TasteProduct; variant?: "default" | "featured" }) {
  const creator = getCreator(product.creatorHandle);

  return (
    <article className={`product-card ${variant === "featured" ? "featured-offer" : ""}`}>
      <Link to={`/creator/${product.creatorHandle}/edit/${product.slug}`}>
        <img src={product.coverImageUrl} alt={product.title} />
      </Link>
      <div>
        <span>{product.accessType === "paid" ? productMoney(product.priceCents, product.currency) : "Free"}</span>
        <h3>{product.title}</h3>
        <p>{product.subtitle}</p>
        <div className="creator-meta">
          <span>{product.totalItemCount} products</span>
          <span>{product.outfitCount} outfits</span>
          {creator ? <span>{creator.displayName}</span> : null}
        </div>
        <Link className="text-button" to={`/creator/${product.creatorHandle}/edit/${product.slug}`}>
          Open edit
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}

function ProductItemCard({ item, unlocked = false }: { item: TasteProductItem; unlocked?: boolean }) {
  return (
    <article className="product-item-card">
      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : null}
      <div>
        <span>{unlocked || item.isPreview ? "Creator note" : "Preview"}</span>
        <h3>{item.name}</h3>
        <p>{item.brand}</p>
        {item.priceLabel ? <strong>{item.priceLabel}</strong> : null}
        <p>{item.creatorNote}</p>
        {unlocked && item.destinationUrl ? (
          <a className="text-button" href={item.destinationUrl} target="_blank" rel="noreferrer">
            Open link
            <ArrowRight size={16} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function OutfitCard({ outfit }: { outfit: TasteProductOutfit }) {
  return (
    <article className="look-card">
      {outfit.imageUrl ? <img src={outfit.imageUrl} alt={outfit.title} /> : null}
      <div>
        <h3>{outfit.title}</h3>
        <p>{outfit.creatorNote}</p>
        <span>{outfit.itemIds.length} linked item(s)</span>
      </div>
    </article>
  );
}

function LockedPreviewCard({ count }: { count: number }) {
  return (
    <article className="locked-card">
      <LockKeyhole size={28} />
      <h3>{count} protected picks remain</h3>
      <p>The public page never loads full paid content. Production access is checked through entitlements.</p>
    </article>
  );
}

function AccessStatePanel({ title, text }: { title: string; text: string }) {
  return (
    <CenteredPanel>
      <LockKeyhole size={34} />
      <h1>{title}</h1>
      <p>{text}</p>
      <Link className="button dark" to="/library">
        Back to library
      </Link>
    </CenteredPanel>
  );
}

function CreatorCard({ creator, compact = false }: { creator: Creator; compact?: boolean }) {
  const { state, toggleCreator } = useAppState();
  const saved = state.savedCreatorHandles.includes(creator.handle);
  const topService = creator.services[0];

  return (
    <article className={`creator-card ${compact ? "compact" : ""}`}>
      <Link to={`/creator/${creator.handle}`} className="creator-card-media">
        <img src={creator.cover} alt={`${creator.displayName} cover`} />
        <img className="avatar" src={creator.avatar} alt={creator.displayName} />
      </Link>
      <div className="creator-card-body">
        <div className="creator-title-row">
          <div>
            <h2>{creator.displayName}</h2>
            <p>{creator.location}</p>
          </div>
          <button
            className="icon-button"
            title={saved ? "Unfollow creator" : "Follow creator"}
            aria-label={saved ? "Unfollow creator" : "Follow creator"}
            onClick={() => toggleCreator(creator.handle)}
          >
            <Heart size={18} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <p>{creator.bio}</p>
        <div className="tag-row">
          {creator.aesthetics.slice(0, compact ? 2 : 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="creator-meta">
          <span>
            <Star size={15} fill="currentColor" />
            {creator.rating.toFixed(2)}
          </span>
          <span>{formatFollowerCount(creator.followerCount)} followers</span>
          <span>{topService.priceLabel} from</span>
        </div>
        <Link className="text-button" to={`/creator/${creator.handle}`}>
          View profile
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}

function PostCard({ post }: { post: Post }) {
  const { state, togglePost } = useAppState();
  const creator = getCreator(post.creatorHandle);
  const saved = state.savedPostIds.includes(post.id);

  return (
    <article className="post-card">
      <Link to={`/post/${post.id}`} className="post-card-media">
        <img src={post.image} alt={post.title} />
      </Link>
      <div className="post-card-body">
        <div>
          <span>{post.type.replace("-", " ")}</span>
          <h2>{post.title}</h2>
          <p>{post.summary}</p>
        </div>
        <div className="post-card-footer">
          <Link to={`/creator/${creator?.handle ?? post.creatorHandle}`}>{creator?.displayName ?? post.creatorHandle}</Link>
          <button
            className="icon-button"
            title={saved ? "Unsave post" : "Save post"}
            aria-label={saved ? "Unsave post" : "Save post"}
            onClick={() => togglePost(post.id)}
          >
            <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </article>
  );
}

function ServiceCard({ creator, service }: { creator: Creator; service: Service }) {
  return (
    <article className="service-card">
      <div>
        <span>{service.turnaround}</span>
        <h3>{service.title}</h3>
        <p>{service.summary}</p>
      </div>
      <div className="service-deliverables">
        {service.deliverables.slice(0, 3).map((deliverable) => (
          <span key={deliverable}>
            <Check size={15} />
            {deliverable}
          </span>
        ))}
      </div>
      <div className="service-footer">
        <strong>{service.priceLabel}</strong>
        <div className="service-actions">
          <Link className="button light small" to={`/creator/${creator.handle}/service/${service.id}`}>
            Details
          </Link>
          <Link className="button dark small" to={`/book/${creator.handle}/${service.id}`}>
            Book
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CreatorMini({ creator }: { creator: Creator }) {
  return (
    <Link className="creator-mini" to={`/creator/${creator.handle}`}>
      <img className="avatar" src={creator.avatar} alt={creator.displayName} />
      <div>
        <strong>{creator.displayName}</strong>
        <span>
          {creator.rating.toFixed(2)} rating / {formatFollowerCount(creator.followerCount)} followers
        </span>
      </div>
      <ChevronRight size={18} />
    </Link>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const creator = getCreator(booking.creatorHandle);
  return (
    <Link className="booking-card" to={`/bookings/${booking.id}`}>
      <div>
        <span className={`status-pill ${booking.status}`}>{statusLabel[booking.status]}</span>
        <h2>{booking.serviceTitle}</h2>
        <p>{booking.brief}</p>
      </div>
      <div className="booking-card-side">
        <span>{creator?.displayName ?? booking.creatorHandle}</span>
        <strong>{money.format(booking.price)}</strong>
        <small>Due {formatDate(booking.dueDate)}</small>
      </div>
    </Link>
  );
}

function Timeline({ status }: { status: Booking["status"] }) {
  const steps: Booking["status"][] = ["intake", "in_progress", "ready", "completed"];
  const activeIndex = steps.indexOf(status);
  return (
    <ol className="timeline">
      {steps.map((step, index) => (
        <li key={step} className={index <= activeIndex ? "active" : ""}>
          <span />
          {statusLabel[step]}
        </li>
      ))}
    </ol>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action ? <div className="section-action">{action}</div> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="confirm-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="empty-state">
      {icon}
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function CenteredPanel({ children }: { children: ReactNode }) {
  return <section className="centered-panel">{children}</section>;
}

function AuthGate({ title, text, redirect }: { title: string; text: string; redirect: string }) {
  return (
    <CenteredPanel>
      <ShieldCheck size={34} />
      <h1>{title}</h1>
      <p>{text}</p>
      <Link className="button dark" to={`/signin?redirect=${encodeURIComponent(redirect)}`}>
        Sign in
        <ArrowRight size={18} />
      </Link>
    </CenteredPanel>
  );
}

function NotFoundPanel({ title, text }: { title: string; text: string }) {
  return (
    <CenteredPanel>
      <Search size={34} />
      <h1>{title}</h1>
      <p>{text}</p>
      <Link className="button dark" to="/">
        Back to Discover
      </Link>
    </CenteredPanel>
  );
}
