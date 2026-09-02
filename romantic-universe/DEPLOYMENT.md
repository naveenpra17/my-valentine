# Deployment Guide — Romantic Universe (Multi-Site)

> One frontend · one backend · one Neon database · many sites at `/site/:slug`

See **[MULTI-SITE-DEPLOY.md](./MULTI-SITE-DEPLOY.md)** for the step-by-step checklist.

## Architecture

```
[Vercel]  Angular SPA  →  /site/kavi, /site/anu, …
    ↓  API_URL → /api/sites/{slug}
[Render]  Spring Boot + Flyway
    ↓
[Neon]  PostgreSQL (sites, site_config, memories, photos, …)
```

Static images/audio are served from **Vercel** (`/assets/sites/{slug}/...`), not the API.

---

## 1. Database — Neon

1. Create project at [neon.tech](https://neon.tech)
2. Copy pooled `DATABASE_URL`
3. **Do not** run `schema.sql` / `data.sql` manually — Flyway handles migrations on backend startup

Migrations: `backend/src/main/resources/db/migration/V1`–`V5`

---

## 2. Backend — Render

Use `render.yaml` blueprint or manual Docker deploy from `backend/Dockerfile`.

| Variable | Purpose |
|----------|---------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DATABASE_URL` | Neon connection string |
| `CORS_ALLOWED_ORIGINS` | Vercel URL(s), comma-separated, no trailing slash |
| `ENTRY_LOCK_ENABLED` | `false` — use per-site `site_config` instead |

Health: `GET /api/health`  
Sites: `GET /api/sites`, `GET /api/sites/{slug}`

---

## 3. Frontend — Vercel

**Root directory:** `romantic-universe/frontend`

| Vercel env var | Example |
|----------------|---------|
| `API_URL` | `https://your-api.onrender.com/api` |

Build command (from `vercel.json`): `npm run build`  
Runs `scripts/write-config.mjs` → writes `src/assets/config.json` from `API_URL`.

Local dev: copy `.env.example` or edit `config.json` to `http://localhost:8080/api`.

---

## 4. CORS

```
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.yourdomain.com
```

---

## 5. Entry lock (per site)

Set in Neon `site_config` for each site:

- `ENTRY_LOCK_ENABLED` = `true`
- `ENTRY_LOCK_QUESTION` = question text
- `ENTRY_LOCK_ANSWER` = secret (never exposed to frontend)

Unlock: `POST /api/sites/{slug}/unlock` with `{ "answer": "..." }`

---

## 6. Local production test

```bash
# Backend
export SPRING_PROFILES_ACTIVE=prod
export DATABASE_URL=postgresql://...
export CORS_ALLOWED_ORIGINS=http://localhost:4200
cd backend && ./mvnw spring-boot:run

# Frontend
cd frontend
export API_URL=http://localhost:8080/api
npm run build && npx serve dist/frontend/browser
# Open http://localhost:3000/site/kavi
```

---

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | Match `CORS_ALLOWED_ORIGINS` to frontend URL exactly |
| API 404 on Vercel | `API_URL` must point to Render backend |
| SPA 404 on refresh | `vercel.json` rewrites to `index.html` (already configured) |
| Hibernate validate fails | Let Flyway run first; check migration logs |
| Images missing | Add under `src/assets/sites/{slug}/` and redeploy Vercel |
| Site not found | Check `sites` table — slug must exist and `active=true` |

---

## 8. Post-deploy checklist

- [ ] `/api/health` → UP
- [ ] `/api/sites/kavi` → JSON bundle
- [ ] `/site/kavi` → experience loads
- [ ] Photos + hero image display
- [ ] Music plays after user interaction
- [ ] `/site/test-site` isolated from Kavi
- [ ] Entry lock works per site (if enabled)
