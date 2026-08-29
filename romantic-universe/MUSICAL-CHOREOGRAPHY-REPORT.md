# Musical Choreography — Romantic Universe

## 1. Audio Architecture

```text
Visual Events (components / scenes)
        ↓
MusicalChoreographyService  ← single coordinator
        ↓
Musical State Machine (silence → universe → … → ending)
        ↓
Layer Gain Nodes (crossfaded, never hard-cut)
        ├── universe pad (55/110 Hz)
        ├── harmony (E3/G3)
        ├── pulse (subtle ~0.85 Hz LFO)
        ├── memory (warm A3/C#4)
        ├── emotional (E4/G4)
        ├── finale (C4/E4/G4)
        └── secret (F3)
        ↓
Master Gain → destination
        +
Motif one-shots (photo, memory, heart, etc.)
```

`SoundDesignService` delegates one-shots to `MusicalChoreographyService.playMotif()`.

The legacy `AudioService` HTML loop player is **no longer used** for background music. The chrome control is a minimal **Sound on/off** toggle.

---

## 2. Musical States

| State | Character |
|-------|-----------|
| `silence` | Near-zero; opening void, pre-convergence, secret prelude |
| `universe` | Spacious low pad + faint harmony |
| `discovery` | Slight harmonic lift, subtle pulse |
| `memory` | Memory layer forward, universe recedes |
| `heart` | Warmer harmony, gentle pulse, emotional bed |
| `remembers` | Richest mid-journey blend; motifs recall discoveries |
| `transformation` | Finale layer begins; dissolution / spread |
| `giant_heart` | Full harmonic resolution; emotional peak |
| `letter` | Intimate, reduced finale; reading space |
| `secret` | Minimal mysterious tone |
| `ending` | Fade to silence |

Transitions use **crossfade** (1–5s depending on state). Music never restarts on scene change.

---

## 3. Motifs

| Motif | Introduced | Recalled |
|-------|------------|----------|
| `photo` (523 Hz) | Photo discovery | Heart attach (photo), Universe Remembers |
| `memory` (440 Hz) | Memory reveal | Heart attach (memory), Remembers reconstruction |
| `reason` (494 Hz) | Reason discovery | Heart attach (reason), Remembers |
| `flower` (659 Hz) | Flower bloom | Heart attach (flower), Remembers |
| `love-bomb` (660 Hz) | Love bomb catch | Heart attach (love-bomb) |
| `secret` (277 Hz) | Secret easter egg / ending | Heart attach (secret) |
| `heart` (392 Hz) | Object attachment | Remembers per-object, tiny heart ending |
| `envelope` (330 Hz) | Open When envelope | — |
| `finale` (523 Hz) | Giant heart phase | — |
| `star` (880 Hz) | First interaction / ambient | — |

Motifs are **short** (0.1–0.45s), low volume, and sparse.

---

## 4. Audio Assets

### Currently used
**None (procedural Web Audio only).** No binary files required for the system to work.

### Optional future stems (not bundled)
Place under `frontend/src/assets/audio/`:

| File | Purpose |
|------|---------|
| `stems/universe-pad.mp3` | Replace procedural universe layer |
| `stems/harmony.mp3` | Warm harmonic stem |
| `stems/finale.mp3` | Giant heart climax stem |
| `background.mp3` | Legacy loop (deprecated for choreography) |

Configuration constants: `musical-choreography.config.ts` → `AUDIO_ASSET_PATHS`.

---

## 5. Synchronization

| Moment | Hook |
|--------|------|
| Opening void | `enterOpening()` |
| First tap / enter | `onFirstInteraction()` |
| Universe | `enterUniverse()` |
| Photo + memory | `ExperienceFlowService` → `onPhoto()`, `onMemory()`, `onMemoryExit()` |
| Reasons | `onReason()` |
| Love bomb | `onLoveBomb()` |
| Flower | `onFlower()` |
| Envelope | `onEnvelope()` |
| Secret easter egg | `onSecretDiscovery()` |
| Heart section | `enterHeart()`, `onHeartAttach(type)`, `onHeartComplete()` |
| Universe Remembers | `enterRemembers()`, `onHeartObjectRemembered(type)`, `onReconstructionComplete()` |
| Finale phases | `onFinalePhase(phase)` from `FinaleTransformationScene` |
| Particle convergence | `onConvergenceProgress(0–1)` per animation frame |
| Giant heart | `giantHeartReveal()` |
| Final text | `onHerName()`, `onFinalMessage()` |
| Letter | `beginLetter()` |
| Secret ending | `beginSecret()`, `onSecretReveal()`, `onTinyHeart()` |
| Share close | `endExperience()` |

---

## 6. Mobile

- AudioContext resumes on first user gesture (`enable()` / sound toggle / any `sounds.enable()`).
- `prefers-reduced-motion`: layer targets scaled to **55%**, shorter cues.
- Tab hidden: master gain → 0 (resume on return, state preserved).
- No autoplay banner; subtle “Sound” chrome control only.

---

## 7. Performance

- **Preload:** layers start lazily on first `enable()`; finale layer warmed in `enterHeart()`.
- **No file decode** at startup (procedural).
- **One AudioContext** shared across layers and motifs.
- Motif oscillators self-stop; no orphan nodes.

---

## 8. Lifecycle

- `MusicalChoreographyService.ngOnDestroy()` stops oscillators, closes context.
- `reset()` clears timers and returns to silence (replay via page reload).
- Mute: `master.gain = 0`; unmute restores current state without restart.

---

## 9. Test Results

| Test | Status |
|------|--------|
| Desktop build (`npm run build`) | Pending re-run after type fix |
| Full browser playthrough | ❌ Not verified |
| Mobile Safari gesture unlock | ❌ Not verified |
| Mute / unmute during finale | ❌ Not verified |
| Tab hide / show | ❌ Not verified |
| Replay without duplicate layers | ❌ Not verified |
| Reduced motion journey | ❌ Not verified |
| Missing MP3 assets | ✅ N/A (procedural fallback) |

---

## 10. Not Verified

- End-to-end emotional pacing as a “film” listen-through
- iOS Safari AudioContext resume edge cases
- Concurrent motif overlap during fast discovery
- Volume balance on phone speakers vs desktop headphones
- Letter + finale music overlap when scrolling quickly
