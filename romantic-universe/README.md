# Romantic Universe

An immersive, interactive 3D romantic website — Angular frontend, Spring Boot REST API, SQL database.

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

App runs at `http://localhost:4200` (proxies `/api` → backend)

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
| 1 | ✅ Complete | Backend API, DB schema, seed data, Angular foundation |
| 2 | ✅ Complete | Cinematic opening, entry lock, 3D universe, hero, music player |
| 3 | ✅ Complete | Memories timeline, reasons cards, love bombs |
| 4 | ✅ Complete | Gallery, quote constellation, open-when envelopes |
| 5 | ✅ Complete | Flower surprise, secret heart, cinematic finale |
| 6 | ✅ Complete | Polish, performance, deployment configs |

---

## Performance Notes

- Sections below the hero use `@defer` — they load only when scrolled into view
- Three.js scene pauses when off-screen or tab is hidden
- Read-only API responses are cached for 5 minutes
- Gzip compression enabled on the backend
- Edit `frontend/src/assets/config.json` for production API URL (no rebuild needed for URL-only changes if you redeploy just that file)

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
