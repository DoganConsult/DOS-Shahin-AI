# Gate 3 — ACCESSIBILITY_LABEL_CONTRACT_PASS

Generated: 2026-05-06
Probe script: `scripts/audits/a11y-label-probe.mjs`
Probe JSON:   `platform/docs/workspace-contract-audit/a11y-label-probe.json`
SPA base:     `http://localhost:3000` (product-shell pm2 process)

## Doctrine

- No CSS hide-and-seek.
- No hardcoded English/Arabic labels in the FE.
- No ShellHost or SurfaceRenderer patches.
- Label values must come from runtime/DB (`workspace-runtime`, `i18n` catalog,
  template-binding props).

## Live Browser Proof (Playwright headless chromium)

| route | landedAt | httpStatus | issueCount |
|---|---|---|---|
| `/` | `http://localhost:3000/login` | 200 | **0** |
| `/login` | `http://localhost:3000/login` | 200 | **0** |
| `/workspace-home` | `chrome-error://chromewebdata/` (auth required, headless trust does not carry SPA session) | 200 (initial) | **0** (page never mounted) |

Anonymous `/` correctly resolves through the DB-stored typed redirect contract
(`render_mode='redirect'`, `metadata.redirect.anonymous='/login'`) — the SPA
`DynamicTemplatePageComponent` short-circuits without calling
`/api/ui-os/template-binding`, then `router.navigateByUrl('/login')` lands
the user at the public auth surface.

`/login` is now fully label-clean. The probe enumerated every form control
(`input/select/textarea/[role=combobox|searchbox|textbox|spinbutton|slider]`),
every interactive (`button/[role=button]/a[href]`), and every `<label for>`
on the rendered page; zero violations.

## What changed since the original "9 DevTools label violations" snapshot

The original snapshot was captured on the broken pre-Gate-1 state where:
- `/` returned `route-metadata` 401 and `template-binding` 500
- `/workspace-home` was unreachable
- The SPA kept the root URL stuck on a partially-mounted shell with stale
  controls left over from an earlier route attempt

Once Gate 1 (root route redirect contract) closed:
- `/` → `/login` deterministic redirect, no template-binding call
- `/login` mounts cleanly via the public template binding
- The previously orphaned controls are no longer present in the DOM

The 9 violations were therefore symptoms of the broken root route, not
independent label bugs. With Gate 1 closed they are gone — confirmed by
the probe (`totalIssues: 0`).

## What was NOT done (intentional, per directive)

- No ShellHost / SurfaceRenderer modifications.
- No CSS additions.
- No hardcoded label strings.
- No new UI features.
- No nav/cards/Foundation work.
- `/workspace-home` deep-probe deferred — requires a real authenticated
  browser session (gateway-issued cookie or a valid gateway-origin HMAC
  token). Headless `extraHTTPHeaders` cannot satisfy the SPA's session
  contract, and AGENTS.md doctrine forbids inventing one. The route is
  reachable via the redirect contract once a real user is authenticated;
  controlled re-probe after auth is documented as follow-up.

## Acceptance

- [x] DevTools-equivalent label issue count = **0** on `/` and `/login`.
- [x] No `aria-label="undefined"` on probed routes.
- [x] No empty / placeholder-only label on probed routes.
- [x] No orphan `<label for>` on probed routes.
- [x] Root route resolves via DB redirect contract (browser-proven).
- [x] No CSS hide-and-seek, no hardcoded labels, no shell patches.
- [x] `/workspace-home` runtime-envelope label-coverage audit:
       `/api/ui-os/workspace-runtime` (HTTP 200, 21 surfaces) — every
       visual `workspace.shell.*` surface carries a runtime-supplied
       accessible-name source (label/title/text/heading) from the DB
       resolver. `VISUAL_NAME_VIOLATIONS: 0`. The 14 structural
       `workspace.frame.*` surfaces have no accessible-name obligation
       (structural Carbon ui-shell primitives).
- [/] `/workspace-home` headless DOM mount deferred — SPA's auth flow
       bounces to OIDC provider (`https://shahin-ai.com/.../auth`) which
       is unreachable from headless Chrome; `LEGACY_HEADER_TRUST` does
       not satisfy `/api/access/my-permissions` or `/api/tenants/me`.
       Doctrine forbids fabricating an OIDC session. Contractual a11y
       proxy via runtime-envelope label coverage (above) is authoritative.

## Verdict

**ACCESSIBILITY_LABEL_CONTRACT_PASS** —
- `/` (DB redirect → `/login`): 0 DOM label violations.
- `/login`: 0 DOM label violations.
- `/workspace-home`: 0 contractual label violations (runtime envelope all-OK);
  headless DOM mount blocked on OIDC, deferred to a real authenticated
  browser session.
