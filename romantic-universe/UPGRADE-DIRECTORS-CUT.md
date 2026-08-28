# Romantic Universe — Director's Cut

> Final immersive storytelling pass. One cohesive cinematic story, not a feature website.

## Emotional Arc

CURIOUS → WONDER → DISCOVERY → SMILE → NOSTALGIA → PLAYFUL → INTIMATE → CREATIVE → EMOTIONAL → WOW

## New Architecture

| Layer | Purpose |
|-------|---------|
| `ExperienceControllerService` | Chapter unlocking, emotional beats, story lifecycle |
| `ExperienceStateService` | Session discoveries, constellation, heart objects |
| `CameraDirectorService` | Reusable Three.js camera choreography |
| `ChapterGateComponent` | Progressive chapter reveal (no full-page dump) |
| `ChapterVisitDirective` | Marks chapters visited on scroll |
| `ConstellationCeremonyComponent` | Ch.7 — stars become a heart |

## Director's Cut Chapters (0–12)

| Ch | Feel | Scene |
|----|------|-------|
| 0 | Curious | Opening — light point, "Come see." |
| 1 | Wonder | Three.js universe + camera entry |
| 2 | Discovery | Find Her — narrative hero |
| 3 | Discovery | Photo discovery |
| 4 | Nostalgia | Memories |
| 5 | Smile | Reasons + quotes |
| 6 | Playful | Love bomb interrupt |
| 7 | Emotional | Constellation ceremony |
| 8 | Creative | Our Little Heart |
| 9 | Intimate | Open when |
| 10 | Emotional | Universe remembers |
| 11 | Emotional | Letter (silence) |
| 12 | WOW | Finale + final secret light |

## UI Rules Applied

- Act markers hidden globally (`_directors-cut.scss`)
- Chapter progress dots only after Ch.2 visited
- Chapters unlock progressively (not all visible at once)
- No game HUD — constellation tracker is subtle stars only

## Camera API (`LoveUniverseScene`)

- `approach(target)` — move camera toward object
- `pullBack()` — return to drift
- `focusPhotoById(id)` — photo discovery moment
- `returnToUniverse()` — exit focus

## Finale Secret

After "One last surprise" → fade → "One last thing..." → tiny light → universe reaction → complete.

## Config Keys

`OPENING_VOID_*`, `HERO_PAUSE_*`, `CONSTELLATION_CEREMONY_*`, plus all 3.0 keys in `data.sql`.
