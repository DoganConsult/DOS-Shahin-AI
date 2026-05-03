# Attestation Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `attestation` |
| product_key | `shahin-ai` |
| route_base | `/attestation` |
| owner_service | `compliance-controls-service` |
| module_status | `active_after_validation` |
| module_name_en | `Attestation` |
| module_name_ar | `Attestation` |
| category | `grc-core` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `attestation` | `shahin-ai` | `Attestation` | `grc-core` | `active` | `compliance-controls-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `attestation` | `attestation` | `/attestation` | `Attestation` | `Attestation` | `attestation.read` | 10 |
| `attestation.overview` | `attestation` | `/attestation/overview` | Overview | نظرة عامة | `attestation.read` | 10 |
| `attestation.campaigns` | `attestation` | `/attestation/campaigns` | Campaigns | الحملات | `attestation.read` | 20 |
| `attestation.responses` | `attestation` | `/attestation/responses` | Responses | الردود | `attestation.read` | 30 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `attestation.overview.page` | `/attestation/overview` | `attestation` | `attestation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `attestation.campaigns.page` | `/attestation/campaigns` | `attestation` | `attestation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `attestation.responses.page` | `/attestation/responses` | `attestation` | `attestation.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `attestation.admin` | attestation admin |
| `attestation.read` | attestation read |
| `attestation.write` | attestation write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `attestation.*` |
| `attestation_admin` | `attestation.read`, `attestation.write`, `attestation.admin` |
| `attestation_operator` | read/write operational permissions |
| `attestation_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + attestation + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.attestation_campaigns` | page data / API backing | `tenant_id` required where applicable |
| `dos.attestation_responses` | page data / API backing | `tenant_id` required where applicable |
| `dos.attestations` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `attestation.overview` | `/attestation/overview` | Overview | نظرة عامة | `AttestationOverviewComponent` | `GET /api/attestations/overview` | `dos.attestations` | `attestation.read` | `VERIFY` |
| 2 | `attestation.campaigns` | `/attestation/campaigns` | Campaigns | الحملات | `AttestationCampaignsComponent` | `GET /api/attestations/campaigns` | `dos.attestation_campaigns` | `attestation.read` | `VERIFY` |
| 3 | `attestation.responses` | `/attestation/responses` | Responses | الردود | `AttestationResponsesComponent` | `GET /api/attestations/responses` | `dos.attestation_responses` | `attestation.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT attestation into dos.module_registry
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
