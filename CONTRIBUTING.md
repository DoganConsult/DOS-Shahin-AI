# Contributing to Dogan AI OS (DOS)

Thank you for contributing to the Shahin AGRC Platform. This document
is the entry point for anyone making changes to this repository:
Dogan Consult employees, contractors, design-partner contributors, and
authorised third parties.

If you are a security researcher looking for how to report a
vulnerability, stop here and read [`/SECURITY.md`](./SECURITY.md)
instead.

---

## 1. Ground rules

- This is **proprietary commercial software**. See [`/LICENSE`](./LICENSE)
  for the licence that governs your access. Do not share code, screenshots,
  customer names, or tenant data outside the scope of your agreement with
  Dogan Consult.
- Every change goes through a pull request reviewed by the file's
  [`CODEOWNERS`](./CODEOWNERS). No direct pushes to `main` or `develop`.
- Every production-impacting change requires:
  1. A passing CI run (`.github/workflows/ci.yml`).
  2. Approval from at least one CODEOWNER of every file touched.
  3. A clear, single-purpose commit message (see § 4).
  4. A reference to the relevant Production Readiness Review
     (`docs/certifications/prr-*.md`) or Architecture Decision Record
     (`ops/docs/ADR/`) where applicable.

## 2. Repository layout

```
packages/            16 shared @dos/* packages (service bootstrap, auth,
                     module SDK, contracts, types, platform core,
                     event backbone, runtime config, …)
services/            36 active microservices (+2 templates)
modules/             54 domain modules (53 with module.manifest.json)
platform-modules/    6 platform modules
frontend/
  shell/             Angular 19 micro-frontend host
  shared-ui/         shared TypeScript lib
  products/shahin/   Angular 21.2 + Capacitor 8 product SPA
products/shahin/     product-level seed data
ops/
  ecosystem.*.js     PM2 configs (ops/ecosystem.all.config.js is the
                     authoritative fleet manifest)
  migrations/        root + tenant-template SQL
  monitoring/        Prometheus, Alertmanager, Loki, Vector, Grafana
  nginx/             generated reverse-proxy configs
  normalization/     drift-baseline pipeline
  runbooks/          operational runbooks
  docs/ADR/          Architecture Decision Records
docs/
  architecture/      platform-wide decisions (DAuth, rollback drills)
  certifications/    milestone dossiers + Production Readiness Reviews
  evidence/          per-phase exit-gate proofs
  operations/        upgrade notes, roadmap execution
  releases/          release docs (evidence matrix, audit triage,
                     change control, follow-up tracker, …)
  roadmap/           forward-looking plans
```

## 3. Branching and pull requests

### Branch model

| Purpose | Pattern | Example |
| --- | --- | --- |
| Feature or refactor | `feat/<scope>-<short-desc>` | `feat/gateway-security-disclosure` |
| Bug fix | `fix/<scope>-<short-desc>` | `fix/workflow-temporal-retry` |
| Chore / tooling | `chore/<short-desc>` | `chore/deps-zod-bump` |
| Docs-only | `docs/<short-desc>` | `docs/update-release-matrix` |
| Release hardening | `release/<version>-<scope>` | `release/v1.0.1-hotfix-top5` |
| Automated / AI-assisted reviews | `claude/<short-desc>-<ticket>` | `claude/db-normalization-review-16GUv` |

### Pull-request checklist

Before requesting review, confirm:

- [ ] `pnpm lint` passes with zero warnings.
- [ ] Affected service(s) build: `pnpm --filter <service> run build`.
- [ ] Touched TypeScript typechecks cleanly:
      `node ops/scripts/typecheck-service.mjs <service>` or
      `pnpm run typecheck:modules`.
- [ ] `pnpm test:unit` covers the changed code paths, and new tests
      are added for any behaviour change.
- [ ] Database changes are shipped as additive, idempotent migrations
      under `services/<svc>/migrations/` or `ops/migrations/`, each
      using `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … IF NOT EXISTS`,
      or the equivalent guarded statement.
- [ ] Any new HTTP input is Zod-validated in
      `services/<svc>/src/schemas/*.schemas.ts`; any new domain entity
      has a typed contract in `packages/dos-contracts` or
      `packages/dos-types`.
- [ ] Any new event type is declared in
      `packages/shahin-product/src/agrc-events.ts` and subscribed
      to in `agrc-event-subscribers.ts` where appropriate.
- [ ] Any new env var is added to `platform/config-center/env/.env.example` AND to
      `packages/dos-service-bootstrap/src/validate-env.ts` with a
      required/optional flag, description, and validator where
      appropriate.
- [ ] Any new service ships `service.manifest.json` declaring
      `serviceCode`, `displayName`, `layer`, `ownerTeam`, `runtime`,
      `dependsOn`, `modules`, and `exposes.apiBase`.
- [ ] Any new module ships `module.manifest.json` declaring
      `moduleCode`, `ownerTeam`, `productCode`, `platformDependencies`,
      and `ownedTables`.
- [ ] `CODEOWNERS` is updated if the owning team changes.
- [ ] If the change touches a customer-facing surface, the Release
      Evidence Matrix (`docs/releases/RELEASE-EVIDENCE-MATRIX.md`) is
      updated for the affected capability.

### AI-assisted contributions

AI-assisted contributions are permitted and currently account for a
non-trivial share of engineering output on this platform. When you use
an AI pair-programmer:

- Commit only code you have read, understood, and tested yourself.
- Never commit AI-generated secrets, API keys, or fabricated citations.
- If the AI agent created the PR, use the `claude/<desc>-<ticket>` branch
  pattern so reviewers can tell at a glance.
- Read [`AGENTS.md`](./AGENTS.md) for the operating guardrails the
  agent itself is expected to follow.

## 4. Commit messages

We follow a Conventional-Commits-compatible style:

```
<type>(<scope>): <imperative summary ≤ 72 chars>

<optional body explaining WHY, not WHAT>

Refs: <issue / ticket / ADR / PRR>
```

Valid `<type>` values: `feat`, `fix`, `refactor`, `perf`, `test`,
`docs`, `chore`, `build`, `ci`, `revert`.

Valid `<scope>` values are service codes, package names, or workspace
folders: `gateway`, `auth-service`, `ai-engine`, `dos-service-bootstrap`,
`frontend-shahin`, `ops-monitoring`, `docs-releases`, etc.

Example:

```
feat(gateway): wire RFC 9116 security.txt + Zod-validated disclosure intake

Implements P0 of the enterprise-production-grade uplift plan:
- /.well-known/security.txt generated from env config
- POST /api/public/security/disclosures with Zod schema
- service-bootstrap validate-env rules for SECURITY_* vars
- new tests covering schema + route
- Angular /security public page (EN + AR)

Refs: docs/security/README.md
```

## 5. Tests

- Unit tests: Vitest (11 configs at repo root; `vitest.config.mts` is
  the default). Run with `pnpm test:unit`.
- Contract tests: `vitest.contract.config.mts` / `vitest.contracts.config.mjs`.
- End-to-end: Playwright via `vitest.e2e.config.mts`.
- Coverage gate: `vitest.coverage.config.mts`.
- Security-focused tests: `vitest.security.config.mts`.
- Validation-layer tests: `vitest.validation.config.mts`.

Add tests adjacent to the code under test (`src/__tests__/*.test.ts`
for services and packages, or `*.spec.ts` colocated in Angular). Do
not skip or comment out failing tests; if a test is genuinely
waiting on an upstream fix, mark it `describe.skip` with a TODO that
references the tracking row in
`docs/releases/POST-RELEASE-FOLLOWUP-ITEMS.md`.

## 6. Secrets, PII, and configuration

- **Never** commit real secrets. The repository is scanned before every
  release (`docs/releases/PII-SCAN-TRIAGE-v1.0.0.md` records the last
  pass).
- All environment variables live in `platform/config-center/env/.env.example` with
  placeholder values (`CHANGE_ME_*`). Production values live only in
  the operator's secret store (Vault, AWS Secrets Manager, or the
  equivalent declared in your deployment's runbook).
- Env-var changes must be reflected in
  `packages/dos-service-bootstrap/src/validate-env.ts` so services
  refuse to boot with placeholder values.
- Customer data must never be copied into fixtures, tests, seeds, or
  issue/PR descriptions.

## 7. Dependencies

- Node: `>= 24.14.0` (see root `package.json:engines`).
- Package manager: `pnpm@10.33.0` (pinned via `packageManager`).
- Lockfile changes must be committed with the `package.json` change
  that caused them.
- Adding a new runtime dependency requires approval from the scope's
  CODEOWNER and a Security triage entry if it has known advisories at
  the time of addition (see `docs/releases/SECURITY-AUDIT-TRIAGE-v1.0.0.md`
  for the pattern).

## 8. Release process

- Release docs live in `docs/releases/`. The authoritative matrix is
  [`RELEASE-EVIDENCE-MATRIX.md`](./docs/releases/RELEASE-EVIDENCE-MATRIX.md).
- Tags follow `TAG-GOVERNANCE.md`.
- Change control is described in `POST-RELEASE-CHANGE-CONTROL.md`.
- Any regression identified after a tag is tracked in
  `POST-RELEASE-FOLLOWUP-ITEMS.md` with a P0 / P1 / P2 severity.

## 9. Code of conduct

By participating in this project you agree to uphold the standards in
[`/CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## 10. Getting help

- Platform questions: open a discussion with the owning team per
  `CODEOWNERS` or raise a draft PR with your question in the body.
- Security questions: [`/SECURITY.md`](./SECURITY.md).
- Operational issues: start from the relevant runbook in
  `ops/runbooks/` or `ops/docs/runbooks/`.

Thank you for keeping this platform production-grade.
