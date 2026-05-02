# Plan: Production Deployment — Config Center for BIVA UI System + UI Dynamics

## Goal
Ship a production-grade deployment of the Config Center module and its dependent runtime surfaces (gateway/service topology, Config OS contracts, and Dynamic UI bootstrap) with documented, auditable controls for security, compliance, observability, DR, and rollback.

This plan separates:
- **Repo work** (code/config/docs changes we can implement and validate in CI)
- **Infrastructure/operator work** (secrets manager, network controls, DB policies, certificates) that must be executed outside the repo but can be fully documented and enforced via configuration contracts + checks.

## Current State (Key Anchors)
- Environment templates and operational tooling exist under [platform/config-center/env](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/env) and [platform/config-center/ops](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/ops).
- Runtime startup refuses to boot on missing critical env vars via [validate-env.ts](file:///root/DOS-AIO/DOS%20Platform/modules/packages/dos-service-bootstrap/src/validate-env.ts).
- Postgres TLS support + pool safety exist in [dos-db config](file:///root/DOS-AIO/DOS%20Platform/modules/packages/dos-db/src/config.ts).
- Nginx edge config already sets security headers/CSP; gateway and product-shell disable CSP internally and assume nginx owns it ([gateway server.ts](file:///root/DOS-AIO/DOS%20Platform/services/gateway/src/server.ts), [product-shell server.ts](file:///root/DOS-AIO/DOS%20Platform/services/product-shell/src/server.ts)).
- DR runbook + backup scripts exist ([disaster-recovery-runbook.md](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/ops/docs/disaster-recovery-runbook.md), `ops/scripts/*backup*`).

## Scope Boundaries (Four-tier compliance)
- **Config Center** (platform DNA) may own: env templates, ops scripts, configuration contracts, admin UI.
- **Products** compose only; no product-owned auth/session/nav shell DNA.
- **Dynamic UI** must be platform-owned; BIVA/UI-OS component allowlists must be enforced at render boundaries (current split between page host vs dashboard host needs reconciliation).

---

## Workstreams (Mapped to the 14 requested areas)

### 1) Production Environment Configuration (Secrets + URLs + keys)
**Repo work**
- Reconcile and standardize env variable contracts across:
  - ops templates: [platform/config-center/env/.env.example](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/env/.env.example), [platform/config-center/env/.env.production.example](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/env/.env.production.example)
  - ops validator: [ops/scripts/validate-env.ts](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/ops/scripts/validate-env.ts)
  - runtime validator: [dos-service-bootstrap validate-env.ts](file:///root/DOS-AIO/DOS%20Platform/modules/packages/dos-service-bootstrap/src/validate-env.ts)
  - DB runtime: [dos-db config.ts](file:///root/DOS-AIO/DOS%20Platform/modules/packages/dos-db/src/config.ts)
- Add a canonical “production env contract” doc that:
  - enumerates required env vars (full-mesh service URLs, DB/Redis, JWT, secrets encryption)
  - defines which values MUST come from a secrets manager (Vault/KMS/SSM/etc.)
  - defines rotation procedure for JWT + secrets encryption keys
- Fix the dangling reference to `docs/FULL-MESH-ENV-VARS.md` (referenced by `.env.production.example`) by either adding it or updating references to the existing source-of-truth: [ports.allocation.json](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/ops/ports.allocation.json).

**Operator work**
- Store all `# SECRET` values in a production secrets manager and inject to host at deploy time via `platform.secrets.env` (PM2 loads it in [ecosystem.platform.config.js](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/ops/ecosystem.platform.config.js)).

**Evidence artifacts**
- Sanitized env inventory (names only, no values), plus secrets-manager export proving the values exist.
- Output of `node platform/config-center/ops/scripts/validate-env.ts` against templates.

### 2) Database Security (TLS, pooling, least privilege, firewall)
**Repo work**
- Ensure all services that connect to Postgres use the shared DB client so `PG_SSL/DB_SSL` and pool settings are consistently applied ([dos-db config.ts](file:///root/DOS-AIO/DOS%20Platform/modules/packages/dos-db/src/config.ts)).
- Extend env validation contracts to include production expectations for DB TLS:
  - require `DB_SSL=true` (or `PG_SSL=true`) for non-local hosts in production
  - require CA path for verified TLS (already enforced in `dos-db`, but validate earlier as a deployment gate)
- Add a DB hardening runbook:
  - role design (migrations role vs runtime role)
  - GRANT matrix per schema
  - connection caps and timeouts per service (`PG_*_TIMEOUT_MS` already supported)

**Operator work**
- Enforce network restrictions (DB security groups / firewall rules) so only gateway/services hosts can connect.
- Implement least-privilege DB roles and rotate passwords.
- If needed, deploy PgBouncer and update `DATABASE_URL` accordingly.

**Evidence artifacts**
- `psql` outputs showing role grants and `ssl=on` usage.
- Diagram of network access controls (CIDRs / SG rules).

### 3) Authentication & Authorization (OAuth2/OIDC, RBAC, sessions)
**Repo work**
- Standardize on Keycloak OIDC (OAuth 2.0 / OpenID Connect) as the production auth mechanism and document topology (already described in `.env.example`).
- Verify RBAC enforcement surfaces:
  - gateway decision ledger and permission middleware (auditability)
  - AccessStore/DAuth role→permission mapping
- Add an “auth readiness” checklist and a smoke-test script (login → token exchange → permission-gated endpoint → denial case).

**Operator work**
- Configure production IdP (Keycloak realms/clients, SSO policies, MFA, session idle/absolute timeouts).
- Configure secure cookie + same-site policies at the edge (nginx/Cloudflare).

**Evidence artifacts**
- RBAC snapshot via [access-matrix.sh](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/ops/scripts/access-matrix.sh) plus an example deny decision written by the gateway ledger.

### 4) Compliance API Integration (audit, retention, privacy, reporting)
**Repo work**
- Inventory compliance endpoints that must be live in production (audit-service, governance-policy-service, privacy-service, reporting services) and publish a “required APIs” table in a runbook.
- Add authenticated contract tests (or integration tests) that verify:
  - audit log writes occur for critical actions
  - retention policy endpoints respond and are permission-gated
  - regulatory report endpoints are reachable via gateway prefixes

**Operator work**
- Configure retention schedules and storage tiering (DB retention + object storage retention for exports).

**Evidence artifacts**
- API contract test run output + sampled audit event trail.

### 5) Encryption Standards (AES-256 at rest, TLS 1.3 in transit, rotation)
**Repo work**
- Define the platform’s “encryption boundaries” clearly:
  - TLS at the edge (nginx) for all client traffic
  - verified TLS to Postgres when remote
  - field-level encryption keys for PII where applicable (already modeled by PII keys in env templates)
- Add key-rotation runbooks for:
  - `SECRETS_ENCRYPTION_KEY`
  - JWT signing keys
  - PII encryption keys (rotation strategy + backwards-read policy)

**Operator work**
- At-rest encryption: enforce via managed disk encryption / KMS and documented DB storage policies (Postgres itself does not natively provide TDE).
- Certificate lifecycle: ACME or managed certs, renewal automation, expiry alerting.

**Evidence artifacts**
- TLS scan output (edge supports TLS 1.3).
- Secrets rotation SOP + proof of drill in non-prod.

### 6) Security Testing Protocol (SAST/DAST/deps/headers)
**Repo work**
- Make the existing security audit scripts first-class CI gates for production releases:
  - [security-audit.mjs](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/ops/scripts/security-audit.mjs)
  - [secrets-audit.sh](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/ops/scripts/secrets-audit.sh)
  - OWASP ZAP config at [zap-scan.yaml](file:///root/DOS-AIO/DOS%20Platform/platform/foundation/tests/security/zap-scan.yaml)
- Harden security headers contract:
  - keep CSP/HSTS at nginx edge as source-of-truth
  - add a verification script that asserts headers exist on the public URLs

**Operator work**
- Run penetration testing against staging/prod with approval and change windows.

**Evidence artifacts**
- Dependency audit reports, ZAP baseline reports, and headers verification output.

### 7) Deployment Documentation (runbooks, rollback, troubleshooting)
**Repo work**
- Extend/merge the existing deployment runbook [deploy.md](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/ops/runbooks/deploy.md) with:
  - Config Center-specific steps (env file contract, Config OS dependency list, Dynamic UI bootstrap expectations)
  - Troubleshooting matrix for common failures (env validation, DB SSL, Redis NOAUTH, Keycloak)
- Add a “BIVA UI system deployment” section: UI-OS gates, allowlist enforcement, widget registration expectations.

### 8) Monitoring & Logging (APM, centralized logs, alerts)
**Repo work**
- Ensure all services emit structured logs with correlation fields (already via service-bootstrap).
- Document the canonical observability stack in [ops/monitoring](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/ops/monitoring) and add alert checklists (error rate, latency, saturation, DB pool exhaustion, queue lag).

**Operator work**
- Deploy/operate Prometheus/Grafana/Loki/Jaeger (native scripts exist) and configure alert routing (PagerDuty/email).

### 9) Backup & Disaster Recovery (PITR, replication, drills)
**Repo work**
- Adopt the existing DR runbook as canonical and add drill evidence requirements (quarterly restore drill, RPO/RTO verification).
- Ensure backup scripts are parameterized for off-host storage and multi-AZ patterns.

**Operator work**
- Configure WAL archiving + replication in the DB layer.
- Schedule backups (cron/systemd timers) and store off-host.

### 10) Performance Optimization (DB indexes, caching, CDN, benchmarks)
**Repo work**
- Add production baseline load-test procedure using existing script [load-test.sh](file:///root/DOS-AIO/DOS%20Platform/platform/config-center/ops/scripts/load-test.sh).
- Confirm DB pool defaults are safe fleet-wide; require explicit overrides for high-traffic services.
- Document caching boundaries (Redis) and ensure redaction/no-store rules for sensitive API responses.

**Operator work**
- Configure CDN for SPA assets at the edge; tune caching rules.

### 11) Regulatory Compliance Verification (GDPR/SOX/HIPAA/etc.)
**Repo work**
- Produce a compliance verification checklist that maps:
  - data classification + retention settings
  - audit trail completeness
  - access control evidence (RBAC/decision ledger)
  - export/anonymization procedures (where applicable)

**Operator work**
- Confirm data residency controls (region/zone constraints, backups location).

### 12) End-to-End Testing (functional + integration + UAT)
**Repo work**
- Add a production smoke-test suite that validates:
  - gateway health + critical prefixes
  - login flow (OIDC)
  - Config Center key workflows (resolve/explain/settings/audit/health)
  - Dynamic UI bootstrap renders without missing component/widget keys
- Ensure tests run in CI and can be executed against staging using environment variables.

### 13) Rollback Strategy (migrations, config versioning, blue/green)
**Repo work**
- Standardize rollback procedures around existing scripts:
  - `ops/scripts/rollback-service.sh`
  - `ops/scripts/rollback-migration.sh`
  - `ops/scripts/rollback-service-migration.sh`
  - `ops/scripts/deploy-blue-green.sh` and `deploy-canary.sh`
- Document rollback decision criteria and required approvals (security + ops).

### 14) Stakeholder Approval (sign-off packet)
**Repo work**
- Create a “production sign-off” template containing:
  - security scan outputs
  - headers verification outputs
  - load-test evidence
  - backup/restore drill evidence
  - RBAC snapshot
  - migration plan + rollback plan

---

## BIVA UI System + UI Dynamics (Critical Production Alignment)
The current Dynamic UI rendering path is split and can bypass allowlist enforcement in some hosts. Production deployment for BIVA should include:
- Enforce UI-OS/BIVA allowlists consistently at widget render time (page host and dashboard host).
- Remove cross-tier imports in shared widget maps (shared dynamic UI should not import product components).
- Replace stub widget loader behavior in the dashboard host so dashboards render reliably.

Primary code surfaces:
- Widget bootstrap: [platform runtime register-widgets.ts](file:///root/DOS-AIO/DOS%20Platform/platform/runtime/bootstrap/register-widgets.ts)
- Dynamic UI hosts: [DynamicPageHostComponent](file:///root/DOS-AIO/DOS%20Platform/modules/shared/dynamic-ui/components/dynamic-page-host.component.ts), [DynamicDashboardHostComponent](file:///root/DOS-AIO/DOS%20Platform/modules/shared/dynamic-ui/components/dynamic-dashboard-host.component.ts)
- Allowlist contract endpoint: [dynamic-ui-allowlist.routes.ts](file:///root/DOS-AIO/DOS%20Platform/platform/foundation/interface/http/dynamic-ui-allowlist.routes.ts)

---

## Files Likely to Change (Repo Work)
- platform/config-center/env/.env.example
- platform/config-center/env/.env.production.example
- platform/config-center/ops/scripts/validate-env.ts
- modules/packages/dos-service-bootstrap/src/validate-env.ts
- modules/packages/dos-db/src/config.ts (only if env var naming needs alignment; TLS enforcement already present)
- platform/config-center/ops/runbooks/deploy.md (extend with production evidence + BIVA specifics)
- platform/config-center/ops/docs/* (add production sign-off template + security/DR evidence checklists)
- modules/shared/dynamic-ui/** (allowlist enforcement + host unification) — only if included in this deployment slice

## Verification (How We Prove It Works)
**Static**
- `pnpm lint` (workspace)
- `pnpm typecheck` (workspace)
- `node platform/config-center/ops/scripts/validate-env.ts` (env template contract)
- `pnpm audit --audit-level=high` + optional Snyk if configured

**Service**
- Boot a staging-like stack and run:
  - `bash platform/config-center/ops/scripts/health-check-all.sh`
  - `bash platform/config-center/ops/scripts/load-test.sh`
  - `bash platform/config-center/ops/scripts/security-audit.mjs`

**Edge**
- Headers verification against nginx public URL (CSP/HSTS/frame protections) and TLS 1.3 scan results captured as release evidence.

