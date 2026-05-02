-- Register the 'grc' profile in dos.profile_registry
BEGIN;
INSERT INTO dos.profile_registry (code, name, description, version, default_locale, enabled)
VALUES ('grc', 'Shahin-AI GRC', 'Governance, Risk and Compliance — 19-card workspace.', '1.0.0', 'en', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  version = EXCLUDED.version, updated_at = now();
COMMIT;
