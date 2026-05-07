# Workspace Shell Readiness Gate

- Repo: `/root/DOS-Platform`
- Enforce: `true`
- Seed keys: `67`
- DB approved keys: `67`
- Binding rows: `2948`
- Binding tenants: `44`
- Files scanned: `9109`
- Hardcoded literals: `89`
- Failures: `0`
- Warnings: `1`

## Envelope tables

- `ui_workspace_chrome`: rows=2070, tenants=44, missingTenants=0
- `ui_workspace_shortcut`: rows=324, tenants=43, missingTenants=0
- `ui_workspace_banner`: rows=117, tenants=39, missingTenants=0
- `ui_workspace_policy`: rows=248, tenants=43, missingTenants=0

## Failures

- None

## Warnings

- **perm-filter** — server-side permission filter not enforced by this run; set WORKSPACE_SHELL_REQUIRE_PERM_FILTER=1 for production cutover Gate B

## Literal samples

- `modules/compliance/_inbound/packs-package/ports/platform.ts:182:5` — `workspace.created`
- `modules/compliance/_inbound/packs-package/ports/platform.ts:183:5` — `workspace.archived`
- `modules/compliance/interface/http/workspaces.routes.ts:55:34` — `workspace.workspace.read`
- `modules/compliance/interface/http/workspaces.routes.ts:77:34` — `workspace.workspace.read`
- `modules/compliance/interface/http/workspaces.routes.ts:94:34` — `workspace.workspace.write`
- `modules/compliance/interface/http/workspaces.routes.ts:108:41` — `workspace.create`
- `modules/compliance/interface/http/workspaces.routes.ts:126:34` — `workspace.workspace.write`
- `modules/compliance/interface/http/workspaces.routes.ts:141:41` — `workspace.status`
- `modules/compliance/interface/http/workspaces.routes.ts:158:34` — `workspace.workspace.write`
- `modules/compliance/interface/http/workspaces.routes.ts:171:41` — `workspace.delete`
- `modules/compliance/tests/integration/workspaces-vertical.test.mjs:142:49` — `workspace.create`
- `modules/packages/dos-contracts/src/events/journey-v1.d.ts:188:29` — `workspace.ready`
- `modules/packages/dos-contracts/src/events/journey-v1.d.ts:197:17` — `workspace.ready`
- `modules/packages/dos-contracts/src/events/journey-v1.d.ts:204:17` — `workspace.ready`
- `modules/packages/dos-contracts/src/events/journey-v1.d.ts:398:29` — `workspace.ready`
- `modules/packages/dos-contracts/src/events/journey-v1.d.ts:407:17` — `workspace.ready`
- `modules/packages/dos-contracts/src/events/journey-v1.d.ts:414:17` — `workspace.ready`
- `modules/packages/dos-contracts/src/events/journey-v1.js:83:32` — `workspace.ready`
- `modules/packages/dos-contracts/src/events/journey-v1.ts:94:24` — `workspace.ready`
- `modules/packages/dos-platform-core/src/settings/unified-config.service.js:201:13` — `workspace.strict_mode`
- `modules/packages/dos-platform-core/src/settings/unified-config.service.ts:254:7` — `workspace.strict_mode`
- `modules/packages/dos-types/src/platform.d.ts:122:656` — `workspace.created`
- `modules/packages/dos-types/src/platform.d.ts:122:678` — `workspace.archived`
- `modules/packages/dos-types/src/platform.ts:182:5` — `workspace.created`
- `modules/packages/dos-types/src/platform.ts:183:5` — `workspace.archived`
- `modules/packages/modules/agrc-engine/ports/platform.ts:182:5` — `workspace.created`
- `modules/packages/modules/agrc-engine/ports/platform.ts:183:5` — `workspace.archived`
- `modules/packages/modules/provisioning/provisioning.controller.js:135:29` — `workspace.provision`
- `modules/packages/modules/provisioning/provisioning.controller.ts:153:23` — `workspace.provision`
- `modules/packages/shahin-product/src/agrc-events.ts:68:3` — `workspace.preview.generated`
- `modules/packages/shahin-product/src/agrc-events.ts:70:3` — `workspace.activated`
- `modules/packages/shahin-product/src/agrc-routes.ts:42:63` — `workspace.config.read`
- `modules/packages/shahin-product/src/agrc-routes.ts:43:60` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:4:97` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:5:101` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:6:113` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:7:105` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:8:109` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:9:115` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:10:113` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:11:113` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:12:119` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:41:3` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:49:5` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:55:5` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:67:5` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:80:5` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:89:5` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:98:5` — `workspace.config.read`
- `modules/packages/shahin-product/src/product-config/agrc-nav.ts:105:5` — `workspace.config.read`
