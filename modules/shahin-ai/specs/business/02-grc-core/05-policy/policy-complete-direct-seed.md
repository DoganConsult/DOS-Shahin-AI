# Policy Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `policy` |
| product_key | `shahin-ai` |
| route_base | `/policy` |
| owner_service | `governance-policy-service` |
| module_status | `active_after_validation` |
| module_name_en | `Policy` |
| module_name_ar | `Policy` |
| category | `grc-core` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `policy` | `shahin-ai` | `Policy` | `grc-core` | `active` | `governance-policy-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `policy` | `policy` | `/policy` | `Policy` | `Policy` | `policy.read` | 10 |
| `policy.overview` | `policy` | `/policy/overview` | Overview | نظرة عامة | `policy.read` | 10 |
| `policy.library` | `policy` | `/policy/library` | Policy Library | مكتبة السياسات | `policy.read` | 20 |
| `policy.approvals` | `policy` | `/policy/approvals` | Approvals | الموافقات | `policy.approve` | 30 |
| `policy.attestations` | `policy` | `/policy/attestations` | Attestations | الإقرارات | `policy.attestation.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `policy.overview.page` | `/policy/overview` | `policy` | `policy.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `policy.library.page` | `/policy/library` | `policy` | `policy.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `policy.approvals.page` | `/policy/approvals` | `policy` | `policy.approve` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `policy.attestations.page` | `/policy/attestations` | `policy` | `policy.attestation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `policy.admin` | policy admin |
| `policy.approve` | policy approve |
| `policy.attestation.read` | policy attestation read |
| `policy.read` | policy read |
| `policy.write` | policy write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `policy.*` |
| `policy_admin` | `policy.read`, `policy.write`, `policy.admin` |
| `policy_operator` | read/write operational permissions |
| `policy_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + policy + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.policies` | page data / API backing | `tenant_id` required where applicable |
| `dos.policy_approvals` | page data / API backing | `tenant_id` required where applicable |
| `dos.policy_attestations` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `policy.overview` | `/policy/overview` | Overview | نظرة عامة | `PolicyOverviewComponent` | `GET /api/policies/overview` | `dos.policies` | `policy.read` | `VERIFY` |
| 2 | `policy.library` | `/policy/library` | Policy Library | مكتبة السياسات | `PolicyLibraryComponent` | `GET /api/policies` | `dos.policies` | `policy.read` | `VERIFY` |
| 3 | `policy.approvals` | `/policy/approvals` | Approvals | الموافقات | `PolicyApprovalsComponent` | `GET /api/policies/approvals` | `dos.policy_approvals` | `policy.approve` | `VERIFY` |
| 4 | `policy.attestations` | `/policy/attestations` | Attestations | الإقرارات | `PolicyAttestationsComponent` | `GET /api/policies/attestations` | `dos.policy_attestations` | `policy.attestation.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT policy into dos.module_registry
-- UPSERT parent and child rows into dos.navigation_registry
-- UPSERT Dynamic UI rows only after carbon_key verification
-- UPSERT permissions into platform_dauth.permissions
-- UPSERT role bindings into platform_dauth.role_permissions
-- UPSERT tenant entitlements only for selected tenant

COMMIT;
```

## 7. Validation checklist

- [ ] module_registry row exists
- [ ] nav rows exist
- [ ] route exists
- [ ] component exists
- [ ] API exists
- [ ] backend route exists
- [ ] DB table/query exists
- [ ] permission exists
- [ ] role binding exists
- [ ] tenant entitlement exists
- [ ] org/tenant scope enforced
- [ ] no mock/static data
- [ ] build passes
