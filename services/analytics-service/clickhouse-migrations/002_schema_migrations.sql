-- Tracks applied ClickHouse migrations, analogous to PostgreSQL migration
-- tables. The migrator inserts one row per file after successful apply so
-- reruns are safe.
CREATE TABLE IF NOT EXISTS {database:Identifier}.schema_migrations (
  version String,
  applied_at DateTime DEFAULT now(),
  checksum String
) ENGINE = ReplacingMergeTree(applied_at)
ORDER BY version;
