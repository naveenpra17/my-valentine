-- Enable nickname entry lock for every active site.
-- Set ENTRY_LOCK_ANSWER per site in Neon (secret) — never sent to the browser.

INSERT INTO site_config (site_id, config_key, config_value)
SELECT s.id, 'ENTRY_LOCK_ENABLED', 'true'
FROM sites s
WHERE s.active = TRUE
ON CONFLICT (site_id, config_key) DO UPDATE
SET config_value = 'true', updated_at = CURRENT_TIMESTAMP;

INSERT INTO site_config (site_id, config_key, config_value)
SELECT s.id, 'ENTRY_LOCK_QUESTION', 'What''s the nickname only I call you? ❤️'
FROM sites s
WHERE s.active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM site_config sc
    WHERE sc.site_id = s.id AND sc.config_key = 'ENTRY_LOCK_QUESTION'
  );
