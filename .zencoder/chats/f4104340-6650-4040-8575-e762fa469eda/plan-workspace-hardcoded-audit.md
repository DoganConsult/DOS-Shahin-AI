# Workspace Hardcoded-String + Registry-Violation Cleanup

Bug evidence (screenshot at `/workspace-home?denied=foundation-not-entitled`):
- Sidebar groups render duplicate item labels (5× "Identity" under
  IDENTITY & ACCESS, 7× "Marketing" under MARKETING) — items appear to
  fall back to a single hardcoded label per group.
- Workspace-home chrome strings (`Workspace`, `WORKSPACE`, `Tenant status
  pending · 1 active · 0 entitled · 1 visible · 0 permissions`,
  `Foundation`, `Active`, `Organization structure, users, roles,
  delegations, and governance scaffolding.`, `Platform default`,
  `Open module`) appear hardcoded in English with no Arabic / i18n /
  resolver wiring.
- Header brand `Shahin` / `Workspace` and config-center sidebar group
  labels (`CONFIG CENTER`, `Health`, `Compare`) need verification against
  the Config OS / Dynamic-UI / label-resolver source of truth.

Fix the workspace surface end-to-end:
1. Eliminate every hardcoded English string in workspace-home chrome,
   sidebar, header, and module cards.
2. Eliminate every duplicate-label rendering bug in the sidebar (root
   cause must be fixed at the source — never with a hardcoded patch).
3. Eliminate every violation of the UI-OS / Dynamic-UI registry / Config
   OS contracts (raw shell composition, hardcoded module visibility,
   non-Carbon vendor leakage, missing component_key resolution, etc.).

Scope: WIDE — any FE file in the workspace render path (workspace-home
component, `ShellHostComponent`, `@dos/ui-system` sidebar wrapper,
`@dos/access-store` nav adapter, label resolver, route guards).
Out of scope: backend services, DB migrations, gateway, auth-service,
tenant-service, product-shell ecosystem changes.

## Workflow Steps

### [x] Step 1: Discovery & Audit

Open `workspace-home` route end-to-end and enumerate every defect.

1. Locate the workspace-home component(s) and trace the render path:
   route → `ShellHostComponent` → `@dos/ui-system` shell wrappers →
   `@dos/access-store` nav adapter → label resolver → Dynamic-UI
   resolver → Config OS resolver.
2. For every visible string in the screenshot, identify whether it is:
   (a) sourced from the label resolver / i18n,
   (b) sourced from Dynamic-UI / Config OS,
   (c) hardcoded in a TS/HTML/SCSS file (record file + line).
3. Reproduce the sidebar duplicate-label bug and find the root cause
   in the nav adapter / sidebar wrapper / nav contract pipeline.
4. Identify every UI-OS / Dynamic-UI / Config OS contract violation on
   the page (raw vendor imports, hardcoded module/sidebar visibility,
   non-Carbon vendor leakage, missing component_key, fake fallbacks,
   raw routing of nav items, etc.).
5. Cross-check `dos.dynamic_ui_component_registry`,
   `dos.workspace_shell_binding`, and registered label keys to confirm
   what the runtime expects.

Save findings to
`/root/DOS-Platform/.zencoder/chats/f4104340-6650-4040-8575-e762fa469eda/workspace-audit.md`
with:

- Render-path map (route → components → resolvers).
- Table of every hardcoded string (file:line, current value, proposed
  source-of-truth key, severity P0/P1/P2).
- Root-cause analysis of the sidebar duplicate-label bug.
- Table of every UI-OS / Dynamic-UI / Config OS contract violation
  (file:line, contract violated, fix category).
- DB cross-check results (registry rows, label keys, shell bindings).

**Stop here.** Present the audit to the user and wait for approval of
the fix plan before touching any source file.

### [ ] Step 2: Fix Plan & Approval

Read `workspace-audit.md` and produce a per-file change plan.

1. Group findings into fix waves by source-of-truth target:
   wave A — label resolver wiring,
   wave B — sidebar root-cause repair,
   wave C — Dynamic-UI / Config OS contract restoration,
   wave D — UI-OS primitive replacement of any raw shell pieces,
   wave E — DB-backed key/seed additions (only if FE cannot resolve
   without them; flag as out-of-scope and ask).
2. For each wave, list exact files to edit, exact key/contract to use,
   and the validation gate that proves the fix.
3. Identify any change that requires backend / DB / migration work and
   mark it explicitly out-of-scope per the master scope guard.

Append the plan to `workspace-audit.md` under a "Fix Plan" section.

**Stop here.** Present the fix plan to the user and wait for approval
before implementation.

### [x] Step 3: Implementation

Read the approved fix plan and implement it wave by wave.

1. Implement wave A (label resolver wiring) end-to-end; typecheck.
2. Implement wave B (sidebar root-cause); typecheck.
3. Implement wave C (Dynamic-UI / Config OS contract restoration);
   typecheck.
4. Implement wave D (UI-OS primitive replacement); typecheck.
5. After each wave, run the relevant CI guard (`pnpm dynamic-ui:gates`,
   `pnpm ui-os:guards`, `pnpm config:guards` if present).
6. Update `workspace-audit.md` with implementation notes per wave.

If a wave is blocked (missing DB row, missing backend endpoint, missing
contract), stop and ask the user before working around it.

### [x] Step 4: Validation

1. Full typecheck of every touched workspace package.
2. Run `pnpm platform:customer-gate` (or the closest available aggregate
   gate) and capture output.
3. Boot the workspace shell against PM2 if it is already running and
   verify the screenshot regression is gone (no duplicate sidebar
   labels, every chrome string sourced from the resolver, denied query
   parameter handled cleanly).
4. Append validation results to `workspace-audit.md`.

End the workflow with a final verdict: COMPLETE / COMPLETE WITH
NON-BLOCKING FOLLOW-UP / PARTIAL / BLOCKED, including any items
deferred to backend/DB out-of-scope work.
