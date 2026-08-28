# Romantic Universe — Architecture & Design Document

> Complete planning reference for the interactive 3D romantic website.

---

## 1. Experience / Storyboard

The site is a **single-page cinematic journey** told in 9 chapters. Each chapter fades into the next via scroll-triggered transitions and shared atmospheric elements (particles, soft glow, ambient audio).

| Chapter | ID | Title | Experience |
|---------|-----|-------|------------|
| 0 | `opening` | **You Found Something** | Dark starfield. Sequential typewriter text: "Hey beautiful…" → "I made a little universe for you." Glowing CTA: "Enter Our Little World ✨". Optional nickname lock overlay. |
| 1 | `universe` | **Welcome to Our Little Universe** | Full-viewport Three.js scene. Floating hearts, petals, photo-orbs. Mouse parallax. Transitions into scrollable content on first scroll. |
| 2 | `hero` | **Look at This Beautiful Human** | Hero photo with glassmorphism frame. Parallax quote. Name from config. |
| 3 | `memories` | **Things I Remember** | Vertical timeline of floating glass cards. Scroll-reveal. Tap → fullscreen modal with photo + message. |
| 4 | `reasons` | **Things I Adore About You** | Grid of tilt-cards. Short label → long message on click. |
| 5 | `love-bombs` | **Love Bomb Attack** | Centered glowing button. Each tap: API fetch → burst animation → romantic message card. |
| 6 | `open-when` | **Messages for Different Days** | Envelope row. Click → open animation → letter content. |
| 7 | `gallery` | **Our Moments in 3D** | 3D photo carousel / polaroid wall. Hover lift. Tap → lightbox. |
| 8 | `constellation` | **Messages Written in Stars** | Interactive star field (canvas/Three.js lite). Tap star → quote reveal. |
| 9 | `surprises` | **Hidden Surprises** | Scattered flower bloom, secret heart Easter egg, quote echoes. |
| 10 | `finale` | **Before You Go** | Darken. Particles form heart. Sequential closing lines. Final personalized message. "One last surprise ✨" → grand particle finale. |

**Narrative thread:** Discovery → wonder → admiration → memory → affection → playfulness → comfort → beauty → secrets → closure.

---

## 2. UI/UX Concept

### Visual language
- **Glass panels:** `backdrop-filter: blur(20px)`, semi-transparent white/rose tint, soft border `1px solid rgba(255,255,255,0.2)`.
- **Depth:** Layered z-index, subtle box-shadows with rose tint, parallax on scroll.
- **Spacing:** Mobile 16–24px gutters; desktop 48–80px section padding.
- **Cards:** `border-radius: 20–28px`, generous internal padding.
- **CTAs:** Pill buttons with gradient fill, soft glow on hover, scale 1.02.
- **Icons:** Minimal line icons + emoji used sparingly for warmth.

### Interaction patterns
- **Scroll = story progression** — sections snap gently (CSS scroll-snap optional on mobile).
- **Tap-first on mobile** — no hover-only affordances.
- **Feedback:** Every interaction gets micro-animation (scale, glow, particle burst).
- **Loading:** Skeleton shimmer on cards; spinner only for API calls.
- **Errors:** Soft inline retry, never harsh alerts.

### Accessibility
- Semantic HTML (`main`, `section`, `article`, `button`).
- `aria-label` on icon-only controls.
- Focus rings visible.
- `prefers-reduced-motion`: disable particles, use instant fades.
- Music never autoplays; explicit user gesture required.

---

## 3. Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--blush` | `#F8E8EE` | Background washes |
| `--rose` | `#E8A0BF` | Primary accent |
| `--rose-deep` | `#C77D9E` | Hover states |
| `--lavender` | `#D4B8E8` | Secondary accent, stars |
| `--cream` | `#FFF8F0` | Light backgrounds |
| `--champagne` | `#E8D5B5` | Gold accents, stars |
| `--burgundy` | `#5C1A2E` | Headlines, dark sections |
| `--night` | `#1A0F14` | Opening / finale backgrounds |
| `--glass` | `rgba(255,248,240,0.12)` | Glass panels |
| `--glow-rose` | `rgba(232,160,191,0.45)` | Box-shadow glow |

**Gradients:**
- Hero: `linear-gradient(135deg, #1A0F14 0%, #3D1F2E 40%, #5C1A2E 100%)`
- Light sections: `linear-gradient(180deg, #FFF8F0 0%, #F8E8EE 100%)`
- Buttons: `linear-gradient(135deg, #E8A0BF, #D4B8E8)`

---

## 4. Typography

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Display / Headlines | **Cormorant Garamond** | 500–600 | Elegant serif, romantic |
| Body | **Outfit** | 300–400 | Clean, modern, readable |
| Accent / Quotes | **Playfair Display** italic | 400 | Pull quotes, love bombs |
| Mono (optional) | **JetBrains Mono** | 400 | "Made with Java" footer only |

**Scale (mobile → desktop):**
- H1: `clamp(2rem, 5vw, 3.5rem)`
- H2: `clamp(1.5rem, 3vw, 2.25rem)`
- Body: `clamp(1rem, 2vw, 1.125rem)`
- Letter-spacing on display: `0.02em`

Load via Google Fonts with `font-display: swap`.

---

## 5. Animation Plan

| Element | Library | Technique |
|---------|---------|-----------|
| Opening text sequence | GSAP Timeline | Staggered fade + blur-in |
| Enter transition | GSAP + custom particles | Scale portal + heart burst |
| Scroll reveals | GSAP ScrollTrigger | `opacity`, `y`, `scale` |
| Section parallax | GSAP ScrollTrigger | `yPercent` on layers |
| Love bomb reveal | Angular Animations + GSAP | `scale` bounce + confetti |
| Envelope open | CSS 3D transform + GSAP | `rotateX` flap |
| Card tilt | CSS `transform: perspective` | Mouse/touch position |
| Finale heart | Three.js or Canvas | Particle convergence |
| Micro-interactions | CSS transitions | `0.3s cubic-bezier(0.4,0,0.2,1)` |

**Reduced motion:** Replace timelines with instant `opacity: 1`; skip particle systems.

---

## 6. 3D Scene Plan

### Love Universe (Three.js)
- **Renderer:** WebGLRenderer, antialias, `powerPreference: 'high-performance'`, pixel ratio capped at 2.
- **Camera:** PerspectiveCamera, slow idle orbit.
- **Lights:** Ambient + point rose light + subtle directional.
- **Objects:**
  - Instanced mesh hearts (low-poly, ~50 instances)
  - Point cloud stars (~200 points)
  - Rose petal planes with alpha texture (instanced, slow fall)
  - 3–5 photo planes (textures from API) floating on sine paths
  - Central torus/heart shape with emissive material
- **Interaction:** Raycaster optional; primary effect is mouse-based camera parallax (`mousemove` → `camera.position.lerp`).
- **Mobile:** Reduce instances by 60%, disable shadows, pause when `document.hidden` or section off-screen.

### Photo Gallery 3D
- CSS 3D transforms for carousel (lighter than full Three.js on mobile).
- Desktop: optional Three.js curved wall; mobile: horizontal snap scroll with polaroid cards.

### Quote Constellation
- Canvas 2D star field on mobile; Three.js points on desktop.

---

## 7. Mobile Experience

- **Mobile-first CSS** with breakpoints: `480`, `768`, `1024`, `1280`.
- Touch targets ≥ 44px.
- 3D sections degrade gracefully: fewer particles, CSS fallbacks.
- Horizontal swipe for gallery and open-when envelopes.
- Sticky music control (bottom-right FAB).
- `viewport-fit=cover` for notched devices.
- Lazy-load images: `loading="lazy"`, Intersection Observer for 3D textures.
- Pause animations when `IntersectionObserver` reports section not visible.

---

## 8. Angular Architecture

```
frontend/src/app/
├── core/
│   ├── services/          # ApiService, ConfigService, AudioService, MotionService
│   ├── models/            # TypeScript interfaces matching DTOs
│   ├── interceptors/      # API base URL, error handling
│   └── guards/            # EntryLockGuard (optional)
├── shared/
│   ├── components/        # GlassCard, ParticleBurst, LoadingSpinner, Modal
│   ├── directives/        # ParallaxDirective, TiltDirective, InViewDirective
│   └── pipes/
├── features/
│   ├── opening/
│   ├── love-universe/
│   ├── hero/
│   ├── memory-timeline/
│   ├── reasons/
│   ├── love-bomb/
│   ├── open-when/
│   ├── photo-gallery/
│   ├── quote-constellation/
│   ├── flower-surprise/
│   ├── secret-heart/
│   ├── finale/
│   └── music-player/
├── layout/
│   └── main-layout/
├── app.component.*
├── app.config.ts
└── app.routes.ts
```

**State:** Services + signals (Angular 19). No NgRx needed.
**API:** `HttpClient` → `environment.apiUrl`.
**3D:** Lazy-loaded feature modules for Three.js chunks.

---

## 9. Spring Boot Architecture

```
com.loveuniverse/
├── RomanticUniverseApplication.java
├── config/
│   ├── CorsConfig.java
│   ├── WebConfig.java
│   └── SecurityConfig.java (optional entry lock)
├── controller/
│   ├── MemoryController.java
│   ├── PhotoController.java
│   ├── QuoteController.java
│   ├── LoveBombController.java
│   ├── ReasonController.java
│   ├── OpenWhenController.java
│   ├── ConfigController.java
│   └── AuthController.java (optional)
├── dto/                   # Response/Request records
├── entity/                # JPA entities
├── repository/            # Spring Data JPA
├── service/               # Business logic
├── mapper/                # Entity ↔ DTO
└── exception/
    ├── GlobalExceptionHandler.java
    └── ResourceNotFoundException.java
```

**Patterns:** Controller → Service → Repository. DTOs at API boundary. Validation via `@Valid`.

---

## 10. SQL Schema

See `backend/src/main/resources/db/schema.sql` for full DDL.

**Tables:** `site_config`, `memories`, `photos`, `quotes`, `love_bombs`, `reasons`, `open_when_messages`, `love_bomb_history` (session anti-repeat).

---

## 11. API Design

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Site config (names, messages, feature flags) |
| POST | `/api/auth/verify` | Optional nickname verification |
| GET | `/api/memories` | Active memories ordered by `display_order` |
| GET | `/api/memories/{id}` | Single memory |
| GET | `/api/photos` | Active photos |
| GET | `/api/quotes` | Active quotes |
| GET | `/api/love-bombs/random?sessionId=` | Random love bomb, avoids recent session repeats |
| GET | `/api/reasons` | Active reasons |
| GET | `/api/open-when` | Active open-when messages |
| GET | `/api/health` | Health check |

All responses JSON. Errors: `{ "error": "...", "timestamp": "..." }`.

---

## 12. Repository / Folder Structure

```
romantic-universe/
├── ARCHITECTURE.md          # This file
├── README.md
├── backend/
│   ├── pom.xml
│   ├── mvnw / mvnw.cmd
│   └── src/main/
│       ├── java/com/loveuniverse/...
│       └── resources/
│           ├── application.yml
│           ├── application-dev.yml
│           ├── application-prod.yml
│           └── db/
│               ├── schema.sql
│               └── data.sql
├── frontend/
│   ├── angular.json
│   ├── src/
│   │   ├── app/...
│   │   ├── assets/
│   │   │   ├── images/      # Place photos here
│   │   │   ├── audio/       # background-music.mp3
│   │   │   └── textures/    # petals, particles
│   │   └── environments/
│   └── proxy.conf.json
└── .gitignore
```

---

## 13. Performance Strategy

- **Frontend:** Lazy routes, OnPush change detection, tree-shake Three.js imports, image WebP, `will-change` sparingly.
- **Backend:** DB indexes on `active`, `display_order`; connection pooling; gzip compression.
- **3D:** Cap FPS via `requestAnimationFrame` throttle off-screen; dispose geometries on destroy.
- **Network:** HTTP caching headers on static assets; API responses cacheable 5 min for read-only data.
- **Bundle:** Analyze with `ng build --stats-json`; target initial < 500KB gzipped (excluding 3D).

---

## 14. Free Deployment Strategy

| Layer | Service | Free Tier (verify at deploy time) |
|-------|---------|-----------------------------------|
| Frontend | **Netlify** or **Cloudflare Pages** | Static hosting, custom domain |
| Backend | **Render** or **Railway** | Free/low-cost Java web service |
| Database | **Neon** or **Supabase** | PostgreSQL free tier |

**Env vars (production):**
- `DATABASE_URL`, `SPRING_PROFILES_ACTIVE=prod`
- `CORS_ALLOWED_ORIGINS=https://your-site.netlify.app`
- `ENTRY_LOCK_ENABLED`, `ENTRY_LOCK_ANSWER` (hashed)
- Frontend: `API_URL` at build time via `environment.prod.ts`

**Build:**
```bash
# Backend
cd backend && ./mvnw -DskipTests package

# Frontend
cd frontend && npm run build -- --configuration=production
```

---

## 15. Assets / Information Needed From You

| Item | Purpose | Where to put |
|------|---------|--------------|
| Her name | Hero, finale | `site_config` table / seed data |
| Your name | Footer, signatures | `site_config` |
| Hero photo | Main portrait | `assets/images/hero.jpg` + DB row |
| 6–12 gallery photos | Gallery + 3D orbs | `assets/images/gallery/` |
| 4–8 memory photos | Timeline | `assets/images/memories/` |
| Memory dates, titles, messages | Timeline content | `data.sql` or admin later |
| Love bomb messages | Fun section | `love_bombs` table |
| Reasons (short + long) | Adore section | `reasons` table |
| Quotes | Constellation | `quotes` table |
| Open-when messages | Envelope section | `open_when_messages` table |
| Final personal message | Finale | `site_config.final_message` |
| Nickname (optional lock) | Entry gate | env var `ENTRY_LOCK_ANSWER` |
| Background music | Music player | `assets/audio/background.mp3` |
| Important date (optional) | Hero subtitle | `site_config` |

---

## ASCII Wireframes

### Opening (Chapter 0)
```
┌─────────────────────────────────────┐
│  ✦  ·    ✦      ·   ✦    ·    ✦    │  ← star particles
│         ·    ✦        ·             │
│                                     │
│         Hey beautiful... ❤️         │  ← typewriter
│                                     │
│    I made a little universe         │
│           for you.                    │
│                                     │
│    ┌─────────────────────────┐     │
│    │ Enter Our Little World ✨│     │  ← glowing CTA
│    └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

### Main scroll layout (Chapters 1–10)
```
┌─────────────────────────────────────┐
│ ░░░ 3D UNIVERSE (full viewport) ░░░ │  Ch.1
├─────────────────────────────────────┤
│  ┌──────────┐                       │
│  │  HERO    │  "Some people make..."│  Ch.2
│  │  PHOTO   │                       │
│  └──────────┘                       │
├─────────────────────────────────────┤
│  ──●── Memory card                  │  Ch.3
│      └── photo + date               │
│  ──●── Memory card                  │
├─────────────────────────────────────┤
│ [smile] [kindness] [heart] ...      │  Ch.4 tilt cards
├─────────────────────────────────────┤
│     ┌──────────────────┐            │
│     │ Tap Love Bomb 💗 │            │  Ch.5
│     └──────────────────┘            │
│         ╭─────────────╮              │
│         │ message pop │              │
│         ╰─────────────╯              │
├─────────────────────────────────────┤
│  ✉ ✉ ✉ ✉ ✉ ✉  (envelopes)          │  Ch.6
├─────────────────────────────────────┤
│   ╱ ○ ╲  3D photo carousel          │  Ch.7
│  ○     ○                            │
├─────────────────────────────────────┤
│  ✦ · ✦ · ✦  quote stars  · ✦       │  Ch.8
├─────────────────────────────────────┤
│        🌷 flower surprise           │  Ch.9
│              ♥ (hidden)             │
├─────────────────────────────────────┤
│  ▓▓▓ dark finale ▓▓▓                │  Ch.10
│      ♥ particles forming heart      │
│  "Before you go..."                 │
│  [ One last surprise ✨ ]           │
└─────────────────────────────────────┘
     [ ♪ ]  ← floating music control
```

### Memory modal
```
┌─────────────────────────────────────┐
│  ✕                                  │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │        FULL PHOTO           │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│  March 14, 2024 · Paris             │
│  "Our first adventure"              │
│  Longer personal message here...    │
└─────────────────────────────────────┘
```
