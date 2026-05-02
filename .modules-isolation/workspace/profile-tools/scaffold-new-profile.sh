#!/usr/bin/env bash
# scaffold-new-profile.sh <profile_code> "<Profile Name>"
# Creates profiles/<code>/ skeleton with manifests/, registries/, workflows/,
# migrations/sql/, dynamic-ui-seeds/, workspace-cards.json.
set -euo pipefail
CODE="${1:-}"; NAME="${2:-}"
[ -n "$CODE" ] && [ -n "$NAME" ] || { echo "usage: $0 <code> \"<Name>\""; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/profiles/$CODE"
[ -e "$DEST" ] && { echo "error: $DEST already exists"; exit 1; }
mkdir -p "$DEST"/{manifests,registries,workflows,migrations/sql,dynamic-ui-seeds}
cat > "$DEST/profile.json" <<JSON
{
  "code": "$CODE",
  "name": "$NAME",
  "version": "1.0.0",
  "defaultLocale": "en",
  "enabled": true,
  "metadata": {}
}
JSON
cat > "$DEST/workspace-cards.json" <<JSON
{ "version": "1.0.0", "model": "$CODE-cards", "cards": [], "shell_surfaces": {} }
JSON
cat > "$DEST/dynamic-ui-seeds/00_profile_registry.sql" <<SQL
BEGIN;
INSERT INTO dos.profile_registry (code,name,description,version,default_locale,enabled,metadata)
VALUES ('$CODE','$NAME','Auto-scaffolded profile','1.0.0','en',TRUE,'{}'::jsonb)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, updated_at=now();
COMMIT;
SQL
echo "scaffolded $DEST"
echo "next steps:"
echo "  1. add manifests/<module>.profile.json files"
echo "  2. run profile-tools/generate-registries.sh $CODE"
echo "  3. run profile-tools/generate-ui-seeds.sh $CODE"
