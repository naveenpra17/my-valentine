# Assets — Place Your Personal Media Here

These paths are referenced in `backend/src/main/resources/db/data.sql`.  
Replace placeholder files with your own photos and audio before sharing the experience.

## Required folders

```
frontend/src/assets/
├── images/
│   ├── hero/
│   │   └── hero.jpg          ← Main portrait (HERO_IMAGE_URL)
│   ├── gallery/
│   │   ├── photo-1.jpg … photo-6.jpg
│   └── memories/
│       ├── memory-1.jpg … memory-4.jpg
└── audio/
    └── background.mp3        ← Optional ambient music (MUSIC_URL)
```

## Notes

- Use JPG or WebP. Keep files under ~500KB each for mobile performance.
- Gallery photos 1–4 are linked to memories 1–4 via `photos.memory_id` in the database.
- Placeholder 1×1 PNG files may exist for dev — **replace them** for production.
- Music only plays after the visitor taps the music control (no autoplay).

## Config override

You can change paths in `data.sql` or via `site_config` keys:

- `HERO_IMAGE_URL`
- `MUSIC_URL`
