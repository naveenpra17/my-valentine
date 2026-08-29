# Deploy Now — Step by Step

Repo: **https://github.com/naveenpra17/valentine**

Stack: **Neon** (PostgreSQL) + **Render** (API) + **Netlify** (Angular frontend)

---

## Step 1 — Create Neon database

1. Go to [neon.tech](https://neon.tech) → sign up / sign in
2. **New Project** → name it e.g. `romantic-universe`
3. Region: pick one close to you (e.g. `Singapore` or `US East`)
4. Open **Dashboard** → your project → **Connect**
5. Copy the connection string — use the **pooled** URL if offered:
   ```
   postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
6. Open **SQL Editor** in Neon and run these files **in order**:
   - Paste all of `romantic-universe/backend/src/main/resources/db/schema.sql` → **Run**
   - Paste all of `romantic-universe/backend/src/main/resources/db/data.sql` → **Run**

> Without schema + data, the API will fail on startup (Hibernate `validate` error).

### Verify in Neon

Run in SQL Editor:

```sql
SELECT config_key, config_value FROM site_config LIMIT 5;
SELECT id, title FROM photos;
```

You should see your config keys and 6 photos.

---

## Step 2 — Deploy backend on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect GitHub repo **naveenpra17/valentine**
3. Render reads `render.yaml` at repo root (API only — no Render database)
4. When prompted, set these environment variables:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Your full Neon connection string (from Step 1) |
| `ENTRY_LOCK_ANSWER` | Her nickname (e.g. `beautiful`) |
| `CORS_ALLOWED_ORIGINS` | Leave blank for now |

5. Click **Apply** → wait for first build (~5–10 min)
6. Copy your API URL, e.g. `https://romantic-universe-api.onrender.com`
7. Test: `https://YOUR-API.onrender.com/api/health` → `{"status":"UP"}`
8. Test: `https://YOUR-API.onrender.com/api/config` → JSON with names/messages

---

## Step 3 — Point frontend at the API

Edit `romantic-universe/frontend/src/assets/config.json`:

```json
{
  "apiUrl": "https://YOUR-API.onrender.com/api"
}
```

Commit and push:

```powershell
cd "c:\personal site"
git add romantic-universe/frontend/src/assets/config.json
git commit -m "Set production API URL"
git push origin main
```

---

## Step 4 — Deploy frontend on Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
2. Connect **naveenpra17/valentine**
3. Netlify auto-detects root `netlify.toml`:
   - Base: `romantic-universe/frontend`
   - Publish: `romantic-universe/frontend/dist/frontend/browser`
4. Deploy
5. Copy your site URL, e.g. `https://something.netlify.app`

---

## Step 5 — Fix CORS (required)

In Render → **romantic-universe-api** → **Environment**:

```
CORS_ALLOWED_ORIGINS=https://YOUR-SITE.netlify.app
```

No trailing slash. Render redeploys automatically.

---

## Step 6 — Verify

- [ ] Neon SQL: `site_config` and `photos` tables have data
- [ ] `https://YOUR-API.onrender.com/api/health` → UP
- [ ] `https://YOUR-API.onrender.com/api/config` → JSON with your names/messages
- [ ] Frontend loads opening screen
- [ ] No CORS errors in browser console (F12)
- [ ] Photos appear in starfield
- [ ] Entry lock works (if enabled)

---

## Neon tips

| Topic | Note |
|-------|------|
| Connection string | Use **pooled** URL on Render (better for serverless/cold starts) |
| SSL | Neon includes `?sslmode=require` — keep it in the URL |
| Free tier | DB sleeps after inactivity; first query may take a few seconds |
| Editing content | Update `data.sql` locally, re-run changed SQL in Neon SQL Editor |
| Password special chars | Neon URL-encodes them — paste the string exactly as Neon gives it |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `relation "site_config" does not exist` | Run `schema.sql` in Neon SQL Editor |
| API starts but config is empty | Run `data.sql` in Neon SQL Editor |
| `Connection refused` / SSL error | Use full Neon URL with `sslmode=require` |
| API 503 on cold start | Render free tier sleeps — first request ~30s |
| CORS error | `CORS_ALLOWED_ORIGINS` must match Netlify URL exactly |
