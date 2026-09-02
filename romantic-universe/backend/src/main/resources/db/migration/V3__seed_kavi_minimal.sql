-- Seed default Kavi site content (only when empty — preserves existing Neon data)

INSERT INTO sites (slug, name, active)
SELECT 'kavi', 'Kavi', TRUE
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE LOWER(slug) = 'kavi');

-- Config
INSERT INTO site_config (site_id, config_key, config_value)
SELECT s.id, v.config_key, v.config_value
FROM sites s
CROSS JOIN (
    VALUES
    ('HER_NAME', 'Beautiful'),
    ('MY_NAME', 'Your Name'),
    ('HERO_LINE_1', 'Some people make the world beautiful just by being in it.'),
    ('HERO_LINE_2', 'And somehow, I got lucky enough to find you.'),
    ('HERO_TITLE', 'Her.'),
    ('ENTRY_LOCK_ENABLED', 'true'),
    ('ENTRY_LOCK_QUESTION', 'What''s the nickname only I call you? ❤️'),
    ('MUSIC_URL', '/assets/sites/kavi/audio/background.mp3'),
    ('HERO_IMAGE_URL', '/assets/sites/kavi/hero/hero.jpg')
) AS v(config_key, config_value)
WHERE LOWER(s.slug) = 'kavi'
  AND NOT EXISTS (SELECT 1 FROM site_config sc WHERE sc.site_id = s.id);
