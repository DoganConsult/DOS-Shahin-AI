# OpenFGA ReBAC adapter

Speaks the OpenFGA HTTP API to answer relationship checks: `can user X
can_approve evidence:456?`, `list all controls where user X is reviewer`.

## Files

- [openfga.adapter.ts](openfga.adapter.ts) — HTTP client for `check`, `list-objects`, `write`
- [model.fga](model.fga) — DAuth authorization model (tenant, team, department, evidence, control, policy, risk, report, delegation)

## Relation naming

The decision engine queries `can_<action>` relations. Convention:

| Action code | Relation |
|---|---|
| `evidence.view` | `can_view` |
| `evidence.approve` | `can_approve` |
| `report.export` | `can_export` |
| `control.sign_off` | `can_sign_off` |

The adapter derives relation name from the action's last dotted segment.
Unusual cases can override by calling the adapter directly.

## Rollout

1. Bootstrap an OpenFGA store, POST the model in [model.fga](model.fga),
   capture `authorization_model_id`. Put it in Vault → `OPENFGA_MODEL_ID`.
2. Backfill tuples from the DAuth source-of-truth tables:
   - `tenant_user_memberships` → `tenant:<id>#member@user:<uid>`
   - `entity_ownership` → `<type>:<id>#owner@user:<uid>`
   - `delegations` → `delegation:<id>#to@user:<uid>` + scope tuples
3. Start the tuple-sync subscriber (see [events/openfga-tuple-sync.subscriber.ts](../../events/openfga-tuple-sync.subscriber.ts)).
   It listens for DAuth events (`delegation.created`, `delegation.revoked`,
   `ownership.assigned`, `ownership.revoked`) and writes matching tuples.
4. Set `DAUTH_OPENFGA_SHADOW=true`. Decision engine now runs OpenFGA beside
   the native scope-resolver; mismatches are logged.
5. Run a reconciliation job nightly that compares OpenFGA contents with
   the DAuth source tables; fail the job (alert on-call) if drift > 0.1%.
6. After 2 sprint cycles clean, set `DAUTH_OPENFGA_ENFORCE=true`.
7. If OpenFGA becomes unavailable, adapter returns `allowed: false, trace: "unavailable"`.
   The decision engine sees this and falls back to native in enforce mode only
   if the native check also grants; otherwise the pipeline continues.
