# Per-site static assets (served by Vercel)

Each romantic site has its own folder under `sites/{slug}/`.  
Database `image_url`, `HERO_IMAGE_URL`, and `MUSIC_URL` must match these paths.

## Kavi (`sites/kavi/`)

| File | DB reference |
|------|----------------|
| `hero/hero.jpg` | `HERO_IMAGE_URL` → `/assets/sites/kavi/hero/hero.jpg` |
| `gallery/photo-1.jpg` … `photo-6.jpg` | `photos.image_url` |
| `memories/memory-1.jpg` … `memory-4.jpg` | `memories.image_url` |
| `audio/background.mp3` | `MUSIC_URL` → `/assets/sites/kavi/audio/background.mp3` |

Photos 1–4 link to memories 1–4 via `photos.memory_id` in Neon.

## Adding another person (e.g. `anu`)

1. Create folder `sites/anu/` with the same subfolders.
2. Run SQL from `backend/src/main/resources/db/seed-site.sql` (replace placeholders).
3. Use paths like `/assets/sites/anu/gallery/photo-1.jpg` in Neon.
4. Commit images + redeploy Vercel.

## Legacy Kavi paths

If your Neon DB still uses `/assets/images/...`, either:

- Run `backend/src/main/resources/db/neon-update-multisite-paths.sql` in Neon, **or**
- Place files under `src/assets/images/` (see `ASSETS.md` legacy section).

## External URLs

You may use full `https://...` URLs in Neon instead of `/assets/...` paths (CDN, S3, Cloudinary). No code changes required.

## Notes

- JPG or WebP recommended; keep files under ~500KB for mobile.
- Images are **not** stored in git by default — add your personal photos locally before deploy.
- After adding files, redeploy Vercel so they are included in the static bundle.
