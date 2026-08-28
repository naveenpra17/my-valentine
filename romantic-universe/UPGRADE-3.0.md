# Romantic Universe 3.0 — Immersive Love Experience

> Transform from cinematic feature website → interactive world she helps create.
> Architecture preserved: Angular + Spring Boot + SQL + Three.js.

## Creative Reference

Inspired by the *experience design principles* of [Noomo Valentime](https://valentime.noomoagency.com/) — narrative pacing, progressive revelation, participation, atmosphere. **No copied code, assets, text, or layouts.**

---

## Phase Status

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Audit existing application | ✅ Complete |
| 2 | Editorial visual design system | ✅ Complete |
| 3 | Experience/chapter state manager | ✅ Complete |
| 4 | Camera + scene transition upgrade | ✅ Complete |
| 5 | Photo discovery system | ✅ Complete |
| 6 | Memory collection mechanic | ✅ Complete |
| 7 | Reasons + quotes as discoveries | ✅ Complete |
| 8 | Love bomb playground | ✅ Complete |
| 9 | Interactive 3D "Our Little Heart" | ✅ Complete |
| 10 | Connect discoveries → heart | ✅ Complete |
| 11 | Open-when cinematic upgrade | ✅ Complete |
| 12 | "Universe Remembers" scene | ✅ Complete |
| 13 | Personal letter upgrade | ✅ Complete |
| 14 | Customized-heart finale | ✅ Complete |
| 15 | Shareable creation | ✅ Complete |
| 16 | Mobile optimization | ✅ Preserved (2.0 + 3.0) |
| 17 | Performance & accessibility | ✅ Preserved (2.0 + 3.0) |
| 18 | Production deployment | ✅ Configs ready — verify on deploy |

---

## Chapter Journey

| Ch | Title | Component |
|----|-------|-----------|
| 0 | The Invitation | `opening` |
| 1 | Enter the Universe | `love-universe` (camera entry + photo orbs) |
| 2 | Discover Her World | `hero` + `photo-gallery` |
| 3 | Collect the Memories | `memory-timeline` |
| 4 | What I Love | `reasons` + `quote-constellation` |
| 5 | Play | `love-bomb` |
| 6 | Create Something | `our-little-heart` |
| 7 | Quiet Moments | `open-when` |
| 8 | Universe Remembers | `universe-remembers` + `flower-surprise` |
| 9 | The Letter | `letter` |
| 10 | Final Creation | `finale` |

---

## New in 3.0

### Session State (`ExperienceStateService`)
Tracks photos, memories, reasons, quotes, love bombs, secrets → builds constellation stars + heart objects.

### New Components
- `our-little-heart` — Three.js customizable heart from discoveries
- `universe-remembers` — Session recap + constellation canvas
- `memory-constellation-tracker` — Subtle discovery progress dots
- `chapter-progress` — Chapter star indicators (no navbar)

### New Services
- `SoundDesignService` — Optional subtle SFX (user-gesture enabled)
- `HeartShareService` — Generate/share heart image (Web Share API + download)

### Visual System
- `_editorial.scss` — Large editorial typography, intimate text, silence scenes

### Camera & Discovery
- Universe entry animation (camera travels through light)
- Photo orb tap → discovery + constellation star
- Gallery shows discovered photo indicators

### Config Keys (data.sql)
`CHAPTER_2_LINE_1/2`, `REASONS_INTRO_1/2`, `LOVE_BOMB_INTRO_1/2/3`, `HEART_TITLE/SUBTITLE`, `REMEMBERS_INTRO/REVEAL`, `FINALE_PERSONAL_LINE`

---

## Quality Test Checklist

- [ ] Opening feels mysterious, not like a website
- [ ] Universe reacts to photo taps
- [ ] Discoveries accumulate visibly (constellation tracker)
- [ ] Heart fills with her discoveries
- [ ] Universe Remembers recaps the session
- [ ] Finale references her name + personal line
- [ ] Share heart works on mobile (Web Share) or downloads PNG
- [ ] Reduced motion respected throughout
- [ ] All copy editable via `data.sql` / `site_config`

---

## Deploy

See `DEPLOYMENT.md`. Run Phase 18 verification after pushing to Netlify + Render.
