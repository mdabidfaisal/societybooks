ALTER TABLE samiti_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

UPDATE samiti_settings SET is_active = true WHERE is_active IS NULL;
