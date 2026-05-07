# Evidence Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `evidence` |
| product_key | `shahin-ai` |
| route_base | `/evidence` |
| owner_service | `evidence-audit-reporting-service` |
| module_status | `active_after_validation` |
| module_name_en | `Evidence` |
| module_name_ar | `Evidence` |
| category | `grc-core` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `evidence` | `shahin-ai` | `Evidence` | `grc-core` | `active` | `evidence-audit-reporting-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `evidence` | `evidence` | `/evidence` | `Evidence` | `Evidence` | `evidence.read` | 10 |
| `evidence.overview` | `evidence` | `/evidence/overview` | Overview | نظرة عامة | `evidence.read` | 10 |
| `evidence.library` | `evidence` | `/evidence/library` | Library | المكتبة | `evidence.read` | 20 |
| `evidence.requests` | `evidence` | `/evidence/requests` | Requests | الطلبات | `evidence.request.read` | 30 |
| `evidence.reports` | `evidence` | `/evidence/reports` | Reports | التقارير | `evidence.report.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `evidence.overview.page` | `/evidence/overview` | `evidence` | `evidence.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `evidence.library.page` | `/evidence/library` | `evidence` | `evidence.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `evidence.requests.page` | `/evidence/requests` | `evidence` | `evidence.request.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `evidence.reports.page` | `/evidence/reports` | `evidence` | `evidence.report.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `evidence.admin` | evidence admin |
| `evidence.read` | evidence read |
| `evidence.report.read` | evidence report read |
| `evidence.request.read` | evidence request read |
| `evidence.write` | evidence write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `evidence.*` |
| `evidence_admin` | `evidence.read`, `evidence.write`, `evidence.admin` |
| `evidence_operator` | read/write operational permissions |
| `evidence_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + evidence + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.evidence_items` | page data / API backing | `tenant_id` required where applicable |
| `dos.evidence_reports` | page data / API backing | `tenant_id` required where applicable |
| `dos.evidence_requests` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `evidence.overview` | `/evidence/overview` | Overview | نظرة عامة | `EvidenceOverviewComponent` | `GET /api/evidence/overview` | `dos.evidence_items` | `evidence.read` | `VERIFY` |
| 2 | `evidence.library` | `/evidence/library` | Library | المكتبة | `EvidenceLibraryComponent` | `GET /api/evidence` | `dos.evidence_items` | `evidence.read` | `VERIFY` |
| 3 | `evidence.requests` | `/evidence/requests` | Requests | الطلبات | `EvidenceRequestsComponent` | `GET /api/evidence/requests` | `dos.evidence_requests` | `evidence.request.read` | `VERIFY` |
| 4 | `evidence.reports` | `/evidence/reports` | Reports | التقارير | `EvidenceReportsComponent` | `GET /api/evidence/reports` | `dos.evidence_reports` | `evidence.report.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT evidence into dos.module_registry
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
