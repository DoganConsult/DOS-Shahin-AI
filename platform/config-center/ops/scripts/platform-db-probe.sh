#!/usr/bin/env bash
# platform-db-probe.sh — Phase A read-only inventory for the migration
# rollout plan (deep-investigation-migration-abundant-pizza).
#
# Emits a single JSON document per DB describing:
#   - tracker-table presence + row counts for all 5 ledgers
#   - column presence for the four drift-sensitive tables
#   - row counts for the seeded config tables
#   - classification: canonical+tracked | canonical+untracked | drifted+untracked | ephemeral
#
# Usage:
#   ops/scripts/platform-db-probe.sh <db_name> [--out <path>]
#   ops/scripts/platform-db-probe.sh --all   [--out-dir <dir>]
#
# In --all mode, iterates every DB whose name matches the rollout target
# set (shahin_*, dos_phase2_test) and writes one JSON file per DB under
# <dir> (default: ops/reports/db-probe-<date>/).
#
# Connection: uses local peer auth as the `postgres` superuser via sudo.
# Purely read-only — issues only SELECTs (and a session-temp function)
# and is safe to run against live.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DATE_TAG="$(date +%Y-%m-%d)"
DEFAULT_OUT_DIR="$REPO_ROOT/ops/reports/db-probe-$DATE_TAG"

psql_as_postgres() {
  # --set=client_min_messages=error suppresses the harmless "pg_temp
  # dependency" notice that fires when we attach a plpgsql helper to a
  # temp schema. The warning fires at CREATE time; the helper works fine.
  sudo -u postgres psql -X -A -t -q -v ON_ERROR_STOP=1 \
    --set=client_min_messages=error "$@"
}

probe_one() {
  local db="$1"
  local out_file="$2"

  # A single self-contained psql invocation. We register a throwaway
  # pg_temp.row_count() helper that uses EXECUTE so table-name resolution
  # happens at runtime (not parse time). The JSON emitter at the end
  # composes the final document and classification in SQL.
  local sql
  sql=$(cat <<'EOSQL'
CREATE OR REPLACE FUNCTION pg_temp.row_count(qualified_name text) RETURNS bigint AS $$
DECLARE
  n bigint;
BEGIN
  IF to_regclass(qualified_name) IS NULL THEN
    RETURN NULL;
  END IF;
  EXECUTE 'SELECT COUNT(*) FROM ' || qualified_name INTO n;
  RETURN n;
END
$$ LANGUAGE plpgsql;

SELECT jsonb_pretty(
  (SELECT jsonb_build_object(
    'db',        current_database(),
    'timestamp', to_jsonb(NOW()),
    'trackers',  jsonb_build_object(
      'dos.platform_migrations',   jsonb_build_object(
        'exists', to_regclass('dos.platform_migrations') IS NOT NULL,
        'rows',   pg_temp.row_count('dos.platform_migrations')),
      'dos.schema_migrations',     jsonb_build_object(
        'exists', to_regclass('dos.schema_migrations') IS NOT NULL,
        'rows',   pg_temp.row_count('dos.schema_migrations')),
      'dos.service_migrations',    jsonb_build_object(
        'exists', to_regclass('dos.service_migrations') IS NOT NULL,
        'rows',   pg_temp.row_count('dos.service_migrations')),
      'public.schema_migrations',  jsonb_build_object(
        'exists', to_regclass('public.schema_migrations') IS NOT NULL,
        'rows',   pg_temp.row_count('public.schema_migrations')),
      'public.dos_migrations',     jsonb_build_object(
        'exists', to_regclass('public.dos_migrations') IS NOT NULL,
        'rows',   pg_temp.row_count('public.dos_migrations'))
    ),
    'columns',   jsonb_build_object(
      'dos.config_definitions',       (SELECT COALESCE(jsonb_agg(column_name ORDER BY column_name), '[]'::jsonb)
                                       FROM information_schema.columns
                                       WHERE table_schema='dos' AND table_name='config_definitions'),
      'dos.config_values',            (SELECT COALESCE(jsonb_agg(column_name ORDER BY column_name), '[]'::jsonb)
                                       FROM information_schema.columns
                                       WHERE table_schema='dos' AND table_name='config_values'),
      'dos.platform_operation_config',(SELECT COALESCE(jsonb_agg(column_name ORDER BY column_name), '[]'::jsonb)
                                       FROM information_schema.columns
                                       WHERE table_schema='dos' AND table_name='platform_operation_config'),
      'dos.feature_flags',            (SELECT COALESCE(jsonb_agg(column_name ORDER BY column_name), '[]'::jsonb)
                                       FROM information_schema.columns
                                       WHERE table_schema='dos' AND table_name='feature_flags')
    ),
    'seed_counts', jsonb_build_object(
      'dos.config_definitions',        pg_temp.row_count('dos.config_definitions'),
      'dos.platform_operation_config', pg_temp.row_count('dos.platform_operation_config'),
      'dos.feature_flags',             pg_temp.row_count('dos.feature_flags')
    ),
    'drift_flags', jsonb_build_object(
      'config_definitions_has_key',        EXISTS(SELECT 1 FROM information_schema.columns
                                                  WHERE table_schema='dos' AND table_name='config_definitions'
                                                    AND column_name='key'),
      'config_definitions_has_config_key', EXISTS(SELECT 1 FROM information_schema.columns
                                                  WHERE table_schema='dos' AND table_name='config_definitions'
                                                    AND column_name='config_key'),
      'config_values_has_definition_id',   EXISTS(SELECT 1 FROM information_schema.columns
                                                  WHERE table_schema='dos' AND table_name='config_values'
                                                    AND column_name='definition_id'),
      'platform_op_config_has_config_key', EXISTS(SELECT 1 FROM information_schema.columns
                                                  WHERE table_schema='dos' AND table_name='platform_operation_config'
                                                    AND column_name='config_key'),
      'feature_flags_has_name_en',         EXISTS(SELECT 1 FROM information_schema.columns
                                                  WHERE table_schema='dos' AND table_name='feature_flags'
                                                    AND column_name='name_en')
    )
  )) ||
  -- Classification is folded in after the base document is built so the
  -- 'drift_flags' keys are already materialized and cheap to reference.
  jsonb_build_object('classification',
    CASE
      -- Schema-subset DBs (e.g. shahin_token_hash_*) never had the four
      -- drift-sensitive tables at all. Treat them as out-of-scope for
      -- reconciliation and onboarding.
      WHEN to_regclass('dos.config_definitions') IS NULL
        AND to_regclass('dos.config_values') IS NULL
        AND to_regclass('dos.feature_flags') IS NULL
        THEN 'not-applicable'
      WHEN NOT (EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='dos' AND table_name='config_definitions' AND column_name='key'))
        OR NOT (EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='dos' AND table_name='config_values' AND column_name='definition_id'))
        OR NOT (EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='dos' AND table_name='feature_flags' AND column_name='name_en'))
        THEN 'drifted+untracked'
      WHEN to_regclass('dos.platform_migrations') IS NOT NULL
        THEN 'canonical+tracked'
      ELSE 'canonical+untracked'
    END
  )
);
EOSQL
)

  local json
  json=$(psql_as_postgres -d "$db" -c "$sql")
  echo "$json" > "$out_file"

  # Echo a one-line summary to stdout for log-line readability.
  local class
  class=$(echo "$json" | grep -oE '"classification": *"[^"]+"' | head -1 | sed 's/.*: *"//' | sed 's/"$//')
  echo "[probe] $db -> ${class:-unknown} -> $out_file"
}

list_target_dbs() {
  psql_as_postgres -d postgres -c \
    "SELECT datname FROM pg_database
     WHERE (datname LIKE 'shahin_%' OR datname = 'dos_phase2_test')
     ORDER BY datname;"
}

main() {
  local mode="single"
  local db=""
  local out_file=""
  local out_dir="$DEFAULT_OUT_DIR"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --all)     mode="all"; shift ;;
      --out)     out_file="$2"; shift 2 ;;
      --out-dir) out_dir="$2"; shift 2 ;;
      -h|--help)
        grep '^#' "$0" | sed 's/^# \{0,1\}//'
        exit 0
        ;;
      *)
        if [[ -z "$db" ]]; then db="$1"; shift
        else echo "[probe] unknown argument: $1" >&2; exit 1
        fi
        ;;
    esac
  done

  if [[ "$mode" == "all" ]]; then
    mkdir -p "$out_dir"
    local n=0
    while IFS= read -r d; do
      [[ -z "$d" ]] && continue
      probe_one "$d" "$out_dir/$d.json"
      n=$((n+1))
    done < <(list_target_dbs)
    echo "[probe] wrote $n report(s) to $out_dir"
  else
    if [[ -z "$db" ]]; then
      echo "[probe] usage: $0 <db_name> [--out <path>]   OR   $0 --all [--out-dir <dir>]" >&2
      exit 1
    fi
    if [[ -z "$out_file" ]]; then
      mkdir -p "$out_dir"
      out_file="$out_dir/$db.json"
    fi
    probe_one "$db" "$out_file"
  fi
}

main "$@"
