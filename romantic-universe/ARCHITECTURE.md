# Romantic Universe — Multi-Site Architecture

## Overview

One Angular + Three.js frontend and one Spring Boot API power **many** personalized romantic experiences. Each experience is a **site** identified by URL slug.

## URL routing

| URL | Behavior |
|-----|----------|
| `/` | Site selector (auto-redirects if only one active site) |
| `/site/:slug` | Full cinematic experience for that site |
| `/:legacySlug` | Redirects to `/site/:legacySlug` |
| `/not-found` | Missing-universe page |

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/sites` | List active sites (slug + name) |
| `GET /api/sites/{slug}` | Full public site bundle |
| `POST /api/sites/{slug}/unlock` | Entry-lock validation |
| `GET /api/sites/{slug}/love-bombs/random` | Site-scoped love bomb |

Legacy endpoints (`/api/config`, `/api/photos`, …) resolve to the **default site** (`kavi`).

### Secrets

`ENTRY_LOCK_ANSWER` is stored in `site_config` but **never** returned by public APIs.

## Database

```
sites (id, slug, name, active, …)
  ├── site_config (site_id, config_key, config_value) UNIQUE(site_id, config_key)
  ├── memories, photos, quotes, reasons, love_bombs, open_when_messages
  └── love_bomb_history (site_id, session_id, …)
```

Migrations: Flyway `backend/src/main/resources/db/migration/` (`V1`–`V5`).

## Frontend services

| Service | Role |
|---------|------|
| `SiteContextService` | Current slug + name |
| `SiteDataService` | Loads `GET /api/sites/{slug}` bundle |
| `SiteStorageService` | Namespaced storage (`romantic-universe:{slug}:…`) |
| `SiteMetadataService` | Dynamic title / OG tags |
| `ConfigService` | Template helper over site bundle |

Three.js scenes are **site-agnostic** — they consume generic data from the loaded bundle.

## Assets

```
frontend/src/assets/sites/{slug}/
  hero/hero.jpg
  gallery/photo-1.jpg
  memories/memory-1.jpg
  audio/background.mp3
```

Neon stores paths like `/assets/sites/kavi/hero/hero.jpg`. Vercel serves them at deploy time.

Legacy Kavi paths (`/assets/images/...`) still work if files exist and DB points there.

## Creating a new site

1. `.\scripts\new-site-assets.ps1 -Slug {slug}`
2. Add images under `frontend/src/assets/sites/{slug}/`
3. Run SQL from `backend/src/main/resources/db/seed-site.sql`
4. Redeploy Vercel (for new assets)
5. Open `https://your-domain/site/{slug}`

## Deploy

See [MULTI-SITE-DEPLOY.md](./MULTI-SITE-DEPLOY.md).
