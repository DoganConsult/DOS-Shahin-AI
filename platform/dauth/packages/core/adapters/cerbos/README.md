# Cerbos policy pack for DAuth

This directory ships a starter pack — derived roles + one resource policy per
core GRC entity (evidence, control, report). It is NOT the production pack;
the production pack lives in a separate GitOps repo and is synced into the
Cerbos PDP independently of this codebase.

## Files

- [policies/derived_roles.dogan.yaml](policies/derived_roles.dogan.yaml) — shared `owner`, `reviewer`, `approver`, `tenant_admin`, `platform_admin`
- [policies/evidence.yaml](policies/evidence.yaml) — `evidence.*` actions with SoD no-self-approval rule
- [policies/control.yaml](policies/control.yaml) — `control.*` actions + SoD: tester ≠ reviewer
- [policies/report.yaml](policies/report.yaml) — `report.*` actions, export obligation `requireDualApproval`

## How it plugs into DAuth

1. Cerbos PDP runs standalone (container, systemd unit, or k8s). Policy
   files are mounted at `/policies`.
2. `adapters/cerbos/cerbos.adapter.ts` talks to the PDP over `POST
   /api/check/resources`.
3. DAuth calls the adapter from `evaluateAccess` via the factory when
   `DAUTH_CERBOS_SHADOW=true` or `DAUTH_CERBOS_ENFORCE=true`.
4. **Shadow mode**: native pipeline is authoritative; Cerbos verdict is
   attached to `engineResults.cerbos` and any divergence from the native
   verdict is logged as a mismatch event.
5. **Enforce mode**: Cerbos verdict replaces the native SoD/lifecycle steps
   in the 14-step pipeline. Native services remain as the fallback when
   Cerbos is unreachable (`DENY_CERBOS_UNAVAILABLE`).

## Policy versioning

Every rule file has `resourcePolicy.version: "N"`. Bump for
backward-incompatible changes. The adapter stamps `currentPolicyVersion()`
(from `/api/server_info` — git commit of the pack) onto every decision row
so historical decisions can be re-evaluated against the exact pack that
produced them.

## Testing

Cerbos supports YAML test suites. A starter suite lives in
[policies/tests/](policies/tests/) — add one per policy file. Required
coverage before enforce mode:

- `evidence.approve` allowed when approver ≠ creator (allow)
- `evidence.approve` denied when approver = creator (deny, `DAUTH_DENY_SOD_SELF_APPROVAL`)
- `evidence.delete` denied when status = approved (deny)
- `report.export` produces `requireDualApproval` obligation (allow + obligation)
- Cross-tenant access denied (deny, tenant mismatch)

Run: `cerbos compile policies/` then `cerbos test policies/tests/`.
Include the output as an artifact in the policy-pack CI.
