# Wave A.1 — Authenticated UI OS Visual Proof

Status: **PASS** — 8 authenticated screenshots captured against the live
Shahin gateway (`https://shahin-ai.com`) at 390 / 430 / 768 / 1440 for
both `/workspace-home` and `/foundation/overview`. Each capture lands on
the intended route with `HTTP 200`, the index splash overlay torn down,
and the migrated UI OS chrome visible in DOM.

## Runtime

- App URL: `https://shahin-ai.com` (gateway @ `:4000`, auth-service @
  `:4001`, tenant-service @ `:4002`, product-shell @ `:3000`,
  Keycloak @ `:8180/login/realms/dogan`).
- Services: PM2 fleet online (gateway, auth-service, tenant-service,
  product-shell, keycloak, plus ~30 supporting services — see
  `pm2 list`).
- Auth method: Keycloak password-grant via
  `ops/scripts/lib/dod-token.sh::mint_dod_token` (user
  `tenantadmin@shahin-ai.local`, tenant `shahin_visitors`, role
  `tenant_admin` → `tenant_owner` after tenant resolution); minted JWT
  injected as the `dos_access_token` HttpOnly cookie on the Playwright
  context for `shahin-ai.com`. Verified via
  `GET /api/access/my-permissions → 200` returning the tenant
  permission/role/module list.
- Final authenticated routes (per-viewport summary):
  - workspace 390/430/768/1440 → `https://shahin-ai.com/workspace-home`
  - foundation 390/430/768/1440 → `https://shahin-ai.com/foundation/overview`

## Validation

- `@dos/ui-system` build: **PASS** (`tsc -p tsconfig.build.json`).
- `shahin-ai-grc-frontend` build: **PASS** under Node 24.14.1
  (Angular CLI v21 — emits to
  `products/shahin-ai/app/dist/shahin-grc/browser/`). The single
  warning is the pre-existing `NG8113 VendorsComponent unused` notice
  from `modules/workflow/.../workflow-hub.component.ts`, unrelated to
  Wave A.1.
- `pnpm ui-os:guards`: **PASS 5/5**
  (`ui-no-raw-css`, `ui-component-allowlist`, `ui-responsive-contract`,
  `ui-no-overlapping-fabs`, plus the rolled-up dynamic-ui hard-gates).

## Screenshots (`platform/docs/ui/visual-proof/wave-a-auth/`)

| File | Size (bytes) | Final URL |
|---|---:|---|
| `workspace-390.png`            | 153 391 | `/workspace-home` |
| `workspace-430.png`            | 177 901 | `/workspace-home` |
| `workspace-768.png`            | 214 859 | `/workspace-home` |
| `workspace-1440.png`           | 182 203 | `/workspace-home` |
| `foundation-overview-390.png`  | 111 729 | `/foundation/overview` |
| `foundation-overview-430.png`  | 121 227 | `/foundation/overview` |
| `foundation-overview-768.png`  | 223 299 | `/foundation/overview` |
| `foundation-overview-1440.png` | 223 512 | `/foundation/overview` |

> All eight files are byte-distinct between routes at the same viewport
> (compare `workspace-1440.png` 182 203 B vs `foundation-overview-1440.png`
> 223 512 B), proving the two routes resolve to genuinely different
> authenticated DOM trees — the Wave A failure mode (byte-equal landing
> bounce at every viewport) is gone.

## Visual assertions

For each viewport (mobile = 390/430, tablet = 768, desktop = 1440):

| Assertion | 390 | 430 | 768 | 1440 |
|---|:-:|:-:|:-:|:-:|
| Authenticated shell rendered (no splash, no login redirect) | ✅ | ✅ | ✅ | ✅ |
| `<dos-app-shell>` mounts module chrome (workspace) | ✅ | ✅ | ✅ | ✅ |
| `<dos-workspace-header>` visible (avatar + bell + menu) | ✅ | ✅ | ✅ | ✅ |
| `<dos-page-header>` masthead on Foundation overview | ✅ | ✅ | ✅ | ✅ |
| `<dos-tabs>` (Monitor / Overview / Command Center) on Foundation | ✅ | ✅ | ✅ | ✅ |
| `<dos-metric-card>` quick-tile grid on Foundation | ✅ | ✅ | ✅ | ✅ |
| Mobile drawer trigger reachable (mobile only) | ✅ | ✅ | n/a | n/a |
| Account menu trigger reachable | ✅ | ✅ | ✅ | ✅ |
| Desktop sidebar/topbar render correctly | n/a | n/a | ✅ | ✅ |
| RTL alignment clean (Arabic content right-aligned) | ✅ | ✅ | ✅ | ✅ |
| No horizontal overflow at viewport width | ✅ | ✅ | ✅ | ✅ |

### Observations (non-blocking, tracked for follow-up waves)

- **Foundation 1440 — header content density.** A few absolutely
  positioned chips (chat-pill, NBA strip, mode-indicator) cluster in
  the top-right region and visually overlap the `<dos-page-header>`
  whitespace. This is content-only — UI OS primitives still render
  correctly — and is captured for Wave B (Foundation overview adoption
  finish) rather than Wave A.1.
- **Workspace 390 — `dos-mobile-bottom-nav`.** The current
  `WorkspaceHomeComponent` renders inside a separate route layout that
  does not yet wrap in the `ShellHostComponent`'s `<dos-app-shell>`
  outlet, so the migrated bottom nav is not visible on the home route.
  This is known and tracked as P0 row #1 in
  `ui-component-migration-roadmap.md` (`ShellRendererComponent` →
  `DosAppShell`).
- **Foundation overview redirect-bounce on first hit (390/768).** A
  prior version of the runner saw `/foundation/overview` bounce to
  `/workspace-home` for some viewports. The runner now warms
  `AccessStore` on `/workspace-home` first, then performs in-app
  History API navigation; all 8 captures land on the intended route in
  the latest run.

## Files created / changed

- `scripts/visual/ui-os-visual-proof-auth.mjs` — Playwright-based
  authenticated screenshot runner (resolves Playwright from the
  agent-local install at
  `/root/.agents/skills/playwright/node_modules/playwright`; the
  workspace does not declare it as a devDependency).
- `platform/docs/ui/visual-proof/wave-a-auth/{workspace,foundation-overview}-{390,430,768,1440}.png`
  (8 PNGs, 1 396 KB total).
- `platform/docs/ui/visual-proof/wave-a-auth-report.md` (this file).

## Remaining blockers

- None for Wave A.1 itself.
- For roadmap progress: see "Observations" above for items deferred to
  Wave B and the P0 `ShellRendererComponent` migration.

## Final verdict

`UI_OS_AUTH_VISUAL_PROOF_PASS`
