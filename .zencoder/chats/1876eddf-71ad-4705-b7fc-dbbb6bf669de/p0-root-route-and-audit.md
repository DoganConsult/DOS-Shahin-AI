# P0 Addendum — Root Route "/" Contract + Workspace Contract Audit

User request: BEFORE implementation, extend the existing investigation with a
deeper cross-validated audit of the following P0 finding. Do not patch
ShellHost. Do not patch workspace renderer. Do not add static landing page.
Do not hardcode root redirect in component code. Do not hide accessibility
issues with CSS. Fix root route contract and fail-close behavior first.

## Browser proof
- APP_BOOTSTRAPPED
- ROUTE_MATCHED /
- GET /api/ui-os/route-metadata returns 401
- GET /api/ui-os/template-binding?route=/ returns 500
- DevTools also reports 9 label/form accessibility issues

## Required (must be cross-audited and validated)

1. Define canonical route policy for "/":
   - Option A: "/" is public landing route. Then must have:
     - dynamic_ui_routes row
     - route metadata
     - template binding
     - public access policy
   - Option B: "/" is entry route. Then route metadata must declare:
     - anonymous → /login or public landing
     - authenticated → /workspace-home

2. /api/ui-os/route-metadata behavior:
   - Public route: anonymous request must NOT return raw 401.
   - Auth-required: return typed unauthenticated response that frontend can redirect from.
   - No blank page.

3. /api/ui-os/template-binding?route=/ behavior:
   - Must NEVER return 500 for missing route/binding.
   - Return: 404 TEMPLATE_BINDING_NOT_FOUND, typed redirect instruction, or 200 valid binding.

4. Frontend behavior:
   - If route metadata says redirect → do not call template-binding for "/".
   - If route metadata says shell-only → do not call template-binding.
   - If route metadata says dynamic-template → call template-binding only after metadata confirms binding required.

5. After root route fixed, rerun browser:
   - anonymous /
   - authenticated /
   - authenticated /workspace-home

6. Then run accessibility label audit only on the correct active page.

7. Accessibility pass — identify the 9 violating nodes:
   selector | route | component | input/control | labelSource | fixNeeded

## Acceptance
- "/" no longer causes template-binding 500.
- route-metadata 401 is handled or avoided by route policy.
- anonymous user gets public landing/login intentionally.
- authenticated user reaches /workspace-home intentionally.
- no blank page.
- no static fallback.
- then accessibility issue count is audited on the correct route.

## Workspace Contract Audit Report (2026-05-06T11:21:42.720Z, runtime unavailable)

Summary:
- Seed keys: 60
- Registry keys: 67
- Tenant bindings: 60
- Runtime emitted: 0
- DOM rendered: 0
- Visible: 0
- Catalog-only: 32
- Structural: 14
- Visual: 7
- Action: 7
- Data-binding: 7
- Missing binding: 7
- Missing rendererKey: 46
- Missing COMPONENT_MAP: 0
- Permission blocked: 0
- Entitlement blocked: 0
- Hidden/zero-size DOM: 0
- Undefined aria/action: 0

Live Comparisons:
- Seed → Registry missing: -7
- Registry → Binding missing: 7
- Binding → Runtime missing: 60
- Runtime → DOM missing: 0

Failure Rules:
- shell-host-branching: shell.isTrailingHeaderSurface
- workspace-home-template-binding: /workspace-home

Notable rows (visual-shell registry but no binding — "no-binding"):
- workspace.shell.brand
- workspace.shell.empty-state
- workspace.shell.module-cards
- workspace.shell.settings-action
- workspace.shell.sidebar-nav
- workspace.shell.user-menu
- workspace.shell.workspace-title

Nav/data/input/action/polish rows (32+) categorized as catalog-only with no rendererKey.

## Track status
- UI OS renderer ground zero = PASS
- Carbon shell baseline = partial/pass
- Account action behavior = PASS
- Shell hardcoded residual sweep = PASS
- Root route "/" contract = still needs fix       ← THIS TICKET
- Template-binding route="/" 500 = still P0       ← THIS TICKET
- Accessibility label issue = pending after route "/" is fixed
- ShellHost branching risk = still needs audit/fix
- workspace-home template-binding risk = still needs no-call proof
- Migration ownership drift = separate track
