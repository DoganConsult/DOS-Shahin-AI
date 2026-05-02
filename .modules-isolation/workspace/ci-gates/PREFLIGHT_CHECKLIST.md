# UI-SYSTEM + DYNAMIC-UI PREFLIGHT CHECKLIST (v2)

This file is the canonical schema. Every PR MUST attach a completed
`preflight-report.yaml` whose sections match the IDs below. The CI gate
`ci-gates/preflight-gate.sh` rejects any PR missing required sections.

## Preflight vs DB contract (Carbon)

- **Narrative / AGENTS.md** may reference **Dos\*** UI-System primitive **names** (e.g. DosAppShell) for human checklists.
- **`preflight-report.*` → `ui_system_preflight.components[]`** is **machine-validated**: each row MUST use **`vendor`: `ibm-carbon`**, a real **`carbon_key`** (catalog in `dos.ui_carbon_components`), and **`component_key`**. Do not put Dos* identifiers in `components[]`.
- Until `node scripts/ci-guards/carbon-dynamic-ui-coherence.mjs` and `pnpm dynamic-ui:gates` pass, keep **`validation_status`: `invalid`** (and honest **`failure_reason`**); use **`decision`: `PARTIAL`** or **`NO-GO`**. Only use **`decision`: `GO`** with all components **`valid`** after gates pass.

## Required section IDs (machine-checked)
- `task_lock`
- `canonical_path`
- `baseline_state`
- `source_of_truth`
- `ui_system_preflight`
- `dynamic_ui_preflight`
- `accepted_fixes`
- `change_plan`
- `build_gates`
- `route_wiring_rule`
- `db_rbac_runtime_rule`
- `responsive_rtl`
- `fake_green_check`
- `report_contract`
- `decision`            # values: GO | NO-GO | PARTIAL
