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
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Link,
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
  creators,
  getCreator,
  getPost,
  getService,
  posts,
  quizLooks,
} from "./data";
import { useAppState } from "./state";
import { createCheckoutSession, getCheckoutStatus } from "./lib/payments";
import { supabase, supabaseStatus } from "./lib/supabase";
import { uploadPrivateImage } from "./lib/uploads";
import type { Booking, ClosetItem, Creator, CreatorDraft, Post, Service } from "./types";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

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
        <Route path="/quiz" element={<StyleQuizPage />} />
        <Route path="/creator/:handle" element={<CreatorProfilePage />} />
        <Route path="/post/:postId" element={<PostPage />} />
        <Route path="/book/:handle/:serviceId" element={<BookingPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/bookings/:bookingId" element={<BookingDetailPage />} />
        <Route path="/closet" element={<ClosetPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/launch" element={<LaunchReadinessPage />} />
        <Route path="/legal/:slug" element={<LegalPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/apply" element={<CreatorApplyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function AppShell() {
  const { state, setMode, signOut } = useAppState();
  const user = state.user;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="FitCheck home">
          <span className="brand-mark">F</span>
          <span>FitCheck</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <NavLink to="/">Discover</NavLink>
          <NavLink to="/quiz">Style quiz</NavLink>
          <NavLink to="/closet">Closet</NavLink>
          <NavLink to="/bookings">Bookings</NavLink>
          <NavLink to="/studio">Studio</NavLink>
          <NavLink to="/launch">Launch</NavLink>
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
        <NavLink to="/">
          <Search size={19} />
          <span>Discover</span>
        </NavLink>
        <NavLink to="/closet">
          <Shirt size={19} />
          <span>Closet</span>
        </NavLink>
        <NavLink to="/bookings">
          <CalendarDays size={19} />
          <span>Bookings</span>
        </NavLink>
        <NavLink to="/studio">
          <LayoutDashboard size={19} />
          <span>Studio</span>
        </NavLink>
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
            <Link className="button dark" to="/quiz">
              <Sparkles size={18} />
              Take style quiz
            </Link>
            <Link className="button light" to={`/creator/${featured.handle}`}>
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
          action={<Link to="/quiz">Try quiz</Link>}
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
            text="Try a different aesthetic, city, creator name, or use the style quiz."
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

function StyleQuizPage() {
  const [index, setIndex] = useState(0);
  const [likedTags, setLikedTags] = useState<string[]>([]);
  const [matching, setMatching] = useState(false);
  const isDone = index >= quizLooks.length;
  const current = quizLooks[index];

  const matches = useMemo(() => {
    const tagScore = new Map<string, number>();
    likedTags.forEach((tag) => tagScore.set(tag, (tagScore.get(tag) ?? 0) + 1));
    return [...creators]
      .map((creator) => ({
        creator,
        score: creator.aesthetics.reduce((total, tag) => total + (tagScore.get(tag) ?? 0), 0),
      }))
      .sort((a, b) => b.score - a.score || b.creator.rating - a.creator.rating)
      .map((item) => item.creator)
      .slice(0, 3);
  }, [likedTags]);

  const vote = (liked: boolean) => {
    if (!current) return;
    const nextTags = liked ? [...likedTags, ...current.tags] : likedTags;
    if (liked) setLikedTags(nextTags);

    if (index + 1 >= quizLooks.length) {
      setMatching(true);
      window.setTimeout(() => {
        setIndex(index + 1);
        setMatching(false);
      }, 650);
      return;
    }

    setIndex(index + 1);
  };

  const reset = () => {
    setIndex(0);
    setLikedTags([]);
    setMatching(false);
  };

  if (matching) {
    return (
      <CenteredPanel>
        <Loader2 className="spin" size={34} />
        <h1>Finding your creators</h1>
        <p>Your likes are being matched against creator aesthetics.</p>
      </CenteredPanel>
    );
  }

  if (isDone) {
    return (
      <div className="page-stack">
        <section className="quiz-results">
          <p className="eyebrow">Style quiz</p>
          <h1>Your closest creator matches</h1>
          <p className="lead">Based on the looks you saved, these profiles are the strongest starting points.</p>
          <div className="creator-grid">
            {matches.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
          <div className="quick-actions">
            <button className="button light" onClick={reset}>
              <X size={18} />
              Retake quiz
            </button>
            <Link className="button dark" to={`/creator/${matches[0]?.handle ?? creators[0].handle}`}>
              <ArrowRight size={18} />
              Open best match
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="quiz-shell">
      <section className="quiz-card">
        <div className="quiz-progress">
          <span>
            {index + 1} of {quizLooks.length}
          </span>
          <div>
            <i style={{ width: `${((index + 1) / quizLooks.length) * 100}%` }} />
          </div>
        </div>
        <img src={current.image} alt={current.title} />
        <div className="quiz-caption">
          <p className="eyebrow">Tap your instinct</p>
          <h1>{current.title}</h1>
          <p>{current.tags.join(" / ")}</p>
        </div>
        <div className="quiz-actions">
          <button className="round-choice" title="Not my style" aria-label="Not my style" onClick={() => vote(false)}>
            <X size={28} />
          </button>
          <button className="round-choice primary" title="Save this style" aria-label="Save this style" onClick={() => vote(true)}>
            <Heart size={28} />
          </button>
        </div>
      </section>
    </div>
  );
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
            <p>{creator.bio}</p>
            <div className="tag-row">
              {creator.aesthetics.slice(0, 4).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="profile-stats">
          <Stat label="Followers" value={creator.followers} />
          <Stat label="Rating" value={creator.rating.toFixed(2)} />
          <Stat label="Reviews" value={String(creator.reviewCount)} />
          <Stat label="Avg turn" value={creator.avgTurnaround} />
        </div>
        <div className="profile-actions">
          <Link className="button dark" to={`/book/${creator.handle}/${creator.services[0].id}`}>
            <CalendarDays size={18} />
            Book a service
          </Link>
          <button className="button light" onClick={() => toggleCreator(creator.handle)}>
            <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
            {isSaved ? "Following" : "Follow"}
          </button>
        </div>
      </section>

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
  const booking = state.bookings.find((item) => item.id === bookingId);

  useEffect(() => {
    if (!booking || params.get("checkout") !== "success") return;

    let active = true;

    getCheckoutStatus(booking.id).then((result) => {
      if (!active) return;

      if (result.paymentStatus === "paid" && booking.paymentStatus !== "paid") {
        updateBookingPaymentStatus(booking.id, "paid");
      }

      if (result.paymentStatus === "failed" && booking.paymentStatus !== "failed") {
        updateBookingPaymentStatus(booking.id, "failed");
      }

      if (result.paymentStatus === "refunded" && booking.paymentStatus !== "refunded") {
        updateBookingPaymentStatus(booking.id, "refunded");
      }
    });

    return () => {
      active = false;
    };
  }, [booking, params, updateBookingPaymentStatus]);

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
          {params.get("checkout") === "success" ? (
            <div className="setup-note compact success">
              <ShieldCheck size={18} />
              Stripe checkout returned successfully.
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
  const { state, signIn, setMode, updateBookingStatus, saveCreatorDraft, addStudioPost } = useAppState();
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
        <p>Use the creator demo to triage bookings, assemble lookbooks, and manage services.</p>
        <div className="quick-actions centered">
          <button
            className="button dark"
            onClick={() => {
              signIn("Amara", "creator");
              setMode("studio");
            }}
          >
            <Sparkles size={18} />
            Continue as creator
          </button>
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

function SignInPage() {
  const { signIn } = useAppState();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const [name, setName] = useState("Maya");
  const [email, setEmail] = useState("maya@example.com");
  const [role, setRole] = useState<"customer" | "creator" | "admin">("customer");
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

    signIn(name, role, email);
    navigate(redirect);
  };

  return (
    <CenteredPanel>
      <UserRound size={34} />
      <h1>Welcome to FitCheck</h1>
      <p>Use a demo account to save creators, build a closet, book services, and open Studio.</p>
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
        <div className="role-choice" aria-label="Account type">
          <button type="button" className={role === "customer" ? "active" : ""} onClick={() => setRole("customer")}>
            Customer
          </button>
          <button type="button" className={role === "creator" ? "active" : ""} onClick={() => setRole("creator")}>
            Creator
          </button>
          <button type="button" className={role === "admin" ? "active" : ""} onClick={() => setRole("admin")}>
            Admin
          </button>
        </div>
        <button className="button dark full" type="submit">
          Continue
          <ArrowRight size={18} />
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
  const { state, signIn, updateCreatorApplicationStatus, updateBookingStatus } = useAppState();

  if (state.user?.role !== "admin") {
    return (
      <CenteredPanel>
        <LockKeyhole size={34} />
        <h1>Admin console</h1>
        <p>Creator vetting, disputes, and moderation are admin-only in production. Use demo admin mode locally.</p>
        <button className="button dark" onClick={() => signIn("FitCheck Admin", "admin", "admin@fitcheck.local")}>
          <ShieldCheck size={18} />
          Continue as admin
        </button>
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
          <h2>Product readiness</h2>
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

const legalContent: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms of Service Draft For Counsel",
    body: [
      "FitCheck connects customers with independent creators who provide asynchronous styling deliverables.",
      "Customers are responsible for providing accurate briefs, appropriate uploads, and timely revision requests.",
      "Creators are responsible for delivering the purchased scope by the stated turnaround and respecting customer privacy.",
      "FitCheck charges a marketplace fee on completed services and may process payments through Stripe or another payment provider.",
      "This page is prepared for lawyer review and must not be treated as legally approved until counsel signs off.",
    ],
  },
  privacy: {
    title: "Privacy Policy Draft For Counsel",
    body: [
      "FitCheck stores account information, creator profile content, booking briefs, closet items, uploads, and service history.",
      "Booking uploads may include body, face, wardrobe, and personal-space photographs and must be private by default.",
      "Creators may use customer uploads only to complete the booked service. Public before-and-after posts require explicit customer permission.",
      "Production launch requires a complete retention, deletion, analytics, subprocessors, and age/minor policy.",
    ],
  },
  "creator-terms": {
    title: "Creator Terms Draft For Counsel",
    body: [
      "Creators must publish original or properly licensed content and may not disclose private customer uploads.",
      "Services follow platform templates so customers can understand scope, turnaround, revisions, and deliverables.",
      "Verification is a quality signal, not a guaranteed discovery boost.",
      "Launch economics: 18% standard platform take rate, 12% Founding Creator / Pro take rate, payment processing fees passed through before payout.",
      "Capsule Build affiliate revenue split: 70% creator and 30% FitCheck.",
    ],
  },
  refunds: {
    title: "Refund And Revision Policy Draft For Counsel",
    body: [
      "Every paid service includes one revision round.",
      "Customers have 72 hours after delivery to approve, request revision, or open a dispute. If no action is taken, the booking auto-approves.",
      "Customers may cancel for a full refund before creator work starts or within 2 hours of booking, whichever comes first.",
      "Disputes must be opened within 7 days of delivery and should be reviewed using the booking brief, chat history, deliverable, and revision record.",
    ],
  },
  "platform-policies": {
    title: "Platform Policies Draft For Counsel",
    body: [
      "Standard creator take rate: 18%. Founding Creator / Pro take rate: 12%. Capsule affiliate split: 70% creator and 30% FitCheck.",
      "Funds become releasable after customer approval or 72-hour auto-approval. Disputed bookings remain held until resolved.",
      "Creator payouts are batched weekly on Friday through Stripe Connect. New creators have a 7-day payout hold for their first 5 completed bookings.",
      "Do not describe the system as formal legal escrow until counsel approves that language. Use payment held until delivery approval.",
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
      {content.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
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
          <span>{creator.followers} followers</span>
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
        <Link className="button dark small" to={`/book/${creator.handle}/${service.id}`}>
          Book
          <ArrowRight size={16} />
        </Link>
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
          {creator.rating.toFixed(2)} rating / {creator.followers} followers
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
