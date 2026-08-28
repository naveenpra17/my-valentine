# Romantic Universe

A **cinematic interactive love experience** — explore a living universe, discover memories, build a personalized 3D heart, watch the universe remember it, experience a particle finale, and share her exact creation.

**Stack:** Angular 19 + Three.js frontend, Spring Boot REST API, PostgreSQL/H2.

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for system design and **[HARDENING-REPORT.md](./HARDENING-REPORT.md)** for the production hardening pass.

## Prerequisites

- **Java 21+**
- **Node.js 20+** and npm
- **Maven** (or use included `mvnw` / `mvnw.cmd` in `backend/`)

## Quick Start (Local)

### 1. Backend

```bash
cd backend
# Windows
set JAVA_HOME=C:\Program Files\Java\jdk-21.0.11
mvnw.cmd spring-boot:run

# macOS/Linux
./mvnw spring-boot:run
```

API runs at `http://localhost:8080`

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

App runs at `http://localhost:4200` (proxies `/api` → backend). Use `--port 4201` if 4200 is taken.

## Before going live

See **[PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md)** for photos, messages, music, and deployment steps.

See `frontend/ASSETS.md` for media paths and `frontend/SESSION-STATE.md` for persistence.

### 3. Verify

- `http://localhost:8080/api/health` → `{"status":"UP"}`
- `http://localhost:8080/api/config` → site configuration JSON
- Open `http://localhost:4200` → should show greeting with `HER_NAME` from config

---

## Personalization Guide

All personal content is centralized — **do not scatter names/photos in source code**.

| What to change | Where |
|----------------|-------|
| Names, hero text, finale message | `backend/src/main/resources/db/data.sql` → `site_config` table |
| Memories | `data.sql` → `memories` table + images in `frontend/src/assets/images/memories/` |
| Gallery photos | `data.sql` → `photos` table + images in `frontend/src/assets/images/gallery/` |
| Photo → memory links | `data.sql` → `photos.memory_id` FK to `memories.id` |
| Hero photo | `frontend/src/assets/images/hero/hero.jpg` + reference in config |
| Love bombs | `data.sql` → `love_bombs` table |
| Reasons | `data.sql` → `reasons` table |
| Quotes | `data.sql` → `quotes` table |
| Open-when messages | `data.sql` → `open_when_messages` table |
| Background music | `frontend/src/assets/audio/background.mp3` + `MUSIC_URL` in `site_config` |
| Entry lock question | `site_config` → `ENTRY_LOCK_QUESTION` |
| Entry lock answer | Environment variable `ENTRY_LOCK_ANSWER` (backend) |

After editing `data.sql`, restart the backend (H2 in-memory resets on restart in dev).

---

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_PROFILES_ACTIVE` | `dev` | `dev` (H2) or `prod` (PostgreSQL) |
| `PORT` | `8080` | Server port |
| `DATABASE_URL` | — | PostgreSQL JDBC URL (prod) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | Comma-separated allowed origins |
| `ENTRY_LOCK_ENABLED` | `false` | Enable nickname gate |
| `ENTRY_LOCK_ANSWER` | — | Expected answer (case-insensitive) |

### Frontend

| File | Description |
|------|-------------|
| `frontend/src/assets/config.json` | Production API URL (loaded at runtime) |
| `frontend/src/assets/config.example.json` | Example config template |
| `environment.prod.ts` | Fallback API URL if config.json fails |

---

## Database

**Development:** H2 in-memory with auto schema + seed from `schema.sql` and `data.sql`.

**Production:** PostgreSQL. Run `schema.sql` once, then `data.sql` (or migrate data). Set `SPRING_PROFILES_ACTIVE=prod` and `DATABASE_URL`.

H2 console (dev only): `http://localhost:8080/h2-console`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/config` | Site configuration |
| POST | `/api/auth/verify` | Entry lock verification |
| GET | `/api/memories` | All active memories |
| GET | `/api/memories/{id}` | Single memory |
| GET | `/api/photos` | All active photos |
| GET | `/api/quotes` | All active quotes |
| GET | `/api/love-bombs/random?sessionId=` | Random love bomb |
| GET | `/api/reasons` | All active reasons |
| GET | `/api/open-when` | All open-when messages |

---

## Production Build

```bash
# Backend
cd backend && mvnw.cmd -DskipTests package
java -jar target/romantic-universe-api-1.0.0.jar

# Frontend
cd frontend && npm run build
# Output: frontend/dist/frontend/browser/
```

---

## Free Deployment

| Layer | Recommended | Notes |
|-------|-------------|-------|
| Frontend | **Netlify** or **Cloudflare Pages** | Deploy `dist/frontend/browser` |
| Backend | **Render** or **Railway** | Java web service, set env vars |
| Database | **Neon** or **Supabase** | PostgreSQL free tier |

### Steps

1. Create PostgreSQL database; run `schema.sql` + `data.sql`
2. Deploy backend with `SPRING_PROFILES_ACTIVE=prod`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`
3. Build frontend with production `apiUrl` pointing to backend
4. Deploy static files to Netlify/Pages
5. Configure custom domain in hosting dashboards

---

## Project Structure

```
romantic-universe/
├── ARCHITECTURE.md      # Full design document
├── README.md
├── backend/             # Spring Boot API
└── frontend/            # Angular app
```

---

## Implementation Phases

| Phase | Status | Contents |
|-------|--------|----------|
| **Director's Cut Phase 1** | ✅ Complete | Universe-first layout, hidden HUD, photo→memory flow, chapter map sync |
| **Phase 2 — Our Little Heart** | ✅ Complete | 3D heart creation, fly-to-attach, rotation/zoom, serialization |
| **Phase 3 — Universe Remembers** | ✅ Complete | Journey replay, exact heart reconstruction, no dashboard |
| **Phase 4 — Finale** | ✅ Complete | Exact heart dissolve, particle universe, giant heart, secret ending |
| **Phase 5 — Production & Share** | ✅ Complete | Personalized heart capture, share preview, quality service, production checklist |
| **Production Hardening** | ✅ Complete | Texture ownership, state SSOT, finale particles, cancellable animations, tests |

See **[PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md)** before going live.

See **[PHASE1-REPORT.md](./PHASE1-REPORT.md)** through **[PHASE5-REPORT.md](./PHASE5-REPORT.md)** for implementation details.

---

## Performance Notes

- Adaptive quality via `QualityService` (low / medium / high particle budgets)
- Reference-counted texture cache — no shared texture disposal bugs
- Three.js scenes pause when off-screen or tab is hidden
- Share capture uses a temporary renderer — disposed immediately after snapshot
- Heart thumbnails downscaled before GPU upload (256–512px class)
- Gzip compression enabled on the backend

---

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for full step-by-step instructions (Netlify + Render + PostgreSQL).

Quick checklist:
1. Run `schema.sql` + `data.sql` on PostgreSQL
2. Deploy backend → set `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`
3. Edit `frontend/src/assets/config.json` with your API URL
4. Deploy frontend to Netlify

---

## Troubleshooting

**Backend won't start — JAVA_HOME**
Set `JAVA_HOME` to your JDK path (e.g. `C:\Program Files\Java\jdk-21.0.11`).

**Frontend can't reach API**
Ensure backend is running. Dev proxy is configured in `proxy.conf.json`.

**CORS errors in production**
Set `CORS_ALLOWED_ORIGINS` to your frontend URL.

**Images not showing**
Place files in `frontend/src/assets/images/` matching paths in `data.sql`.

---

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete design document.
