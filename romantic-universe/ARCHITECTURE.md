# Romantic Universe — Architecture

> Production architecture for the cinematic interactive love experience (Angular 19 + Three.js + Spring Boot).

---

## Experience Flow (Five Phases)

| Phase | Chapter | Component / Scene | Purpose |
|-------|---------|-------------------|---------|
| 1 — Universe Continuity | 1–7 | `discovery-scene`, universe shell | Photo → memory discovery, hidden HUD, chapter map |
| 2 — Our Little Heart | 8 | `OurLittleHeartScene` (create) | Build personalized 3D heart, fly-to-attach, persistence |
| 3 — Universe Remembers | 11 | `OurLittleHeartScene` (reconstruct) | Replay journey, exact heart reconstruction |
| 4 — Final Transformation | 12 | `FinaleTransformationScene` | Dissolve → particles → giant heart → secret ending |
| 5 — Production Polish | 12+ | `HeartCaptureRenderer`, `HeartShareService` | Personalized share image from exact heart state |

The primary journey is **universe-first** — not a scroll-through section website.

---

## State Architecture

```
ExperienceStateService  ← SINGLE SOURCE OF TRUTH (sessionStorage: ru_experience_v3)
        │
        ├── ExperienceControllerService  (orchestration only: chapters, beats, gates)
        ├── HeartStateService            (serialize / validate / placement)
        └── Feature components & scenes
```

### ExperienceStateService owns

- `experienceStarted`, `experienceCompleted`
- Discovery sets (photos, memories, reasons, quotes, secrets, flowers, love-bombs)
- `selectedHeartObjects`, `heartPool`, `constellationStars`
- `currentChapter`, `musicEnabled`

### ExperienceControllerService owns

- `visitedChapters`, `unlockedChapters`
- `emotionalBeat`, `constellationRevealed`, `finaleSecretShown`
- Delegates `experienceStarted` / `experienceCompleted` to `ExperienceStateService`

### Persistence

| Storage | Key | Contents |
|---------|-----|----------|
| `sessionStorage` | `ru_experience_v3` | Full journey state |
| `sessionStorage` | `ru_controller_v1` | Chapter gates, finale flags (no duplicate started/completed) |
| `localStorage` | `romantic_universe_entered` | Entry lock preference |

---

## Heart State

- **First attach:** `applyPlacementWithFallback()` generates deterministic surface placement.
- **After save:** persisted `position`, `rotation`, `scale` are **authoritative**.
- **Reconstruction:** `getValidatedHeartObjects()` uses saved placement only; corrupt data gets deterministic fallback.
- **Share cache key:** `heartStateCacheKey()` hashes asset IDs, types, positions, rotations, scales.

---

## Three.js Scenes

| Scene | Renderer Owner | Lifecycle |
|-------|----------------|-----------|
| `LoveUniverseScene` | Discovery universe | `init` → `start` → `stop` → `dispose` |
| `OurLittleHeartScene` | Heart create / reconstruct | Same; `disposeGroup()` releases textures |
| `FinaleTransformationScene` | Finale transformation | `cancel()` → `dispose()` stops all RAF/timeouts |
| `HeartCaptureRenderer` | Temporary offscreen capture | Created per capture, disposed immediately |

### WebGL Renderer Rules

1. One persistent renderer per live scene component.
2. Share capture creates a **temporary** renderer — disposed after snapshot.
3. No second persistent WebGL context.

---

## Texture Ownership

```
acquireTexture(url)  → refCount++
releaseTexture(url)  → refCount--; dispose when 0
```

- `disposeGroup()` releases cached textures via `releaseTextureFromMap()`.
- Canvas/text textures (quotes, reasons) are **owned** — disposed directly.
- `loadTexture(url, maxSize)` downscales images before GPU upload.
- Scenes must **never** call `texture.dispose()` on shared cache entries.

---

## Finale Particle System

Three conceptual groups, one GPU `FinaleParticleSystem`:

| Group | Source | Visual |
|-------|--------|--------|
| Personalized | Heart object positions | Per-kind color & size (photo=warm, memory=rose, etc.) |
| Ambient | Fills remaining capacity | Soft generic universe glow |
| Transformation | Convergence / burst | Reuses same buffers |

Quality tiers (`QualityService`): low / medium / high — adaptive capacity 500–3000.

---

## Animation Cancellation

`FinaleTransformationScene` uses `SceneLifecycle`:

- `begin()` increments generation token
- `cancel()` clears RAF loops, timeouts, invalidates generation
- `dispose()` calls `cancel()` then releases Three.js resources
- No RAF loop survives navigation or replay

---

## Angular Lifecycle Cleanup

Each scene component cleans up on `ngOnDestroy`:

- `IntersectionObserver`, `ResizeObserver`
- GSAP `ScrollTrigger.kill()`
- Scene `cancel()` + `dispose()`
- Audio via `SoundDesignService` (no duplicate instances)

---

## Backend

Spring Boot REST API — photos, memories, quotes, config. PostgreSQL (prod) / H2 (dev). No secrets in Angular bundle.

---

## Testing

Unit tests cover: experience state persistence, heart placement, share hash stability, particle budgets.

See `HARDENING-REPORT.md` for verification status.
