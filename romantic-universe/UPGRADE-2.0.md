# Romantic Universe 2.0 — Cinematic Upgrade Plan

> Progressive transformation from feature website → immersive love story.
> Architecture preserved: Angular + Spring Boot + SQL.

## Status

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Visual system & typography | ✅ Complete |
| 2 | Scene / transition engine | ✅ Complete |
| 3 | Act 1 — The Void (opening) | ✅ Complete |
| 4 | 3D universe & camera storytelling | ✅ Complete |
| 5 | Cinematic photo / memory experience | ✅ Complete |
| 6 | Reasons + love bomb cinematic | ✅ Complete |
| 7 | Open-when + hidden world | ✅ Complete |
| 8 | Constellation + flower upgrade | ✅ Complete |
| 9 | The Letter (personal finale message) | ✅ Complete |
| 10 | Cinematic finale convergence | ✅ Complete |
| 11 | Mobile optimization | ✅ Complete |
| 12 | Performance & accessibility | ✅ Complete |
| 13 | Production deployment verification | Planned |

## Act Mapping

| Act | Scene | Existing Component |
|-----|-------|-------------------|
| 1 | The Void | `opening` |
| 2 | Enter the Universe | `love-universe` |
| 3 | Her | `hero` |
| 4 | Our Memories | `memory-timeline` + `photo-gallery` |
| 5 | What I Feel | `reasons` |
| 6 | Play | `love-bomb` |
| 7 | Intimacy | `open-when` |
| 8 | Hidden World | `secret-heart` + easter eggs |
| 8b | Constellation | `quote-constellation` |
| 8c | Flower | `flower-surprise` |
| 9 | The Letter | `letter` (new) |
| 10 | Finale | `finale` |

## Phase 12 — Performance & Accessibility

- `initScrollPerformance()` — ScrollTrigger tuning, GSAP lag smoothing
- `content-visibility: auto` on `.cine-scene` sections
- Skip link → `#main-content`
- `:focus-visible` styles, `prefers-contrast` support
- `FocusTrapService` — lightbox, secret-heart, hidden-star, void-whisper
- `LiveAnnouncerService` — memory open, love-bomb reveal, quote selection
- Canvas pause when off-screen or tab hidden (constellation, finale)

## New Frontend Services

- `SceneManagerService` — act tracking, scroll scene registration
- `TransitionService` — reusable cinematic transitions (GSAP)
- `ExperienceEngineService` — coordinates scene flow
- `SoundDesignService` — optional SFX (extends AudioService)
- `FocusTrapService` — dialog focus management
- `LiveAnnouncerService` — screen reader announcements
- `VisibilityService` — page visibility tracking

## New Config Keys (site_config)

See `data.sql` for opening sequence keys `OPENING_VOID_*`.
