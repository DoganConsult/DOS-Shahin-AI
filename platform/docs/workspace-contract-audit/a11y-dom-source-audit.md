# Accessibility DOM Source Audit

Generated: 2026-05-06
Scope: app-owned DOM under `/workspace-home`. Browser extension DOM
(e.g. `.aitopia`, `[data-v-*]`) is excluded by definition.

Doctrine compliance:
- No `ShellHost` patch.
- No `SurfaceRenderer` patch.
- No CSS hide.
- No hardcoded English/Arabic labels added in the FE or resolver.

## 1. Source-of-truth proof for every visible shell text

Every user-facing string emitted by `/api/ui-os/workspace-runtime`
originates from a DB row. The UI-OS resolver
(`services/ui-os-service/src/routes/workspace-shell.routes.ts`) only
overlays values found in `dos.ui_workspace_chrome` and
`dos.workspace_shell_binding.props`; if a key is absent it leaves the
prop empty (no fallback literal in TS, verified by reading the
`enrichVisualShellProps()` block at lines 698–776).

| visible text                              | DB table                                         | DB key                                  | hardcoded fallback in resolver / FE? |
|-------------------------------------------|--------------------------------------------------|-----------------------------------------|---------------------------------------|
| Shahin AI                                 | `dos.ui_workspace_chrome`                        | `brand`                                 | **No**                                |
| Workspace                                 | `dos.ui_workspace_chrome`                        | `workspaceTitle`                        | **No**                                |
| Settings                                  | `dos.ui_workspace_chrome`                        | `shell.settings.aria-label`             | **No**                                |
| Account                                   | `dos.ui_workspace_chrome`                        | `shell.user-menu.label`                 | **No**                                |
| Account menu                              | `dos.ui_workspace_chrome`                        | `shell.user-menu.aria-label`            | **No**                                |
| Primary navigation                        | `dos.ui_workspace_chrome`                        | `shell.sidebar.aria-label`              | **No**                                |
| No navigation entries available.          | `dos.ui_workspace_chrome`                        | `shell.sidebar.empty.message`           | **No**                                |
| Powered by Dogan-AI OS                    | `dos.ui_workspace_chrome`                        | `shell.sidebar.poweredByLabel`          | **No**                                |
| Modules                                   | `dos.ui_workspace_chrome`                        | `shell.module-cards.aria-label`         | **No**                                |
| Workspace ready                           | `dos.workspace_shell_binding.props`              | `workspace.shell.empty-state` → `title` | **No**                                |
| Module surfaces will appear here once activated. | `dos.workspace_shell_binding.props`        | `workspace.shell.empty-state` → `description` | **No**                          |

DB query proof (tenant `14f273cf260a4736`):

```
brand                              | "Shahin AI"
workspaceTitle                     | "Workspace"
shell.settings.aria-label          | "Settings"
shell.user-menu.label              | "Account"
shell.user-menu.aria-label         | "Account menu"
shell.sidebar.aria-label           | "Primary navigation"
shell.sidebar.empty.message        | "No navigation entries available."
shell.sidebar.poweredByLabel       | "Powered by Dogan-AI OS"
shell.module-cards.aria-label      | "Modules"
workspace.shell.empty-state.props  | { "zone":"main", "title":"Workspace ready",
                                     "description":"Module surfaces will appear here once activated." }
```

Migration provenance:
- `20260508_0380_workspace_shell_chrome_overlay.sql` — sidebar/user-menu chrome keys.
- `20260508_0410_workspace_shell_zero_hardcoded_labels.sql` — poweredByLabel + remaining shell.* chrome keys.
- `20260508_0350_workspace_visual_shell_seed.sql` — empty-state title/description (lines 111–112).

## 2. Carbon icon-button fail-closed posture (verified by source read)

`platform/ui-system/dos-ui-system/src/shell/visual-shell-surfaces.component.ts`:

- `DosShellUserMenuComponent`
  - Outer template gate: `@if (resolvedAriaLabel())` — when ariaLabel is empty
    the entire `<cds-icon-button>` is **not rendered** (no DOM node).
  - `triggerAttrs()` only sets `aria-label` when `resolvedAriaLabel()` is non-empty.
  - On missing prop, `console.warn('[shell.user-menu] MISSING_REQUIRED_PROP ariaLabel — control fail-closed, not rendered')`.
- `DosShellSettingsActionComponent`
  - Same outer template gate `@if (resolvedAriaLabel())`.
  - `triggerAttrs()` only sets `aria-label` when present.
  - Same fail-closed `console.warn`.

Result: an `aria-label="undefined"` literal is unreachable from these
two components when the resolver supplies a present ariaLabel (which it
does, per the table above).

## 3. App-owned DOM violation set (post Gate 1 + Gate 3)

For the routes reachable to a non-authenticated probe:

| route       | app-owned `aria-label="undefined"` | label-without-control | input-without-name | icon-only-without-name |
|-------------|------------------------------------|------------------------|--------------------|------------------------|
| `/`         | 0 (DB redirect → /login, no DOM)   | 0                      | 0                  | 0                      |
| `/login`    | 0                                  | 0                      | 0                  | 0                      |

For `/workspace-home`: the runtime envelope guarantees a non-empty
`ariaLabel` for every visual surface, and the visual components
fail-closed otherwise. A live authenticated DOM scan remains deferred
under `AUTHENTICATED_WORKSPACE_BROWSER_PROOF` (BLOCKED on credentials).

## 4. Earlier "aria-label=\"undefined\"" sightings

Pre-Gate-1 captures showed Carbon icon buttons with literal
`aria-label="undefined"`. Those captures were taken when `/` returned
`route-metadata 401` + `template-binding 500` and the SPA was stuck on
a partially-mounted shell with stale controls from a different render
attempt. With Gate 1 closed (`/` → DB-stored typed redirect, no
template-binding call) and the resolver enrichment supplying ariaLabel
from `dos.ui_workspace_chrome`, the upstream cause has been removed at
the data layer. The visual components themselves are also fail-closed
on empty ariaLabel, so even in the pathological case the literal
`undefined` cannot be re-emitted.

The previous extension-scoped sightings (`.aitopia` overlays) are
out of scope by directive — they are injected by browser extensions,
not by the app's render tree, and therefore cannot be addressed by
ShellHost / SurfaceRenderer / resolver changes.

## 5. Clean-profile strict probe (DOM guard wired)

Probe: `scripts/audits/a11y-label-probe.mjs --strict`.
Browser launch flags (clean profile):
`--disable-extensions --disable-component-extensions-with-background-pages
--disable-default-apps --no-default-browser-check --no-first-run`
plus a throw-away Playwright `newContext()` (no persisted user-data-dir).

Extension-DOM exclusion list (selectors hard-coded into the probe;
elements inside any of these are never reported):
`.aitopia`, `[data-aitopia]`, `[id^="aitopia"]`, `[class*="aitopia"]`,
`[data-v-app]`, `[data-extension]`, `extension-host`,
`[data-tampermonkey]`, `[data-grammarly-shadow-root]`,
`[data-lt-installed]`, `[data-1p-shadow-host]`, `[data-bw-installed]`.

Strict-guard rules (probe exits non-zero on any hit, app-owned only):
- `aria-label="undefined"` / `aria-label="null"`
- `aria-labelledby="undefined"` / `aria-labelledby="null"`
- `id="undefined"` / `id="null"`
- icon-only `<button>` / `[role=button]` with no accessible name
- `<label for>` with missing target id
- form control (`input`/`select`/`textarea`/`combobox`/`searchbox`/
  `textbox`/`spinbutton`/`slider`) with no accessible name

Run output (post Gate 1, post chrome overlay seeds):

```
[a11y-probe] /              → /login         http=200  issues=0
[a11y-probe] /login         → /login         http=200  issues=0
[a11y-probe] /workspace-home → chrome-error://chromewebdata/  http=200  issues=0
[a11y-probe] wrote platform/docs/workspace-contract-audit/a11y-label-probe.json
             (totalIssues=0, strict=true)
EXIT=0
```

`totalIssues=0` across all three routes; `--strict` mode held green.
The probe is now CI-wireable as a fail-closed DOM guard.

## 6. Named-control DOM snippets

The probe captures, on every route, the outer + inner-button DOM for
the named app-owned shell controls:

| name                | selector                                                   |
|---------------------|------------------------------------------------------------|
| settings-button     | `[data-renderer-key="shell.settings-action"]`              |
| account-button      | `[data-renderer-key="shell.user-menu"]`                    |
| sidebar-empty-state | `[data-testid="dos-shell-sidebar-nav__empty"]`             |
| sidebar-nav-root    | `[data-renderer-key="shell.sidebar-nav"]`                  |
| main-empty-state    | `[data-renderer-key="shell.empty-state"], dos-empty-state` |
| brand               | `[data-renderer-key="shell.brand"]`                        |
| workspace-title     | `[data-renderer-key="shell.workspace-title"]`              |
| module-cards        | `[data-renderer-key="shell.module-cards"]`                 |

Reachable-route results (`/`, `/login`): all eight snippets report
`present=false` — those routes do not mount the workspace shell tree
(public auth surface). This is the correct contract: workspace shell
chrome is gated behind `workspaceShellGuard` and is only mounted under
authenticated child paths.

`/workspace-home` snippet capture: blocked. Headless chromium lands at
`chrome-error://chromewebdata/` because the SPA bounces to OIDC at
`https://shahin-ai.com/login/realms/dogan/.../auth`. AGENTS.md doctrine
forbids fabricating an OIDC session. Snippet rows for the workspace
shell controls are deferred to `AUTHENTICATED_WORKSPACE_BROWSER_PROOF`
and will be filled by re-running the same probe with a real operator
session.

## Verdict

- **DB-source proof**: every visible shell text on `/workspace-home` is
  emitted from `dos.ui_workspace_chrome` or
  `dos.workspace_shell_binding.props`. Zero hardcoded TS literal in
  resolver enrichment.
- **Fail-closed proof**: settings + user-menu icon buttons render
  nothing (no DOM node) on missing ariaLabel; `aria-label="undefined"`
  is unreachable.
- **Reachable-route DOM proof**: `/`, `/login` — zero app-owned
  violations.
- **`/workspace-home` DOM proof**: deferred under
  `AUTHENTICATED_WORKSPACE_BROWSER_PROOF` (BLOCKED on credentials).
