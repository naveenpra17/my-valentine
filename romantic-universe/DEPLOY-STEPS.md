# Deploy Now — Step by Step

Repo: **https://github.com/naveenpra17/valentine**

Stack: **Neon** (PostgreSQL) + **Render** (API) + **Vercel** (Angular frontend)

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

## Step 4 — Deploy frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → sign in with **GitHub**
2. **Add New…** → **Project**
3. Import repo **`naveenpra17/valentine`**
4. Configure the project:

| Setting | Value |
|---------|--------|
| **Framework Preset** | Other (or leave as detected) |
| **Root Directory** | `romantic-universe/frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist/frontend/browser` |
| **Install Command** | `npm ci` |

> Vercel reads `romantic-universe/frontend/vercel.json` for SPA routing and cache headers.

5. Click **Deploy** → wait ~2–5 min
6. Copy your site URL, e.g. `https://valentine-xxx.vercel.app`

### Optional — deploy via CLI

```powershell
cd "c:\personal site\romantic-universe\frontend"
npm i -g vercel
vercel login
vercel --prod
```

---

## Step 5 — Fix CORS (required)

In Render → **romantic-universe-api** → **Environment**:

```
CORS_ALLOWED_ORIGINS=https://YOUR-SITE.vercel.app
```

No trailing slash. If you use a custom domain too, comma-separate:

```
CORS_ALLOWED_ORIGINS=https://YOUR-SITE.vercel.app,https://yourdomain.com
```

Render redeploys automatically.

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
| CORS error | `CORS_ALLOWED_ORIGINS` must match Vercel URL exactly |
| Blank page on Vercel | Confirm Output Directory is `dist/frontend/browser` |
