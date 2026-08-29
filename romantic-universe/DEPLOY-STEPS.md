# Deploy Now — Step by Step

Repo: **https://github.com/naveenpra17/valentine**

Stack: **Render** (API + PostgreSQL) + **Netlify** (Angular frontend)

---

## Step 1 — Push latest code

```powershell
cd "c:\personal site"
git add .
git commit -m "Prepare romantic universe for production deploy"
git push origin main
```

---

## Step 2 — Database (Render auto-creates via Blueprint)

After Render Blueprint deploys, open the **romantic-universe-db** database → **Connect** → run these files in order:

1. `romantic-universe/backend/src/main/resources/db/schema.sql`
2. `romantic-universe/backend/src/main/resources/db/data.sql`

> Without this, the API will fail with Hibernate `validate` errors.

---

## Step 3 — Deploy backend on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect GitHub repo **naveenpra17/valentine**
3. Render reads `render.yaml` at repo root
4. When prompted, set:
   - `CORS_ALLOWED_ORIGINS` → leave blank for now (set after Netlify)
   - `ENTRY_LOCK_ANSWER` → her nickname (e.g. `beautiful`)
5. Wait for deploy (~5–10 min first build)
6. Copy your API URL, e.g. `https://romantic-universe-api.onrender.com`
7. Test: `https://YOUR-API.onrender.com/api/health` → `{"status":"UP"}`

---

## Step 4 — Point frontend at the API

Edit `romantic-universe/frontend/src/assets/config.json`:

```json
{
  "apiUrl": "https://YOUR-API.onrender.com/api"
}
```

Commit and push:

```powershell
git add romantic-universe/frontend/src/assets/config.json
git commit -m "Set production API URL"
git push origin main
```

---

## Step 5 — Deploy frontend on Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
2. Connect **naveenpra17/valentine**
3. Netlify auto-detects root `netlify.toml`:
   - Base: `romantic-universe/frontend`
   - Publish: `romantic-universe/frontend/dist/frontend/browser`
4. Deploy
5. Copy your site URL, e.g. `https://something.netlify.app`

---

## Step 6 — Fix CORS (required)

In Render → **romantic-universe-api** → **Environment**:

```
CORS_ALLOWED_ORIGINS=https://YOUR-SITE.netlify.app
```

No trailing slash. Render will redeploy automatically.

---

## Step 7 — Verify

- [ ] `https://YOUR-API.onrender.com/api/health` → UP
- [ ] `https://YOUR-API.onrender.com/api/config` → JSON with names/messages
- [ ] Frontend loads opening screen
- [ ] No CORS errors in browser console (F12)
- [ ] Photos load in starfield
- [ ] Entry lock works (if enabled)

---

## Optional — Custom domain

**Netlify:** Domain settings → add domain → update DNS  
**Render:** Custom domain on API service  
Then update `config.json` apiUrl + `CORS_ALLOWED_ORIGINS` with the new URLs.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API 503 on cold start | Render free tier sleeps — first request takes ~30s |
| CORS error | URLs must match exactly |
| Blank page | Check Netlify deploy log; confirm publish path |
| DB error on startup | Run schema.sql + data.sql on PostgreSQL |
