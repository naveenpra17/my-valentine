-- ============================================================
-- SEED TEMPLATE — Create a new romantic site without code changes
-- Replace placeholders, then run against your database.
-- ============================================================

-- 1) Site row
INSERT INTO sites (slug, name, active)
VALUES ('{{SITE_SLUG}}', '{{SITE_NAME}}', TRUE);

-- 2) Config (public keys only in site_config; ENTRY_LOCK_ANSWER stays server-side)
INSERT INTO site_config (site_id, config_key, config_value)
SELECT s.id, v.config_key, v.config_value
FROM sites s
CROSS JOIN (
    VALUES
    ('HER_NAME', '{{HER_NAME}}'),
    ('MY_NAME', '{{MY_NAME}}'),
    ('HERO_TITLE', '{{HERO_TITLE}}'),
    ('HERO_IMAGE_URL', '/assets/sites/{{SITE_SLUG}}/hero/hero.jpg'),
    ('MUSIC_URL', '/assets/sites/{{SITE_SLUG}}/audio/background.mp3'),
    ('ENTRY_LOCK_ENABLED', 'true'),
    ('ENTRY_LOCK_QUESTION', '{{ENTRY_LOCK_QUESTION}}'),
    ('ENTRY_LOCK_ANSWER', '{{ENTRY_LOCK_ANSWER}}')
) AS v(config_key, config_value)
WHERE s.slug = '{{SITE_SLUG}}';

-- 3) Memories, photos, quotes, reasons, love bombs, open-when
-- Use site_id = (SELECT id FROM sites WHERE slug = '{{SITE_SLUG}}')
-- Example photo:
-- INSERT INTO photos (site_id, title, caption, image_url, memory_id, display_order)
-- VALUES ((SELECT id FROM sites WHERE slug = '{{SITE_SLUG}}'), 'Us', 'Caption', '/assets/sites/{{SITE_SLUG}}/gallery/photo-1.jpg', NULL, 1);

-- 4) Upload assets to frontend:
--    frontend/src/assets/sites/{{SITE_SLUG}}/hero/hero.jpg
--    frontend/src/assets/sites/{{SITE_SLUG}}/gallery/photo-1.jpg
--    frontend/src/assets/sites/{{SITE_SLUG}}/memories/memory-1.jpg
--    frontend/src/assets/sites/{{SITE_SLUG}}/audio/background.mp3

-- 5) Visit https://your-domain/site/{{SITE_SLUG}}
