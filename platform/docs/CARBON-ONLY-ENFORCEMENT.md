# Carbon-only enforcement stack

**7 layers of defence keeping non-IBM-Carbon UI out of the running app.**
Each layer catches violations at a different lifecycle stage; together they
make it impossible for a non-Carbon component to be authored, registered,
served, bundled, defined, resolved, or rendered.

| # | Layer | Stage | Artefact | What it catches |
|---|---|---|---|---|
| 1 | DB triggers | Write time | `platform/dos/migrations/public/20260502_0400_carbon_only_runtime_trigger.sql` | INSERT/UPDATE of non-IBM rows in catalog or runtime registry — rejected with `CARBON-ONLY:` error |
| 2 | Server resolver | Request time | `platform/foundation/interface/http/dynamic-ui-allowlist.routes.ts` | `/api/foundation/dynamic-ui/allowlist` returns ONLY IBM-Carbon-vendor + approved + non-blocked rows; SPA never sees bad rows |
| 3 | ESLint rule | Author time | `eslint.config.js` (`no-restricted-imports`) | Direct imports of `primeng`, `@angular/material`, kendo, syncfusion, ng-zorro, ionic, clarity, taiga, `@carbon/ibm-products` (React) — fails lint |
| 4 | Bundle scan | Build time | `platform/ui-system/dos-ui-system/scripts/post-build-carbon-only.mjs` | Banned vendor strings in emitted JS — fails post-build script with exit 1 |
| 5 | WC registry patrol | Boot time | `platform/ui-system/dos-ui-system/src/carbon/wc-registry-allowlist.ts` | `customElements.define()` calls for elements not prefixed `cds-` or `c4p-` — throws |
| 6 | Client guard | Render time | `platform/config-center/shared/dynamic-ui/services/carbon-allowlist.guard.ts` | `verify(componentKey)` throws if key not in server allowlist; pre-load / load-error => fail-closed |
| 7 | Boot probe | Service start | `platform/foundation/application/bootstrap/carbon-only-boot-probe.ts` | Catalog non-IBM rows, registry pointing at non-IBM, blocked rows with `dynamic_ui_allowed=true` — refuses to boot |

## How they compose

```
Author types  `import { Button } from 'primeng/button'`
        │
        ├─► Layer 3 (ESLint): rejects in PR.
        │
   if merged anyway:
        │
        ├─► Layer 4 (bundle scan): post-build script exits 1, CI fails.
        │
   if shipped anyway:
        │
        ├─► Layer 5 (WC patrol): if PrimeNG ever registers a custom element, throws at boot.
        │
        ├─► Layer 7 (boot probe): catalog/registry drift => refuse to start.
        │
        ├─► Layer 1 (DB triggers): no bad row can be written into the catalog or runtime registry.
        │
        ├─► Layer 2 (server resolver): even if a bad row existed, the SPA never receives it.
        │
        └─► Layer 6 (client guard): even if the SPA somehow had a banned key, verify() throws before render.
```

## Verifying live state

```bash
# Layer 1 — trigger smoke (must throw):
PGPASSWORD=$DOS_MIGRATOR_PASS psql -h localhost -U dos_migrator -d shahin_grc -c "
INSERT INTO dos.dynamic_ui_component_registry (component_key, vendor, approval_status, carbon_key)
  VALUES ('__test__', 'custom', 'unapproved', NULL);"

# Layer 2 — fetch the live allowlist:
curl -s --cookie "$AUTH_COOKIE" https://shahin.dogan-ai.com/api/foundation/dynamic-ui/allowlist | jq '.count'

# Layer 2b — drift sentinel:
curl -i --cookie "$AUTH_COOKIE" https://shahin.dogan-ai.com/api/foundation/dynamic-ui/allowlist/_health
# 200 = clean, 503 = drift detected.

# Layer 3 — lint a candidate import:
echo "import 'primeng/button'" | tee /tmp/x.ts && npx eslint /tmp/x.ts

# Layer 4 — scan a built dist:
node platform/ui-system/dos-ui-system/scripts/post-build-carbon-only.mjs products/shahin-ai/app/dist

# Layer 7 — query the same invariants the probe checks:
psql -c "SELECT
  (SELECT COUNT(*) FROM dos.ui_carbon_components WHERE vendor<>'ibm-carbon')                                   AS non_ibm_catalog,
  (SELECT COUNT(*) FROM dos.dynamic_ui_component_registry r JOIN dos.ui_carbon_components c USING(carbon_key)
     WHERE r.approval_status='approved' AND c.vendor<>'ibm-carbon')                                            AS bad_links,
  (SELECT COUNT(*) FROM dos.ui_carbon_components
     WHERE runtime_status IN ('blocked-react-only','catalog-only','missing-upstream-angular-binding')
       AND dynamic_ui_allowed=true)                                                                            AS blocked_allowed;"
# All three must be 0.
```

## Wiring checklist (for hosts integrating Foundation)

| Layer | Wire-in step |
|---|---|
| 1 | Apply migration `20260502_0400` once. Trigger persists thereafter. |
| 2 | Mounted automatically by `registerFoundation()` aggregator at `/api/foundation/dynamic-ui/allowlist`. |
| 3 | Active repo-wide via root `eslint.config.js`; CI runs `pnpm lint`. |
| 4 | Add to product app `package.json`: `"postbuild": "node ../../platform/ui-system/dos-ui-system/scripts/post-build-carbon-only.mjs dist"`. |
| 5 | In the product's `main.ts` BEFORE any Carbon WC import: `import { armCarbonOnlyCustomElementRegistry } from '@dos/ui-system/carbon'; armCarbonOnlyCustomElementRegistry();` |
| 6 | Inject `CarbonAllowlistGuard` from `@dos/config-center/dynamic-ui`; call `.load()` in `APP_INITIALIZER`; call `.verify(key)` from every dynamic component resolver before rendering. |
| 7 | Runs automatically inside `onActivate()` of Foundation's lifecycle hooks; throws block service startup. |

## Adding a new allowed Carbon row

1. Insert into `dos.ui_carbon_components` via a migration. Trigger validates `vendor='ibm-carbon'` and `package_name LIKE '@carbon/%'` or `'carbon-components-angular'`.
2. If the row should be runtime-resolvable, also insert into `dos.dynamic_ui_component_registry` with:
   - `vendor='ibm-carbon'`
   - `approval_status='approved'`
   - `carbon_key` referencing the catalog row
3. Layer 1 trigger validates the link is to a non-blocked catalog row before the INSERT commits.
4. Restart Foundation service. Layer 7 boot probe verifies the new row is consistent.
5. SPA `CarbonAllowlistGuard.load()` picks up the new key on next bootstrap (or call `.load()` again to refresh).

## Removing a vendor exception

Layers 3 + 4 carry the static vendor allowlists. To add or remove a vendor
prefix, edit:
- `eslint.config.js` (root) — `no-restricted-imports.patterns`
- `platform/ui-system/dos-ui-system/scripts/post-build-carbon-only.mjs` — `BANNED` array
- `platform/ui-system/dos-ui-system/src/carbon/wc-registry-allowlist.ts` — `ALLOWED_WC_PREFIXES`

These are intentionally kept in code (not DB) so a vendor change requires a
PR and a code review trail.
