# Wave A — UI OS Visual Proof

Status: **PARTIAL** — captures produced for all 8 viewports but the two
target routes redirect to the unauthenticated landing because the local
runner has no backend services / DAuth session running. Screenshot bytes
are identical between `workspace` and `foundation-overview` at the same
viewport, confirming both routes resolve to the same pre-auth shell.

## Validation

- `@dos/ui-system` build: **PASS**
- `shahin-ai-grc-frontend` build: PASS (existing dist at
  `products/shahin-ai/app/dist/shahin-grc/browser/index.html`,
  built 2026-04-30 16:13:56 — under Node 24.14.1 per Wave 2.1)
- `pnpm ui-os:guards`: **PASS 5/5**

## Runner

- Dev/preview server: `python3 -m http.server 8765` against
  `products/shahin-ai/app/dist/shahin-grc/browser` (static dist preview).
  No Angular dev server invoked because the backend services
  (`gateway`, `auth-service`, `tenant-service`, DAuth) are not running
  in this environment, so `ng serve` would render the same pre-auth
  state.
- Browser: `/usr/bin/google-chrome` v147.0.7727.116 in `--headless=new`
  mode driven by `scripts/visual/ui-os-visual-proof.mjs`.
- Auth/session method: **none** — the SPA's `AccessStore.load()` calls
  `/api/access/my-permissions` and receives a connection error / 401
  because no backend is reachable; the route resolver consequently
  hands control to the unauthenticated landing.

## Screenshots

Saved under `platform/docs/ui/visual-proof/wave-a/`:

- `workspace-390.png` (14 531 bytes)
- `workspace-430.png` (14 776 bytes)
- `workspace-768.png` (17 569 bytes)
- `workspace-1440.png` (19 675 bytes)
- `foundation-overview-390.png` (14 531 bytes)
- `foundation-overview-430.png` (14 776 bytes)
- `foundation-overview-768.png` (17 569 bytes)
- `foundation-overview-1440.png` (19 675 bytes)

> The byte-for-byte equality between `workspace-*` and
> `foundation-overview-*` at the same viewport is the proof that both
> routes currently render the same pre-auth surface. The migrated
> `<dos-app-shell>` chrome and Foundation overview `<dos-page-header>` /
> `<dos-tabs>` / `<dos-responsive-grid>` / `<dos-metric-card>` are NOT
> visible in these captures because they sit behind the auth gate.

## Findings (against the Wave A acceptance checklist)

For the static pre-auth surface that was actually captured:

- horizontal overflow: none observed at any viewport
- clipped titles: n/a (pre-auth landing only)
- account menu: not rendered (auth-gated)
- bottom nav: not rendered (auth-gated)
- drawer: not rendered (auth-gated)
- tabs: not rendered (auth-gated)
- command bar: not rendered (auth-gated)
- metric cards: not rendered (auth-gated)
- desktop sidebar/topbar: not rendered (auth-gated)
- RTL: HTML root ships `<html lang="ar" dir="rtl">` — RTL direction
  applied at document level

## Files created

- `scripts/visual/ui-os-visual-proof.mjs` — minimal headless-Chrome
  screenshot runner
- `platform/docs/ui/visual-proof/wave-a/{workspace,foundation-overview}-{390,430,768,1440}.png`
- `platform/docs/ui/visual-proof/wave-a-report.md` (this file)

## Remaining blockers

- **Auth/session blocker.** The runtime SPA cannot reach `/api/access/my-permissions` or any other gateway endpoint in this environment. To unblock authenticated visual proof, the next runner must:
  1. Bring up the platform fleet with `pnpm boot` (PM2 ecosystem
     `ops/ecosystem.platform.config.js`) or at minimum the
     `gateway` + `auth-service` + `tenant-service` + `dauth` trio on
     their canonical ports (`ops/ports.allocation.json`).
  2. Acquire a tenant session (DAuth login as a Shahin tenant user with
     `foundation.read`).
  3. Re-run `node scripts/visual/ui-os-visual-proof.mjs` with
     `BASE_URL` pointing at the gateway-fronted SPA URL (e.g.
     `https://shahin.local`) and a `--cookie` injection added to the
     runner, OR substitute headless-Chrome with Playwright + a
     `storageState.json` produced from the login flow.
- **Playwright not installed at workspace level.** Only system caches
  exist (`/root/.npm/_npx/.../playwright`, `/root/.agents/skills/playwright`).
  Adding `playwright` as a workspace devDep is the canonical fix and
  enables `storageState`-based authenticated capture.
- **DBus warnings from headless Chrome** are harmless in this sandbox
  but indicate the absence of a real desktop session; not a blocker.

## Final verdict

`UI_OS_VISUAL_PROOF_PARTIAL` — captures exist for all 8 required viewports
but they show the unauthenticated landing only. The migrated UI OS chrome
(workspace shell + Foundation overview) is not visible without an
authenticated session against a running backend.

## Next recommendation

Bring up the backend trio (`gateway` + `auth-service` + `tenant-service`)
with seeded Shahin tenant + a DAuth-enabled foundation tester, then
re-run `scripts/visual/ui-os-visual-proof.mjs` with cookie/auth state.
Only after that re-capture passes acceptance can Wave A flip to
`UI_OS_VISUAL_PROOF_PASS`.
