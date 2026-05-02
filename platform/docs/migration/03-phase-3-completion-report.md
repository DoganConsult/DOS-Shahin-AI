# Phase 3 — Platform Module Promotions + 4D Manifest Standardization

**Status:** ✅ COMPLETE
**Commit:** `50f425f6 phase-3: promote 6 platform modules + standardize 4D manifests`
**Date:** 2026-04-29

---

## 1. Scope

Phase 3 delivered the **physical promotion** of platform-layer modules from
their legacy `* Module/` (and `modules/foundation/`) locations into the
canonical `platform/<x>/` namespace, plus a **schema standardization pass**
on the 4D platform-module manifests (DAuth, DOS, DSOC, DNOC) which had
been authored against a pre-v1 manifest shape.

AI-OS was **explicitly deferred** to Phase 5+ due to upstream structural
issues (flattened `_sources/`, malformed filename, internal `productCode`
mismatch). See `platform/ai/README.md` for the deferral note.

---

## 2. Move Table

| Legacy Path                        | New Canonical Path        | Type           | Notes                              |
| ---------------------------------- | ------------------------- | -------------- | ---------------------------------- |
| `DAuth Module/`                    | `platform/dauth/`         | `git mv`       | 1,200+ files renamed, history kept |
| `DOS Module/`                      | `platform/dos/`           | `git mv`       | History kept                       |
| `DSOC Module/`                     | `platform/dsoc/`          | `git mv`       | History kept                       |
| `DNOC Module/`                     | `platform/dnoc/`          | `git mv`       | History kept                       |
| `Dynamic UI Module/`               | `platform/dynamic-ui/`    | `git mv`       | History kept                       |
| `modules/foundation/`              | `platform/foundation/`    | `git mv`       | History kept                       |
| `AI-OS Module/`                    | _(deferred)_              | n/a            | Phase 5+; see `platform/ai/README.md` |

### Phase 3.5 — Manifest Standardization (4D)

| Legacy Manifest (now quarantined)                        | Canonical Replacement                  | Quarantine Register |
| -------------------------------------------------------- | -------------------------------------- | ------------------- |
| `platform/dauth/manifest/platform-module.manifest.json`  | `platform/dauth/module.manifest.json`  | `Q3.5-001`          |
| `platform/dos/manifest/platform-module.manifest.json`    | `platform/dos/module.manifest.json`    | `Q3.5-002`          |
| `platform/dsoc/manifest/platform-module.manifest.json`   | `platform/dsoc/module.manifest.json`   | `Q3.5-003`          |
| `platform/dnoc/manifest/platform-module.manifest.json`   | `platform/dnoc/module.manifest.json`   | `Q3.5-004`          |

**Standardization rule applied:**
- Required top-level: `kind: "platform"`, `lifecycle.stage`, `name`, `version`, `slug`, `manifestVersion`.
- All previously rich content (schemas, events, routes, security,
  observability, ports, API, etc.) preserved verbatim under `metadata.*`.
- `metadata.previousManifest` field documents the legacy path for audit.

### Other normalizations

| File                                       | Change                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `platform/dynamic-ui/module.manifest.json` | `kind: "platform-resolver"` → `"platform"`; added `lifecycle`; rich metadata moved into `metadata.*`. |

### Quarantined stray files

| Legacy Path                                                 | New Path                                                  | Register ID |
| ----------------------------------------------------------- | --------------------------------------------------------- | ----------- |
| `AI-OS Module/Yes — for **AI-OS Module**, the instruct`     | `_quarantine/stray-files/ai-os-module-stray-paste.txt`    | `Q3-S001`   |

---

## 3. Validator Status

| Metric                | Before Phase 3 | After Phase 3 |
| --------------------- | -------------- | ------------- |
| Total manifests       | 1 module + 1 product | 6 modules + 31 services + 1 product (43 total) |
| Platform modules validated | 1 (foundation) | 6 (foundation + dauth + dos + dsoc + dnoc + dynamic-ui) |
| Errors                | 0              | 0             |
| Warnings              | 1 (transitional) | 9 (transitional, all Phase 5 promotions awaiting business-module move) |

The validator now scans `platform/<x>/services/<svc>/` in addition to
`services/<svc>/`. The `PENDING_SERVICE_PROMOTIONS` allow-list converts
expected-missing service manifests into warnings (not errors) so the
build stays green during the phased migration.

### Warnings (all expected, all Phase 5)

```
- workflow-service           awaiting promotion (Workflow Module/)
- ai-gateway-service         awaiting promotion (AI-OS Module/_sources/, deferred)
- onboarding-service         awaiting promotion (Onboarding Module/)
- compliance-controls-service awaiting promotion (Compliance Module/)
- ai-engine-service          awaiting promotion (AI-OS Module/_sources/, deferred)
- bcp-service                awaiting promotion (BCP Module/)
- ai-governance-service      awaiting promotion (AI-OS Module/_sources/, deferred)
- qiyas-journey-service      awaiting promotion (Qiyas Module/)
- vendor-service             awaiting promotion (Vendor Module/)
```

---

## 4. Reference Updates (Active Code)

| File                                                       | Change                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `tsconfig.base.json`                                       | `@dos/dauth-shared` → `platform/dauth/packages/shared/src/index.ts`   |
| `package.json`                                             | `build`/`build:services` filters now use `./platform/dauth/services/*` |
| `pnpm-workspace.yaml`                                      | 9 entries updated to new `platform/` paths                            |
| `products/shahin-ai/app/tsconfig.json`                     | `@foundation-module/ui`, `@dynamic-ui-module/ui` → `platform/...` paths |
| `products/shahin-ai/app/vitest.config.ts`                  | Same alias updates                                                    |
| `ops/ecosystem.all.config.js`                              | `auth-service` `cwd` + comment updated                                |
| `services/gateway/src/middleware/gateway-origin.ts`        | "MIRROR" comment → `platform/dauth/packages/shared/...`               |
| `services/gateway/src/middleware/decision-ledger.ts`       | "mirrors" comment → `platform/dauth/packages/shared/audit/...`        |
| `services/tenant-service/src/middleware/gateway-origin.ts` | Same MIRROR comment update                                            |
| `.dependency-cruiser.cjs`                                  | Canonical-path comment + `metadata.consumes` accessor                 |
| `platform/dauth/migrations/__tests__/schema-references.test.ts` | Reads from new manifest path; uses `metadata.schemas.shared.tables`     |
| `platform/dauth/migrations/__tests__/platform-dauth-schema.test.ts` | Same accessor updates                                                |
| `platform/dauth/module.manifest.json`                      | Typo fix: `**/*.test.test.ts` → `**/*.test.ts` in `vitestWiring`     |

### Documentation updates

| File                                                              | Change                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `platform/{dauth,dos,dsoc,dnoc}/README.md`                        | New layout + standardization note pointing at canonical manifest |
| `platform/dauth/packages/core/AS-BUILT.md`                        | Manifest entry updated to canonical path                        |
| `platform/dauth/docs/G8-SCHEMA-MIGRATION.md`                      | `schemas.dedicated` reference → `metadata.schemas.dedicated`    |
| `docs/company-knowledge-pack/{02,03,05,MASTER}.md`                | "POST-RESTRUCTURE NOTE" banner; pre-3.5 inventory snapshot context |
| `platform/ai/README.md`                                           | AI-OS deferral rationale documented                             |

---

## 5. Acceptable Remaining References

The following stale-reference hits are **intentional** and were not
modified in Phase 3:

| File / Pattern                                            | Why intentional                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm-lock.yaml` (numerous `link:../../../DAuth Module/...`) | Auto-generated; will be regenerated by `pnpm install` in Phase 7 |
| `newmait/RESTRUCTURE_PLAN.md`                             | Historical migration plan (predates restructure)                 |
| `platform/docs/migration/00-current-state-*.md`           | Baseline snapshot doc; intentional historical record             |
| `platform/docs/migration/02-final-move-map.{md,json}`     | Migration map, references source paths by design                 |
| `platform/docs/migration/01-final-inventory.{md,_reports/json}` | Pre-restructure inventory                                       |
| `scripts/restructure/02-build-move-map.mjs`               | The script that **produced** the move map                        |
| `Compliance Module/AGENT-MEMORY.md`                       | Inside an unmoved business module (Phase 5 will address)         |
| `docs/company-knowledge-pack/*.md`                        | Already have POST-RESTRUCTURE banners                            |

---

## 6. Rollback

Per-module rollback (each is an isolated `git mv`):

```bash
# Roll back individual platform module
git mv platform/dauth      "DAuth Module"
git mv platform/dos        "DOS Module"
git mv platform/dsoc       "DSOC Module"
git mv platform/dnoc       "DNOC Module"
git mv platform/dynamic-ui "Dynamic UI Module"
git mv platform/foundation modules/foundation

# Roll back legacy 4D manifest standardization
git mv _quarantine/legacy-manifests/dauth/platform-module.manifest.json \
       platform/dauth/manifest/platform-module.manifest.json
git mv _quarantine/legacy-manifests/dos/platform-module.manifest.json \
       platform/dos/manifest/platform-module.manifest.json
git mv _quarantine/legacy-manifests/dsoc/platform-module.manifest.json \
       platform/dsoc/manifest/platform-module.manifest.json
git mv _quarantine/legacy-manifests/dnoc/platform-module.manifest.json \
       platform/dnoc/manifest/platform-module.manifest.json

# Then delete the canonical replacements
rm platform/{dauth,dos,dsoc,dnoc}/module.manifest.json
```

Full Phase 3 rollback is also achievable via:

```bash
git revert 50f425f6
```

---

## 7. Verification

```
$ node scripts/validate-manifests.mjs
Manifest validation warnings: 9 (all transitional, all Phase 5)
Validated 43 manifest files.
  modules:  6 (modules/ + platform/)
  services: 31
  products: 1
  warnings: 9 (non-blocking, transitional)
$ echo $?
0
```

---

## 8. Next

Phase 4A: promote Shahin-AI website (`Shahin-AI Website/` →
`products/shahin-ai/website/`) so the product is split between
`products/shahin-ai/app/` (SPA) and `products/shahin-ai/website/`
(marketing/landing).
