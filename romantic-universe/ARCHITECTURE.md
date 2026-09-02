# Romantic Universe — Multi-Site Architecture

## Overview

One Angular + Three.js frontend and one Spring Boot API power **many** personalized romantic experiences. Each experience is a **site** identified by URL slug (`/kavi`, `/anu`, …).

## URL routing

| URL | Behavior |
|-----|----------|
| `/` | Site selector (auto-redirects if only one active site) |
| `/:siteSlug` | Full cinematic experience for that site |
| `/not-found` | Polished missing-universe page |

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/sites` | List active sites (slug + name) |
| `GET /api/sites/{slug}` | Full public site bundle |
| `POST /api/sites/{slug}/unlock` | Entry-lock validation (`{ unlocked: boolean }`) |
| `GET /api/sites/{slug}/love-bombs/random` | Site-scoped love bomb |

Legacy endpoints (`/api/config`, `/api/photos`, …) remain for backward compatibility and resolve to the **default site** (`kavi`).

### Secrets

`ENTRY_LOCK_ANSWER` is stored in `site_config` but **never** returned by public APIs. Only `POST /api/sites/{slug}/unlock` validates answers server-side.

## Database

```
sites (id, slug, name, active, …)
  ├── site_config (site_id, config_key, config_value) UNIQUE(site_id, config_key)
  ├── memories (site_id, …)
  ├── photos (site_id, …)
  ├── quotes (site_id, …)
  ├── reasons (site_id, …)
  ├── love_bombs (site_id, …)
  ├── open_when_messages (site_id, …)
  └── love_bomb_history (site_id, session_id, …)
```

Migrations: Flyway in `backend/src/main/resources/db/migration/`.

### Existing Kavi data

`V2__migrate_legacy_to_kavi.sql` assigns all pre-migration rows to the `kavi` site without deleting content.

## Frontend services

| Service | Role |
|---------|------|
| `SiteContextService` | Current slug + name |
| `SiteDataService` | Loads/caches `GET /api/sites/{slug}` |
| `SiteStorageService` | Namespaces `localStorage` / `sessionStorage` keys (`site:kavi:…`) |
| `ConfigService` | Thin wrapper over `SiteDataService` for templates |

Three.js scenes remain **site-agnostic** — they consume generic photo/memory/reason data from the loaded bundle.

## Assets

Preferred layout for new sites:

```
frontend/src/assets/sites/{slug}/
  hero/hero.jpg
  gallery/photo-1.jpg
  memories/memory-1.jpg
  audio/background.mp3
```

Existing Kavi URLs (`/assets/images/...`) are preserved in migrated data.

## Creating a new site

1. Copy `backend/src/main/resources/db/seed-site.sql` and replace placeholders.
2. Run the SQL against Neon (or add a Flyway seed migration).
3. Add assets under `frontend/src/assets/sites/{slug}/`.
4. Deploy frontend + backend.
5. Open `https://your-domain/{slug}`.

## Rollback (Neon)

Before running migrations, back up the database. To roll back Flyway migrations, use `flyway undo` only if undo scripts exist; otherwise restore from Neon backup.
