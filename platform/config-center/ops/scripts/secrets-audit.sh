#!/usr/bin/env bash
set -euo pipefail

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Secrets Audit                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

FAIL=0
WARN=0

check_hardcoded_secrets() {
  echo "── Checking for hardcoded secrets ──"
  local PATTERNS='(password|secret|api_key|apikey|private_key|encryption_key)\s*[:=]\s*["\x27][A-Za-z0-9+/=_~.-]{8,}'
  local FILES
  FILES=$(grep -rEil "$PATTERNS" services/ packages/ platform/ platform/config-center/env/ \
    --include='*.ts' --include='*.js' --include='*.json' --include='*.env*' \
    --exclude-dir=node_modules --exclude-dir=dist \
    --exclude='*.test.ts' --exclude='*.spec.ts' \
    --exclude='*.example' --exclude='*template*' \
    --exclude='*mock*' --exclude='*fixture*' \
    --exclude='package.json' --exclude='pnpm-lock.yaml' \
    --exclude='tsconfig*.json' 2>/dev/null || true)

  local REAL_FILES=""
  if [ -n "$FILES" ]; then
    while IFS= read -r f; do
      # Filter out files that only contain placeholders
      if grep -Ei "$PATTERNS" "$f" 2>/dev/null | grep -vqE 'CHANGE_ME|vault://|placeholder|<YOUR_|dev-secret|dev-only|lm-studio-local|Dummy key'; then
        REAL_FILES="$REAL_FILES $f"
      fi
    done <<< "$FILES"
  fi

  if [ -n "$REAL_FILES" ]; then
    echo "  ✗ Hardcoded secrets found (FAIL):"
    for f in $REAL_FILES; do
      echo "     $f"
      FAIL=$((FAIL + 1))
    done
  else
    echo "  ✓ No hardcoded secrets found"
  fi
  echo ""
}

check_env_files_not_committed() {
  echo "── Checking .env files not in repo ──"
  local ENV_FILES
  ENV_FILES=$(find services/ packages/ -name ".env" -not -name ".env.example" -not -name ".env.shared" 2>/dev/null || true)

  # The real risk is a `.env` file being *tracked* by git. A locally-
  # present `.env` that `.gitignore` keeps out of the index is a
  # developer convenience, not a secret leak. Only warn if git
  # actually tracks the file (or if git is unavailable, fall back to
  # the bare-existence warning).
  local LEAKED=""
  if command -v git >/dev/null 2>&1; then
    if [ -n "$ENV_FILES" ]; then
      while IFS= read -r f; do
        if git ls-files --error-unmatch -- "$f" >/dev/null 2>&1; then
          LEAKED+="$f"$'\n'
        fi
      done <<< "$ENV_FILES"
    fi
  else
    LEAKED="$ENV_FILES"
  fi

  if [ -n "$LEAKED" ]; then
    echo "  ⚠  .env files tracked by git (must be untracked):"
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      echo "     $f"
      WARN=$((WARN + 1))
    done <<< "$LEAKED"
  else
    echo "  ✓ No .env files tracked by git"
  fi
  echo ""
}

check_gitignore() {
  echo "── Checking .gitignore covers secrets ──"
  local REQUIRED=(".env" ".env.local" "*.pem" "*.key")
  for pattern in "${REQUIRED[@]}"; do
    if grep -qF "$pattern" .gitignore 2>/dev/null; then
      echo "  ✓ .gitignore covers: $pattern"
    else
      echo "  ✗ .gitignore MISSING: $pattern"
      FAIL=$((FAIL + 1))
    fi
  done
  echo ""
}

check_sql_parameterization() {
  echo "── Checking SQL parameterization ──"
  local BAD_SQL
  BAD_SQL=$(grep -rn "query.*\`.*\${" services/ packages/ \
    --include='*.ts' \
    --exclude-dir=node_modules --exclude-dir=dist \
    --exclude='*.test.ts' --exclude='*.spec.ts' \
    --exclude='*migration*' --exclude='*seed*' 2>/dev/null | head -20 || true)

  if [ -n "$BAD_SQL" ]; then
    echo "  ⚠  Potential SQL injection (template literals in queries):"
    while IFS= read -r line; do
      echo "     $line"
      WARN=$((WARN + 1))
    done <<< "$BAD_SQL"
  else
    echo "  ✓ No obvious SQL injection patterns"
  fi
  echo ""
}

check_zod_validation() {
  echo "── Checking Zod validation coverage ──"
  local TOTAL=0
  local WITH_ZOD=0
  for svc in services/*/; do
    [ -d "$svc/src/routes" ] || continue
    SVC_NAME=$(basename "$svc")
    TOTAL=$((TOTAL + 1))
    if grep -rql "zod\|validate\|zodSchema\|ZodSchema\|\.parse(\|\.safeParse(" "$svc/src/" --include='*.ts' --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null; then
      WITH_ZOD=$((WITH_ZOD + 1))
    else
      echo "  ⚠  $SVC_NAME: No Zod validation found"
      WARN=$((WARN + 1))
    fi
  done
  echo "  Coverage: $WITH_ZOD/$TOTAL services use input validation"
  echo ""
}

check_pii_tagging() {
  echo "── Checking PII field tagging in Zod schemas ──"
  local PII_FIELD_NAMES='(email|phone|name|address|ssn|national_id|ip_address|date_of_birth|bank_account)'
  local SCHEMA_FILES
  SCHEMA_FILES=$(find services/ modules/ packages/ -name '*.schemas.ts' -not -path '*/node_modules/*' -not -path '*/dist/*' 2>/dev/null || true)

  local UNTAGGED=0
  local TAGGED=0
  if [ -n "$SCHEMA_FILES" ]; then
    while IFS= read -r f; do
      # Check for PII field names that use safeStr/optSafeStr without pii: describe tag
      local BAD
      BAD=$(grep -En "$PII_FIELD_NAMES.*safeStr|$PII_FIELD_NAMES.*z\.string\(\)" "$f" 2>/dev/null | grep -v "pii:" || true)
      if [ -n "$BAD" ]; then
        while IFS= read -r line; do
          UNTAGGED=$((UNTAGGED + 1))
        done <<< "$BAD"
      fi
      # Count tagged fields
      local GOOD
      GOOD=$(grep -c "pii:" "$f" 2>/dev/null || true)
      TAGGED=$((TAGGED + GOOD))
    done <<< "$SCHEMA_FILES"
  fi

  if [ $UNTAGGED -gt 0 ]; then
    echo "  ⚠  $UNTAGGED PII field(s) not tagged with pii: describe metadata"
    WARN=$((WARN + UNTAGGED))
  fi
  echo "  Tagged PII fields: $TAGGED"
  echo "  ✓ PII tagging audit complete"
  echo ""
}

check_data_classification() {
  echo "── Checking data classification registry ──"
  local REGISTRY="packages/dos-platform-core/src/security/data-classification-registry.ts"
  if [ -f "$REGISTRY" ]; then
    local CLASSIFIED
    CLASSIFIED=$(grep -c "table:" "$REGISTRY" 2>/dev/null || echo "0")
    echo "  Tables classified: $CLASSIFIED"

    # Compare against tables in migrations
    local MIGRATION_TABLES=0
    if [ -d "ops/migrations" ]; then
      MIGRATION_TABLES=$(grep -hEi 'CREATE TABLE' ops/migrations/*.sql 2>/dev/null | wc -l || echo "0")
    fi
    echo "  Tables in migrations: $MIGRATION_TABLES"

    if [ "$CLASSIFIED" -lt "$MIGRATION_TABLES" ]; then
      local DIFF=$((MIGRATION_TABLES - CLASSIFIED))
      echo "  ⚠  $DIFF table(s) missing from classification registry"
      WARN=$((WARN + 1))
    else
      echo "  ✓ All migration tables classified"
    fi
  else
    echo "  ⚠  Data classification registry not found at $REGISTRY"
    WARN=$((WARN + 1))
  fi
  echo ""
}

check_hardcoded_secrets
check_env_files_not_committed
check_gitignore
check_sql_parameterization
check_zod_validation
check_pii_tagging
check_data_classification

echo "── Summary ──────────────────────────────────────────"
echo "  Failures: $FAIL"
echo "  Warnings: $WARN"
if [ $FAIL -gt 0 ]; then
  echo "  Status: ✗ FAIL"
  exit 1
fi
echo "  Status: ✓ PASS (with $WARN warnings)"
