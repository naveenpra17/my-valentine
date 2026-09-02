-- Run in Neon SQL Editor to enable the nickname gate for Kavi (existing databases).

INSERT INTO site_config (site_id, config_key, config_value)
SELECT s.id, 'ENTRY_LOCK_ENABLED', 'true'
FROM sites s
WHERE LOWER(s.slug) = 'kavi'
ON CONFLICT (site_id, config_key) DO UPDATE
SET config_value = 'true', updated_at = CURRENT_TIMESTAMP;

-- Required: set the secret answer (replace with her nickname).
INSERT INTO site_config (site_id, config_key, config_value)
SELECT s.id, 'ENTRY_LOCK_ANSWER', 'YOUR_NICKNAME_HERE'
FROM sites s
WHERE LOWER(s.slug) = 'kavi'
ON CONFLICT (site_id, config_key) DO UPDATE
SET config_value = EXCLUDED.config_value, updated_at = CURRENT_TIMESTAMP;
