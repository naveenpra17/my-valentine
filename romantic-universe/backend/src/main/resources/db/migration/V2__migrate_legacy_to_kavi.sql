-- Upgrade legacy single-tenant schema to multi-tenant (safe for existing Neon data)

INSERT INTO sites (slug, name, active)
SELECT 'kavi', 'Kavi', TRUE
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE LOWER(slug) = 'kavi');

-- Add site_id columns if upgrading from legacy schema
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS site_id BIGINT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS site_id BIGINT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS site_id BIGINT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS site_id BIGINT;
ALTER TABLE love_bombs ADD COLUMN IF NOT EXISTS site_id BIGINT;
ALTER TABLE reasons ADD COLUMN IF NOT EXISTS site_id BIGINT;
ALTER TABLE open_when_messages ADD COLUMN IF NOT EXISTS site_id BIGINT;
ALTER TABLE love_bomb_history ADD COLUMN IF NOT EXISTS site_id BIGINT;

-- Assign orphaned rows to the default Kavi site
UPDATE site_config SET site_id = (SELECT id FROM sites WHERE LOWER(slug) = 'kavi' LIMIT 1)
WHERE site_id IS NULL;

UPDATE memories SET site_id = (SELECT id FROM sites WHERE LOWER(slug) = 'kavi' LIMIT 1)
WHERE site_id IS NULL;

UPDATE photos SET site_id = (SELECT id FROM sites WHERE LOWER(slug) = 'kavi' LIMIT 1)
WHERE site_id IS NULL;

UPDATE quotes SET site_id = (SELECT id FROM sites WHERE LOWER(slug) = 'kavi' LIMIT 1)
WHERE site_id IS NULL;

UPDATE love_bombs SET site_id = (SELECT id FROM sites WHERE LOWER(slug) = 'kavi' LIMIT 1)
WHERE site_id IS NULL;

UPDATE reasons SET site_id = (SELECT id FROM sites WHERE LOWER(slug) = 'kavi' LIMIT 1)
WHERE site_id IS NULL;

UPDATE open_when_messages SET site_id = (SELECT id FROM sites WHERE LOWER(slug) = 'kavi' LIMIT 1)
WHERE site_id IS NULL;

UPDATE love_bomb_history SET site_id = (SELECT id FROM sites WHERE LOWER(slug) = 'kavi' LIMIT 1)
WHERE site_id IS NULL;

-- Drop legacy global unique on config_key when present (PostgreSQL / H2)
ALTER TABLE site_config DROP CONSTRAINT IF EXISTS site_config_config_key_key;
ALTER TABLE site_config DROP CONSTRAINT IF EXISTS CONSTRAINT_INDEX_2;
