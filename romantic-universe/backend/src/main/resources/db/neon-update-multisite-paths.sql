-- Run in Neon SQL Editor after uploading images to frontend/src/assets/sites/kavi/
-- Safe to re-run: only updates paths that still use the legacy /assets/images/ layout.

UPDATE site_config sc
SET config_value = '/assets/sites/kavi/hero/hero.jpg', updated_at = CURRENT_TIMESTAMP
FROM sites s
WHERE sc.site_id = s.id AND LOWER(s.slug) = 'kavi'
  AND sc.config_key = 'HERO_IMAGE_URL'
  AND sc.config_value LIKE '/assets/images/%';

UPDATE site_config sc
SET config_value = '/assets/sites/kavi/audio/background.mp3', updated_at = CURRENT_TIMESTAMP
FROM sites s
WHERE sc.site_id = s.id AND LOWER(s.slug) = 'kavi'
  AND sc.config_key = 'MUSIC_URL'
  AND (sc.config_value LIKE '/assets/images/%' OR sc.config_value = '/assets/audio/background.mp3');

UPDATE memories m
SET image_url = REPLACE(m.image_url, '/assets/images/memories/', '/assets/sites/kavi/memories/')
FROM sites s
WHERE m.site_id = s.id AND LOWER(s.slug) = 'kavi'
  AND m.image_url LIKE '/assets/images/memories/%';

UPDATE photos p
SET image_url = REPLACE(p.image_url, '/assets/images/gallery/', '/assets/sites/kavi/gallery/')
FROM sites s
WHERE p.site_id = s.id AND LOWER(s.slug) = 'kavi'
  AND p.image_url LIKE '/assets/images/gallery/%';
