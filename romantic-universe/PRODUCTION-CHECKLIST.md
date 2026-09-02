# Production Personalization Checklist (Multi-Site)

Replace placeholders **in Neon** and **in asset folders** — no Angular code changes needed.

## Per-site URLs

| Site | URL |
|------|-----|
| Kavi | `https://your-app.vercel.app/site/kavi` |
| New person | `https://your-app.vercel.app/site/{slug}` |

---

## 1. Neon — `site_config` (per site)

| Key | Purpose |
|-----|---------|
| `HER_NAME` | Her name throughout experience |
| `MY_NAME` | Your name (letter & signature) |
| `HERO_*`, `OPENING_*`, `FINAL_*` | Copy & cinematic lines |
| `HERO_IMAGE_URL` | `/assets/sites/{slug}/hero/hero.jpg` |
| `MUSIC_URL` | `/assets/sites/{slug}/audio/background.mp3` |
| `ENTRY_LOCK_ENABLED` | `true` / `false` |
| `ENTRY_LOCK_QUESTION` | Shown on entry lock screen |
| `ENTRY_LOCK_ANSWER` | **Secret** — server only, never in API bundle |

Use `backend/src/main/resources/db/seed-site.sql` to create a new site.

---

## 2. Neon — content tables (per `site_id`)

| Table | Notes |
|-------|-------|
| `memories` | Timeline + linked photos |
| `photos` | Gallery + 3D universe; `memory_id` links photo → memory |
| `quotes` | Constellation stars |
| `reasons` | Floating whispers |
| `love_bombs` | Catch game messages |
| `open_when_messages` | Envelope letters |

All `image_url` values must match files you deploy to Vercel **or** external CDN URLs.

---

## 3. Media files — `frontend/src/assets/sites/{slug}/`

### Standard layout (recommended)

```
sites/kavi/
  hero/hero.jpg
  gallery/photo-1.jpg … photo-6.jpg
  memories/memory-1.jpg … memory-4.jpg
  audio/background.mp3
```

### Legacy layout (migrated old DB)

If Neon still has `/assets/images/...` paths:

```
images/hero/hero.jpg
images/gallery/photo-1.jpg …
images/memories/memory-1.jpg …
audio/background.mp3
```

Or run `backend/src/main/resources/db/neon-update-multisite-paths.sql`.

---

## 4. Deploy environment

### Vercel

| Variable | Example |
|----------|---------|
| `API_URL` | `https://your-api.onrender.com/api` |

### Render

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Neon pooled URL |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `SPRING_PROFILES_ACTIVE` | `prod` |

---

## 5. Before sharing

- [ ] Replace placeholder images in `sites/kavi/` (or CDN URLs in Neon)
- [ ] Set real `HER_NAME`, `MY_NAME`, `FINAL_MESSAGE` in Neon
- [ ] Add `background.mp3` or leave music disabled
- [ ] Test photo click → memory card for each photo
- [ ] Test entry lock for this site only
- [ ] Test `/site/test-site` does not show Kavi content
- [ ] Mobile Safari + Chrome
- [ ] Heart builder + share preview

---

## 6. Clear visitor state (per site)

Storage keys are namespaced: `romantic-universe:kavi:...`

To reset Kavi progress in browser console:

```javascript
Object.keys(localStorage).filter(k => k.includes('kavi')).forEach(k => localStorage.removeItem(k));
Object.keys(sessionStorage).filter(k => k.includes('kavi')).forEach(k => sessionStorage.removeItem(k));
```
