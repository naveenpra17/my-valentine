# Assets — Multi-Site Media Guide

Images and audio are **static files on Vercel**, referenced by URL paths stored in **Neon**.

## Standard layout (new sites)

```
frontend/src/assets/sites/{slug}/
├── hero/
│   └── hero.jpg              ← HERO_IMAGE_URL
├── gallery/
│   ├── photo-1.jpg …         ← photos.image_url (3D + gallery)
├── memories/
│   ├── memory-1.jpg …        ← memories.image_url
└── audio/
    └── background.mp3        ← MUSIC_URL
```

**Browser URL example (Kavi):**

```
https://your-app.vercel.app/assets/sites/kavi/gallery/photo-1.jpg
```

**Neon value:**

```
/assets/sites/kavi/gallery/photo-1.jpg
```

## Kavi file checklist

| File | Linked to |
|------|-----------|
| `hero/hero.jpg` | Hero portrait |
| `gallery/photo-1.jpg` | Memory 1 (via `photos.memory_id`) |
| `gallery/photo-2.jpg` | Memory 2 |
| `gallery/photo-3.jpg` | Memory 3 |
| `gallery/photo-4.jpg` | Memory 4 |
| `gallery/photo-5.jpg` | Standalone discovery |
| `gallery/photo-6.jpg` | Standalone discovery |
| `memories/memory-1.jpg` … `memory-4.jpg` | Memory timeline |
| `audio/background.mp3` | Ambient music (optional) |

See `sites/kavi/README.md` in this folder.

## Adding a new person

```powershell
# From repo root
.\scripts\new-site-assets.ps1 -Slug anu
```

1. Drop images into `sites/anu/`
2. Run SQL from `backend/src/main/resources/db/seed-site.sql`
3. Commit + redeploy Vercel

## Legacy single-site paths

Older deployments may use:

```
/assets/images/hero/hero.jpg
/assets/images/gallery/photo-1.jpg
/assets/images/memories/memory-1.jpg
/assets/audio/background.mp3
```

Place files under `frontend/src/assets/images/` and `audio/`, or migrate Neon with `neon-update-multisite-paths.sql`.

## External hosting (CDN)

Set full URLs in Neon — no redeploy needed for new images:

```sql
UPDATE photos SET image_url = 'https://cdn.example.com/kavi/photo-1.jpg'
WHERE site_id = (SELECT id FROM sites WHERE slug = 'kavi') AND display_order = 1;
```

## Tips

- JPG or WebP; target &lt; 500KB per image for mobile
- Music requires user tap (no autoplay)
- Personal photos are **not** committed to git by default — add locally before `vercel deploy`
- After adding files, **redeploy Vercel** to include them in the bundle
