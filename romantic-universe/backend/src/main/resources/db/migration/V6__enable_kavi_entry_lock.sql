-- Enable nickname entry lock for the Kavi site.
-- Set ENTRY_LOCK_ANSWER in Neon (secret) — it is never sent to the browser.

INSERT INTO site_config (site_id, config_key, config_value)
SELECT s.id, 'ENTRY_LOCK_ENABLED', 'true'
FROM sites s
WHERE LOWER(s.slug) = 'kavi'
ON CONFLICT (site_id, config_key) DO UPDATE
SET config_value = 'true', updated_at = CURRENT_TIMESTAMP;
