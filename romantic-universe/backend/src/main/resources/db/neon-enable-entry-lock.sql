-- Run in Neon SQL Editor to enable entry lock for ALL sites (existing databases).

INSERT INTO site_config (site_id, config_key, config_value)
SELECT s.id, 'ENTRY_LOCK_ENABLED', 'true'
FROM sites s
WHERE s.active = TRUE
ON CONFLICT (site_id, config_key) DO UPDATE
SET config_value = 'true', updated_at = CURRENT_TIMESTAMP;

-- Set a secret answer per site (repeat for each slug):
-- INSERT INTO site_config (site_id, config_key, config_value)
-- SELECT s.id, 'ENTRY_LOCK_ANSWER', 'her-nickname'
-- FROM sites s WHERE LOWER(s.slug) = 'kavi'
-- ON CONFLICT (site_id, config_key) DO UPDATE
-- SET config_value = EXCLUDED.config_value, updated_at = CURRENT_TIMESTAMP;

-- To disable for one site only:
-- UPDATE site_config sc SET config_value = 'false'
-- FROM sites s WHERE sc.site_id = s.id AND s.slug = 'test-site' AND sc.config_key = 'ENTRY_LOCK_ENABLED';
