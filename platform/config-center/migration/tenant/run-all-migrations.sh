#!/bin/bash
# DOS-AIO Tenant Migration Runner
# Usage: TENANT_SCHEMA=tenant_xyz DATABASE_URL=... ./run-all-migrations.sh

set -e

TENANT_SCHEMA="${TENANT_SCHEMA:-dos}"
DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5432/dos}"

echo "Running migrations for schema: $TENANT_SCHEMA"

MODULES_DIR="$(dirname "$0")/../../modules"

for mod_dir in "$MODULES_DIR"/*/; do
  mod_name=$(basename "$mod_dir")
  migration_dir="$mod_dir/source/backend/$mod_name/migrations"

  if [ -d "$migration_dir" ]; then
    echo "📦 Module: $mod_name"
    for sql_file in "$migration_dir"/*.sql; do
      if [ -f "$sql_file" ]; then
        echo "  ↳ Running: $(basename $sql_file)"
        # Replace __TENANT_SCHEMA__ placeholder
        sed "s/__TENANT_SCHEMA__/$TENANT_SCHEMA/g" "$sql_file" | \
          psql "$DATABASE_URL" -v ON_ERROR_STOP=1
        echo "  ✅ Done"
      fi
    done
  fi
done

echo ""
echo "✅ All tenant migrations complete for schema: $TENANT_SCHEMA"
