-- Test site for multi-tenant isolation verification

INSERT INTO sites (slug, name, active)
SELECT 'test-site', 'Test Site', TRUE
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE LOWER(slug) = 'test-site');

INSERT INTO site_config (site_id, config_key, config_value)
SELECT s.id, v.config_key, v.config_value
FROM sites s
CROSS JOIN (
    VALUES
    ('HER_NAME', 'TEST PERSON'),
    ('MY_NAME', 'TEST OWNER'),
    ('HERO_TITLE', 'TEST PERSON.'),
    ('HERO_LINE_1', 'This is a test universe.'),
    ('HERO_LINE_2', 'Different from Kavi.'),
    ('ENTRY_LOCK_ENABLED', 'true'),
    ('ENTRY_LOCK_QUESTION', 'What is the test password?'),
    ('ENTRY_LOCK_ANSWER', 'test-answer'),
    ('MUSIC_URL', '/assets/sites/test-site/audio/background.mp3'),
    ('HERO_IMAGE_URL', '/assets/sites/test-site/hero/hero.jpg'),
    ('OPENING_VOID_1', 'Test...'),
    ('OPENING_VOID_2', 'Universe.'),
    ('OPENING_VOID_3', 'Isolation check.'),
    ('OPENING_VOID_4', 'Enter.')
) AS v(config_key, config_value)
WHERE LOWER(s.slug) = 'test-site'
  AND NOT EXISTS (SELECT 1 FROM site_config sc WHERE sc.site_id = s.id);

INSERT INTO memories (site_id, title, message, memory_date, location, image_url, display_order)
SELECT s.id, 'Test memory', 'This memory belongs to test-site only.', DATE '2025-01-01', 'Testville',
       '/assets/sites/test-site/memories/memory-1.jpg', 1
FROM sites s
WHERE LOWER(s.slug) = 'test-site'
  AND NOT EXISTS (SELECT 1 FROM memories m WHERE m.site_id = s.id);

INSERT INTO photos (site_id, title, caption, image_url, memory_id, display_order)
SELECT s.id, 'Test photo', 'Only for test-site.', '/assets/sites/test-site/gallery/photo-1.jpg', NULL, 1
FROM sites s
WHERE LOWER(s.slug) = 'test-site'
  AND NOT EXISTS (SELECT 1 FROM photos p WHERE p.site_id = s.id);
