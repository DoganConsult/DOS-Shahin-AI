# Foundation AI 14-Day Onboarding Playbook

## Day 1-2: Environment and Contract Baseline
- Provision tenant and pilot user.
- Validate `/api/ui-os/workspace-runtime` and `/api/ui-os/template-binding` access.
- Apply latest Foundation migrations through canonical pipeline.

## Day 3-4: Navigation and Route Validation
- Validate route parity for `/foundation/delegations`, `/foundation/workflows`, `/foundation/ownership-mapping`.
- Confirm component key/archetype/template export alignment in DB.
- Run shell/static/legacy guards.

## Day 5-6: Delegation Lifecycle Activation
- Load delegation rules and escalation thresholds.
- Verify runtime delegation payload includes risk/escalation fields.
- Confirm escalation queue appears in UI.

## Day 7-8: Workflows and Governance Orchestration
- Validate workflow timeline step contracts and route binding.
- Confirm masthead and pillar copy are DB-sourced.
- Capture pilot screenshots and runtime payload samples.

## Day 9-10: Identity Graph + Simulation
- Seed/verify identity graph nodes and edges.
- Seed/verify policy simulation scenarios.
- Validate runtime payload and rendering in ownership-map surface.

## Day 11-12: Explainability + Localization
- Validate explainability blocks and typed actions.
- Verify Arabic locale payloads for ownership/workflows/delegations.
- Confirm bilingual export artifacts in reports route dataset.

## Day 13: KPI Snapshot and Governance Gates
- Run KPI snapshot: `node scripts/program/foundation-ai/pilot-kpi-snapshot.mjs`.
- Run wave gates: `pnpm program:wave-verify -- --wave=1`, `pnpm program:wave-proof -- --wave=1`, `pnpm program:wave-close -- --wave=1`.

## Day 14: Go-Live Decision
- Review readiness report and proof artifacts.
- Confirm no static/legacy/fallback regressions.
- Approve pilot-to-commercial transition.
