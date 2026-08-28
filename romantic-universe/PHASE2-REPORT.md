# Phase 2 Implementation Report — Our Little Heart

## IMPLEMENTED

### Core architecture
| File | Purpose |
|------|---------|
| `core/experience/heart-asset.types.ts` | `HeartAsset`, `SerializedHeartState`, `SerializedHeartAsset` |
| `core/experience/heart-asset.mapper.ts` | `toHeartAsset()`, pool priority sorting |
| `core/experience/heart-composition.util.ts` | Deterministic surface + pool orbit placement |
| `core/experience/heart-state.service.ts` | `captureHeartState()`, `restoreHeartState()`, `prepareAttach()` |
| `features/our-little-heart/heart-object-meshes.ts` | Type-specific 3D meshes (photo, memory, quote, etc.) |
| `features/our-little-heart/our-little-heart-scene.ts` | Full Three.js heart creation environment |
| `features/our-little-heart/our-little-heart.component.*` | Intro cinematic, guidance, a11y fallback |

### 3D heart environment
- Lathe-geometry premium heart with `MeshPhysicalMaterial` (burgundy, clearcoat, subtle emissive)
- Starfield + ambient particles + fog + multi-light setup
- Breathing pulse, idle float, ripple on attach
- Intro zoom: small heart grows into creation mode

### Fly-to-heart interaction
1. Pool object hover brightens (desktop)
2. Tap/click selects object
3. Object lifts with particle trail (~1100ms)
4. Heart pulses + ripple wave
5. Object lands at deterministic surface position
6. State updated in `ExperienceStateService`

### Object types (distinct visuals)
- **Photo** — framed 3D photograph with texture
- **Memory** — glowing card with image or label
- **Quote** — canvas typography fragment
- **Reason** — short word typography
- **Flower** — petal cluster + spread burst on attach
- **Love bomb** — glowing sphere + brief flash burst
- **Secret** — mysterious halo point

### Interaction
- Drag to rotate heart (inertia on desktop)
- Wheel zoom + pinch zoom (mobile)
- Tap attached object → detail overlay with "Release"
- Remove → flies back to pool orbit
- Contextual guidance (no permanent toolbar)

### State integration
- Uses existing `heartPool` / `selectedHeartObjects` — no duplicate state
- `attachHeartObject()` applies deterministic placement via `applyPlacement()`
- Secrets now add to heart pool on `discoverSecret()`
- Session restore via existing `ru_experience_v3` sessionStorage

### Accessibility
- Screen-reader-only list for add/view/remove without 3D
- Reduced motion: fade/scale attach (350ms), no fly trail, no ripples
- Keyboard-focusable buttons in a11y layer

### Camera integration
- `CameraDirectorService.focusHeart()` called on chapter entry

---

## HEART STATE

**Source of truth:** `ExperienceStateService.selectedHeartObjects`

Each object stores:
```typescript
{
  type, referenceId, label, imageUrl, thumbnailUrl,
  position: { x, y, z },
  rotation: { x, y, z },
  scale: number
}
```

**Serialization:**
```typescript
HeartStateService.captureHeartState() → {
  heartId: 'our-little-heart',
  assets: SerializedHeartAsset[]
}
```

Placement is seeded from `heartAssetKey(type, sourceId)` — same composition after refresh.

---

## INTERACTION

**Fly-to-heart:** `OurLittleHeartScene.flyAttach()` animates from pool orbit → heart surface in ~700–1100ms with easing, particle trail, heart pulse, type-specific burst (flower/love-bomb).

**Composition:** `computeHeartPlacement()` uses golden-angle distribution on heart surface with per-type radius/scale.

**Pool orbit:** `computePoolOrbit()` places available discoveries floating around the heart in 3D (not HTML chips).

---

## PERFORMANCE

| Strategy | Detail |
|----------|--------|
| Mobile quality | DPR capped at 1.5, fewer particles (80 vs 140), smaller photo meshes |
| Desktop quality | DPR capped at 2, full particle count |
| Textures | Cached `TextureLoader`, reused across objects |
| Disposal | `disposeGroup()`, `disposeAllTextures()` on scene destroy |
| Render loop | Single RAF, pauses when off-screen via `setVisible(false)` |

---

## ACCESSIBILITY

- Hidden `.little-heart__a11y` list: add/view objects without WebGL
- Reduced motion: instant placement option, no camera intro zoom
- `aria-live` guidance text
- Detail dialog with keyboard-focusable Back/Release

---

## TEST RESULTS

- `npm run build` — **PASS**
- Manual testing recommended:
  - [ ] Intro sequence → "Let's make one"
  - [ ] Tap pool object → flies to heart
  - [ ] Rotate / zoom / pinch
  - [ ] Tap attached → Release → returns to pool
  - [ ] Refresh → same composition
  - [ ] Reduced motion mode
  - [ ] Screen reader add button

---

## REMAINING PHASES (not implemented)

| Phase | Feature |
|-------|---------|
| **Phase 3** | Universe Remembers — exact 3D heart recreation |
| **Phase 4** | Finale dissolve/convergence/secret ending |
| **Phase 5** | Personalized heart share image |
| — | Open When full scene transitions |
| — | Multi-mode Love Bomb |
| — | Stars-form-heart universe entry transition (partial: local intro zoom only) |
| — | Exit transition: heart becomes glowing universe object |

---

## REGRESSION

Phase 1 flows preserved. Backend unchanged. Build passes with budget warning (+44KB lazy chunk).
