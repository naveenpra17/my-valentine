# Production Personalization Checklist

Replace placeholders and configure content **without changing application code**.

## Database / `backend/src/main/resources/db/data.sql`

| Content | Table / Key | Notes |
|---------|-------------|-------|
| Her name | `site_config` → `HER_NAME` | Used throughout experience |
| Your name | `site_config` → `MY_NAME` | Letter & signature |
| Hero text | `HERO_*`, `OPENING_VOID_*` | Opening & hero beat |
| Final lines | `FINAL_LINE_1` … `FINAL_LINE_4` | Finale typography |
| Final message | `FINAL_MESSAGE` | Personal letter text |
| Finale personal line | `FINALE_PERSONAL_LINE` | Before final message |
| Footer (optional) | `FOOTER_CREDIT` | Hidden in cinematic flow |
| Entry lock | `ENTRY_LOCK_QUESTION` + env `ENTRY_LOCK_ANSWER` | Optional gate |
| Music URL | `MUSIC_URL` | `/assets/audio/background.mp3` |
| Hero image | `HERO_IMAGE_URL` | `/assets/images/hero/hero.jpg` |

## Media files (`frontend/src/assets/`)

| Asset | Path |
|-------|------|
| Hero portrait | `images/hero/hero.jpg` |
| Gallery photos | `images/gallery/photo-1.jpg` … |
| Memory images | `images/memories/memory-1.jpg` … |
| Background music | `audio/background.mp3` |

## Relational content

| Link | How |
|------|-----|
| Photo → memory | `photos.memory_id` in `data.sql` |
| Memories | `memories` table + images |
| Reasons | `reasons` table |
| Quotes | `quotes` table |
| Love bombs | `love_bombs` table |
| Open When | `open_when_messages` table |
| Flower message | `FLOWER_MESSAGE` in config |
| Secret messages | `SECRET_MESSAGE`, `HIDDEN_STAR_MESSAGE`, etc. |

## Production API URL

Edit `frontend/src/assets/config.json`:

```json
{ "apiUrl": "https://your-api.example.com/api" }
```

## Environment (backend)

| Variable | Purpose |
|----------|---------|
| `SPRING_PROFILES_ACTIVE=prod` | PostgreSQL profile |
| `DATABASE_URL` | JDBC connection |
| `CORS_ALLOWED_ORIGINS` | Frontend URL |
| `ENTRY_LOCK_ANSWER` | Optional gate answer |

## Before sharing with her

- [ ] Replace all placeholder 1×1 images
- [ ] Add real `background.mp3` or disable music
- [ ] Verify `HER_NAME` and `FINAL_MESSAGE`
- [ ] Test photo → memory links
- [ ] Build heart with discoveries and test **Share** preview
- [ ] Test on mobile Safari + Chrome
- [ ] Clear session: `sessionStorage.clear(); localStorage.removeItem('romantic_universe_entered')`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for hosting steps.
