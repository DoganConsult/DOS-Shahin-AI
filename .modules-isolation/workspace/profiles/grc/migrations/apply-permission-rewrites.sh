#!/usr/bin/env bash
# W3 — Permission rewrite. DRY-RUN by default. Set APPLY=1 to write.
# Operates ONLY on .modules-isolation/workspace/modules/cards. Live tree untouched.
set -euo pipefail
ROOT="${ROOT:-/root/DOS-Platform/.modules-isolation/workspace/modules/cards}"
APPLY="${APPLY:-0}"

# verb_map: legacy -> canonical
declare -A VERB=(
  [read]=record.read
  [view]=record.read
  [write]=record.write
  [edit]=record.write
  [approve]=record.approve
  [manage]=record.manage
  [delete]=record.delete
  [configure]=record.configure
  [export]=export
)
# legacy module aliases -> canonical card code
declare -A MOD=(
  [evidence]=evidence  [agent]=ai_governance  [access]=foundation
  [remediation]=issues [incident]=incident    [exception]=exceptions
  [risk]=risk          [policy]=policy        [compliance]=compliance
  [qiyas]=qiyas        [audit]=audit          [bcp]=bcp
  [training]=training  [vendor]=vendor        [governance]=governance
  [controls]=controls  [asset]=asset          [reporting]=reporting
)
total=0
for old_mod in "${!MOD[@]}"; do
  new_mod=${MOD[$old_mod]}
  for old_verb in "${!VERB[@]}"; do
    new_verb=${VERB[$old_verb]}
    pat="${old_mod}:${old_verb}"
    new="${new_mod}.${new_verb}"
    files=$(grep -rEln "['\"]${pat}['\"]" "$ROOT" 2>/dev/null || true)
    [ -z "$files" ] && continue
    n=$(echo "$files" | wc -l)
    total=$((total + n))
    echo "$pat  ->  $new   ($n files)"
    if [ "$APPLY" = "1" ]; then
      echo "$files" | xargs sed -i "s|['\"]${pat}['\"]|'${new}'|g"
    fi
  done
done
echo "TOTAL files affected: $total  (APPLY=$APPLY)"
