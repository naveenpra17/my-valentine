# Deployment Guide — Romantic Universe

> Verify free-tier availability on each provider before deploying — offerings change frequently.

## Architecture

```
[Netlify / Cloudflare Pages]  →  Static Angular app
         ↓ API calls
[Render / Railway]            →  Spring Boot JAR
         ↓
[Neon / Supabase / Render DB] →  PostgreSQL
```

---

## 1. Database Setup — Neon (recommended)

1. Create a free project at [neon.tech](https://neon.tech)
2. **Connect** → copy the **pooled** connection string (`postgresql://...?sslmode=require`)
3. In the Neon **SQL Editor**, run in order:
   - `backend/src/main/resources/db/schema.sql`
   - `backend/src/main/resources/db/data.sql`
4. Paste the connection string into Render as `DATABASE_URL` when deploying the API

The backend accepts Neon URLs automatically (`postgres://` or `postgresql://`).

### Option B: Render PostgreSQL (legacy)

Only if you use the old `render.yaml` with a `databases:` block. Neon is preferred.

---

## 2. Backend Deployment (Render)

### Using render.yaml (Blueprint)

1. Push the repo to GitHub
2. In Render Dashboard → **New** → **Blueprint** → connect repo
3. Set environment variables:
   - `DATABASE_URL` = your Neon connection string
   - `CORS_ALLOWED_ORIGINS` = `https://your-site.netlify.app`
   - `ENTRY_LOCK_ANSWER` = your nickname (if using entry lock)
4. Deploy — Render builds the Docker image from `backend/Dockerfile`

### Manual deploy

```bash
cd backend
./mvnw -DskipTests package
java -jar target/romantic-universe-api-1.0.0.jar
```

Set env vars:

| Variable | Example |
|----------|---------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DATABASE_URL` | `postgres://user:pass@host/db` or `jdbc:postgresql://...` |
| `CORS_ALLOWED_ORIGINS` | `https://your-frontend.netlify.app` |
| `PORT` | `8080` (Render sets this automatically) |

Verify: `https://your-api.onrender.com/api/health` → `{"status":"UP"}`

---

## 3. Frontend Deployment (Netlify)

### Before building

Edit `frontend/src/assets/config.json`:

```json
{
  "apiUrl": "https://your-api.onrender.com/api"
}
```

### Deploy via Netlify UI

1. Connect GitHub repo
2. Build settings (auto-detected from `frontend/netlify.toml`):
   - **Base directory:** `frontend`
   - **Build command:** `npm ci && npm run build`
   - **Publish directory:** `frontend/dist/frontend/browser`
3. Deploy

### Deploy via CLI

```bash
cd frontend
npm ci
npm run build
npx netlify deploy --prod --dir=dist/frontend/browser
```

### Cloudflare Pages alternative

- Build command: `cd frontend && npm ci && npm run build`
- Output directory: `frontend/dist/frontend/browser`
- Add `_redirects` or Pages redirect rule: `/* /index.html 200`

---

## 4. CORS Configuration

Set backend `CORS_ALLOWED_ORIGINS` to your exact frontend URL(s), comma-separated:

```
https://your-site.netlify.app,https://www.yourdomain.com
```

No trailing slashes.

---

## 5. Custom Domain

### Frontend (Netlify)

1. Domain settings → Add custom domain
2. Update DNS per Netlify instructions

### Backend (Render)

1. Add custom domain in Render service settings
2. Update `config.json` apiUrl to match
3. Update `CORS_ALLOWED_ORIGINS`

---

## 6. Entry Lock in Production

```
ENTRY_LOCK_ENABLED=true
ENTRY_LOCK_ANSWER=her-nickname
```

Answer comparison is case-insensitive. This is light protection only — not strong security.

---

## 7. Local Production Testing

```bash
# Terminal 1 — Backend with prod profile + local Postgres
export SPRING_PROFILES_ACTIVE=prod
export DATABASE_URL=jdbc:postgresql://localhost:5432/romantic_universe
export CORS_ALLOWED_ORIGINS=http://localhost:4200
cd backend && ./mvnw spring-boot:run

# Terminal 2 — Frontend production build
cd frontend
# Set config.json apiUrl to http://localhost:8080/api
npm run build
npx serve dist/frontend/browser
```

---

## 8. Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | Match `CORS_ALLOWED_ORIGINS` exactly to frontend URL |
| API 404 on Netlify | `config.json` apiUrl must point to backend, not Netlify |
| Blank page after deploy | Check `_redirects` / SPA fallback is configured |
| Database connection failed | Verify `DATABASE_URL` format; Render uses `postgres://` |
| Hibernate validate fails | Run `schema.sql` on the database first |
| 3D scene laggy on mobile | Expected on low-end devices; animations auto-reduce with `prefers-reduced-motion` |

---

## 9. Post-Deploy Checklist

- [ ] `/api/health` returns UP
- [ ] `/api/config` returns JSON with your names/messages
- [ ] Frontend loads opening screen
- [ ] Photos display (files in `assets/images/`)
- [ ] Music plays after user taps play
- [ ] CORS works (no browser console errors)
- [ ] Entry lock works (if enabled)
