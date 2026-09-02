# Multi-Site Deployment Quick Start

Deploy **one** frontend (Vercel) + **one** backend (Render) + **one** database (Neon).  
Serve many people at `/site/{slug}`.

## 1. Neon (database)

1. Create project at [neon.tech](https://neon.tech)
2. Copy the **pooled** connection string (`postgresql://...?sslmode=require`)
3. **Do not** run `schema.sql` manually — Flyway migrations run on first backend boot (`V1`–`V5`)

Fresh DB gets:

| Slug | Content |
|------|---------|
| `kavi` | Full romantic content (config + memories + photos + …) |
| `test-site` | Isolation test site (`HER_NAME=TEST PERSON`) |

**Personalize Kavi in Neon SQL Editor:**

```sql
UPDATE site_config sc SET config_value = 'Lakshitha'
FROM sites s WHERE sc.site_id = s.id AND s.slug = 'kavi' AND sc.config_key = 'HER_NAME';

UPDATE site_config sc SET config_value = 'Naveen'
FROM sites s WHERE sc.site_id = s.id AND s.slug = 'kavi' AND sc.config_key = 'MY_NAME';
```

**Entry lock (per site):**

```sql
UPDATE site_config sc SET config_value = 'true'
FROM sites s WHERE sc.site_id = s.id AND s.slug = 'kavi' AND sc.config_key = 'ENTRY_LOCK_ENABLED';

UPDATE site_config sc SET config_value = 'her-nickname'
FROM sites s WHERE sc.site_id = s.id AND s.slug = 'kavi' AND sc.config_key = 'ENTRY_LOCK_ANSWER';
```

`ENTRY_LOCK_ANSWER` is never returned to the browser.

**Migrating old single-site Neon data?**  
Flyway `V2` assigns orphan rows to `kavi`. Then run `neon-update-multisite-paths.sql` if paths still use `/assets/images/...`.

---

## 2. Render (backend)

### Blueprint (`render.yaml`)

1. Render Dashboard → **New** → **Blueprint** → connect `my-valentine` repo
2. Set **Root Directory** to `romantic-universe` if repo root is parent folder
3. Environment variables:

| Variable | Value |
|----------|-------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DATABASE_URL` | Neon pooled connection string |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `ENTRY_LOCK_ENABLED` | `false` (use per-site DB config instead) |

4. Verify: `GET https://YOUR-API.onrender.com/api/health` → `{"status":"UP"}`
5. Verify: `GET https://YOUR-API.onrender.com/api/sites` → list of sites
6. Verify: `GET https://YOUR-API.onrender.com/api/sites/kavi` → full bundle

---

## 3. Vercel (frontend)

1. Import repo → **Root Directory:** `romantic-universe/frontend`
2. **Environment variable** (Production):

| Name | Value |
|------|-------|
| `API_URL` | `https://YOUR-API.onrender.com/api` |

Build runs `node scripts/write-config.mjs` then `ng build` — no manual `config.json` edit needed on Vercel.

3. Deploy

### URLs

| URL | Purpose |
|-----|---------|
| `/` | Site picker |
| `/site/kavi` | Kavi's universe |
| `/site/test-site` | Test isolation |
| `/kavi` | Redirects to `/site/kavi` |

---

## 4. Images per person

Images live in the **frontend** static bundle, referenced by URL in Neon.

### Kavi

Add files (see `frontend/src/assets/sites/kavi/README.md`):

```
frontend/src/assets/sites/kavi/
  hero/hero.jpg
  gallery/photo-1.jpg … photo-6.jpg
  memories/memory-1.jpg … memory-4.jpg
  audio/background.mp3
```

Neon paths (set by migration `V5`):

```
/assets/sites/kavi/hero/hero.jpg
/assets/sites/kavi/gallery/photo-1.jpg
/assets/sites/kavi/memories/memory-1.jpg
/assets/sites/kavi/audio/background.mp3
```

Browser loads: `https://your-app.vercel.app/assets/sites/kavi/hero/hero.jpg`

### New person (`anu`)

```powershell
.\scripts\new-site-assets.ps1 -Slug anu
```

1. Add photos to `frontend/src/assets/sites/anu/`
2. Run SQL from `backend/src/main/resources/db/seed-site.sql` (replace `{{SITE_SLUG}}`, names, etc.)
3. Commit + redeploy Vercel

### CDN option

Store full URLs in Neon (`https://cdn.example.com/anu/photo-1.jpg`) — no Vercel redeploy for new images.

---

## 5. Post-deploy checklist

- [ ] `/api/health` UP
- [ ] `/api/sites/kavi` returns bundle with correct `HER_NAME`
- [ ] `/site/kavi` loads opening screen
- [ ] Hero image loads (`/assets/sites/kavi/hero/hero.jpg`)
- [ ] 3D photos clickable → memory cards
- [ ] `/site/test-site` shows **TEST PERSON** only (not Kavi data)
- [ ] Entry lock per site works
- [ ] CORS: no errors in browser console
- [ ] Mobile Safari smoke test

---

## 6. Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | `CORS_ALLOWED_ORIGINS` must exactly match Vercel URL |
| API 404 on frontend | Set `API_URL` in Vercel env vars |
| Images 404 | Add files under `src/assets/sites/{slug}/` and redeploy Vercel |
| Blank `/site/kavi` | Check `/api/sites/kavi` — slug must exist and `active=true` |
| Flyway failed | Check Neon logs; restore backup if needed |
| Old image paths | Run `neon-update-multisite-paths.sql` |

See also [DEPLOYMENT.md](./DEPLOYMENT.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).
