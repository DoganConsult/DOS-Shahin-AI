#!/usr/bin/env bash
# preflight-gate.sh
# Hard CI gate: every PR must include a completed preflight-report.json (or .yaml)
# matching ci-gates/schemas/preflight-report.schema.json.
# Exits non-zero on any violation.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA="$ROOT/ci-gates/schemas/preflight-report.schema.json"
REPORT_JSON="${1:-${PREFLIGHT_REPORT:-preflight-report.json}}"

echo "[preflight-gate] schema:  $SCHEMA"
echo "[preflight-gate] report:  $REPORT_JSON"

[ -f "$SCHEMA" ] || { echo "[preflight-gate] FATAL: schema not found"; exit 2; }

if [ ! -f "$REPORT_JSON" ]; then
  cat <<EOF
[preflight-gate] FAIL: $REPORT_JSON missing.

Every PR/wave MUST attach a completed preflight report:
  cp ci-gates/schemas/preflight-report.template.json $REPORT_JSON
  edit $REPORT_JSON
  bash ci-gates/preflight-gate.sh $REPORT_JSON

Refer to ci-gates/PREFLIGHT_CHECKLIST.md.
EOF
  exit 1
fi

# Required top-level sections (match schema.required)
REQUIRED=(task_lock canonical_path baseline_state source_of_truth ui_system_preflight \
          dynamic_ui_preflight accepted_fixes change_plan build_gates route_wiring_rule \
          db_rbac_runtime_rule responsive_rtl fake_green_check report_contract decision)

ERR=0
for k in "${REQUIRED[@]}"; do
  if ! jq -e --arg k "$k" 'has($k)' "$REPORT_JSON" > /dev/null; then
    echo "[preflight-gate] FAIL: missing section '$k'"
    ERR=1
  fi
done

# Hard-rule checks (the items the schema says MUST be specific values)
DEC=$(jq -r '.decision // "MISSING"' "$REPORT_JSON")
case "$DEC" in
  GO|NO-GO|PARTIAL) echo "[preflight-gate] decision=$DEC";;
  *) echo "[preflight-gate] FAIL: decision must be GO|NO-GO|PARTIAL (got $DEC)"; ERR=1;;
esac

# Forbidden-fix list must be empty
FORBIDDEN_LEN=$(jq '(.accepted_fixes.forbidden_used // []) | length' "$REPORT_JSON")
if [ "$FORBIDDEN_LEN" != "0" ]; then
  echo "[preflight-gate] FAIL: accepted_fixes.forbidden_used must be empty (had $FORBIDDEN_LEN)"
  ERR=1
fi

# Fake-green flags must all be false
if jq -e '[.fake_green_check[]?] | any(. == true)' "$REPORT_JSON" > /dev/null; then
  echo "[preflight-gate] FAIL: fake_green_check has a true flag"
  ERR=1
fi

# All 4 widths checked
WIDTHS=$(jq '.responsive_rtl.widths_checked // [] | length' "$REPORT_JSON")
[ "$WIDTHS" -lt 4 ] && { echo "[preflight-gate] FAIL: responsive_rtl.widths_checked < 4 (got $WIDTHS)"; ERR=1; }

# Build gates: at least one command + all results pass
CMDS=$(jq '.build_gates.commands // [] | length' "$REPORT_JSON")
PASS=$(jq '[.build_gates.results[]? | select(. == "pass")] | length' "$REPORT_JSON")
[ "$CMDS" -lt 1 ] && { echo "[preflight-gate] FAIL: no build_gates.commands"; ERR=1; }
[ "$CMDS" -gt 0 ] && [ "$PASS" -ne "$CMDS" ] && { echo "[preflight-gate] FAIL: build_gates not all pass ($PASS/$CMDS)"; ERR=1; }

# next_wave_safe must be boolean
jq -e '.report_contract.next_wave_safe == true or .report_contract.next_wave_safe == false' "$REPORT_JSON" > /dev/null \
  || { echo "[preflight-gate] FAIL: report_contract.next_wave_safe missing"; ERR=1; }

# Legacy field removed from schema — reject if present (false-green / copy-paste drift).
if jq -e '.ui_system_preflight | has("primitives_used")' "$REPORT_JSON" > /dev/null 2>&1; then
  echo "[preflight-gate] FAIL: ui_system_preflight.primitives_used is forbidden (use components[] with vendor ibm-carbon per schema)"
  ERR=1
fi

# wrapper_layer required by schema
if ! jq -e '.ui_system_preflight.wrapper_layer == "@dos/ui-system" or .ui_system_preflight.wrapper_layer == "none"' "$REPORT_JSON" > /dev/null 2>&1; then
  echo "[preflight-gate] FAIL: ui_system_preflight.wrapper_layer must be @dos/ui-system or none"
  ERR=1
fi

# Carbon contract coherence: ui_system_preflight.components[] must be present
# and every row must declare vendor='ibm-carbon' with non-empty carbon_key + component_key.
COMP_LEN=$(jq '.ui_system_preflight.components // [] | length' "$REPORT_JSON")
if [ "$COMP_LEN" -lt 1 ]; then
  echo "[preflight-gate] FAIL: ui_system_preflight.components must have >=1 row"
  ERR=1
else
  BAD_VENDOR=$(jq '[.ui_system_preflight.components[] | select(.vendor != "ibm-carbon")] | length' "$REPORT_JSON")
  [ "$BAD_VENDOR" != "0" ] && { echo "[preflight-gate] FAIL: $BAD_VENDOR component(s) with vendor!=ibm-carbon"; ERR=1; }
  EMPTY_KEY=$(jq '[.ui_system_preflight.components[] | select((.carbon_key|length)==0 or (.component_key|length)==0)] | length' "$REPORT_JSON")
  [ "$EMPTY_KEY" != "0" ] && { echo "[preflight-gate] FAIL: $EMPTY_KEY component(s) with empty carbon_key/component_key"; ERR=1; }
  # When decision is GO, every component must be validation_status=valid (proves Carbon/registry coherence was verified).
  # PARTIAL / NO-GO may list invalid rows with failure_reason (e.g. sample template / WIP).
  if [ "$DEC" = "GO" ]; then
    BAD_VAL=$(jq '[.ui_system_preflight.components[] | select(.validation_status != "valid")] | length' "$REPORT_JSON")
    [ "$BAD_VAL" != "0" ] && { echo "[preflight-gate] FAIL: decision=GO but $BAD_VAL component(s) with validation_status!=valid (run carbon-dynamic-ui-coherence + dynamic-ui:gates first)"; ERR=1; }
  else
    INVALID_N=$(jq '[.ui_system_preflight.components[] | select(.validation_status != "valid")] | length' "$REPORT_JSON")
    [ "$INVALID_N" != "0" ] && echo "[preflight-gate] note: $INVALID_N component(s) not valid (allowed when decision is not GO)"
  fi
fi

# When DECISION=GO, all build results must pass and fake-green must be clean (already enforced).
if [ "$DEC" = "GO" ] && [ "$PASS" -ne "$CMDS" ]; then
  echo "[preflight-gate] FAIL: decision=GO but build_gates not all pass"
  ERR=1
fi

# JSON Schema validation (optional — if ajv-cli or check-jsonschema is on PATH)
if command -v ajv >/dev/null 2>&1; then
  if ! ajv validate -s "$SCHEMA" -d "$REPORT_JSON" >/dev/null; then
    echo "[preflight-gate] FAIL: JSON schema validation"
    ERR=1
  fi
elif command -v check-jsonschema >/dev/null 2>&1; then
  check-jsonschema --schemafile "$SCHEMA" "$REPORT_JSON" || ERR=1
else
  echo "[preflight-gate] note: no JSON-Schema validator on PATH (ajv | check-jsonschema). Structural checks only."
fi

if [ $ERR -eq 0 ]; then
  echo "[preflight-gate] PASS"
  exit 0
else
  echo "[preflight-gate] FAIL — preflight not satisfied; PR blocked."
  exit 1
fi
