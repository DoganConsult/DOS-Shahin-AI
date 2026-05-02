> Historical note: this prompt predates the canonical move to `modules/compliance`.
> Keep it only as migration context; do not use it as the current boundary contract.

Yes — same principle for **Compliance Module**.

Core rule:

```txt id="93zdcn"
Compliance-owned code must live inside:

/root/DOS-AIO/DOS Platform/Compliance Module

Not scattered inside:
- Shahin-AI Website
- Foundation Module
- Governance Module
- Risk Module
- root services/*
- root packages/*
- Dynamic UI
- gateway
```

Use this prompt for the agent:

```txt id="compliance-boundary-agent"
TASK: One-time Compliance Module Boundary Consolidation — server is stopped

CONTEXT:
Production/server is stopped intentionally.
Do not restart production until this consolidation is complete and verified.

GOAL:
Move all Compliance-owned files into the canonical Compliance module folder:

/root/DOS-AIO/DOS Platform/Compliance Module

Compliance must become self-contained, modular, extractable, contract-driven, and plug-and-play.

NON-NEGOTIABLE RULES:
1. No Docker.
2. No Netlify.
3. No Vercel.
4. No Firebase.
5. No Render/Railway.
6. No new scattered files outside /root/DOS-AIO/DOS Platform.
7. No Compliance business logic inside Shahin-AI Website.
8. No Compliance business logic inside Foundation Module.
9. No Compliance business logic inside Governance Module.
10. No Compliance business logic inside Risk Module.
11. No Compliance business logic inside Dynamic UI.
12. No Compliance business logic inside gateway.
13. No Compliance business logic inside root services unless it is only a temporary host adapter importing from Compliance Module.
14. Do not create fake/mock endpoints.
15. Do not delete files until moved/relinked and build passes.
16. Use git mv where possible.
17. Preserve history and do not manually copy/paste large files.
18. Server remains stopped until final verification.

CANONICAL ROOTS:
Platform:
  /root/DOS-AIO/DOS Platform

Specs:
  /root/DOS-AIO/DOS-AIO-Specs

Compliance Module:
  /root/DOS-AIO/DOS Platform/Compliance Module

Shahin product root:
  /root/DOS-AIO/DOS Platform/Shahin-AI Website

Dynamic UI:
  /root/DOS-AIO/DOS Platform/Dynamic UI

EXPECTED FINAL COMPLIANCE MODULE SHAPE:

/root/DOS-AIO/DOS Platform/Compliance Module/
  package.json
  module.contract.json
  README.md

  contracts/
    compliance.contract.json
    route.contract.json
    page.contract.json
    api.contract.json
    permission.contract.json
    navigation.contract.json
    i18n.contract.json
    db.contract.json
    control.contract.json
    assessment.contract.json
    evidence.contract.json
    agent.contract.json
    workflow.contract.json

  domain/
    frameworks/
    controls/
    requirements/
    assessments/
    obligations/
    evidence/
    exceptions/
    attestations/
    mappings/

  application/
    use-cases/
    services/
    policies/

  infrastructure/
    repositories/
    mappers/
    integrations/

  interface/
    http/
    admin/

  ports/

  ui/
    pages/
    components/
    widgets/
    layout/
    routes/
    i18n/
    styles/
    registry/

  db/
    migrations/
    seeds/

  permissions/
  manifests/
  agents/
  workflows/
  tests/
  docs/
```

Phase 1 — inventory Compliance-owned scattered files:

```txt id="compliance-phase1"
cd /root/DOS-AIO

echo "=== COMPLIANCE SCATTER INVENTORY ==="

grep -RIlE "compliance|Compliance|controls|control-library|requirements|obligations|frameworks|assessments|attestations|evidence|exceptions|regulatory|policy-mapping|control-mapping|nca|sama|pdpl|iso27001|iso-27001|nist|dora|cis|soc2" \
  "/root/DOS-AIO/DOS Platform/Shahin-AI Website/frontend/src" \
  /root/DOS-AIO/services \
  /root/DOS-AIO/packages \
  /root/DOS-AIO/modules \
  "/root/DOS-AIO/DOS Platform/Dynamic UI" \
  "/root/DOS-AIO/DOS Platform" \
  2>/dev/null \
  | sort \
  > /tmp/compliance_scatter_inventory.txt

cat /tmp/compliance_scatter_inventory.txt

echo "=== COMPLIANCE API ROUTES ==="
grep -RInE "compliance|controls|control-library|requirements|obligations|frameworks|assessments|attestations|evidence|exceptions|regulatory|policy-mapping|control-mapping|nca|sama|pdpl|iso27001|nist|dora" \
  /root/DOS-AIO/services \
  "/root/DOS-AIO/DOS Platform" \
  2>/dev/null | head -1000

echo "=== COMPLIANCE UI ROUTES/PAGES ==="
find "/root/DOS-AIO/DOS Platform/Shahin-AI Website/frontend/src" \
  "/root/DOS-AIO/DOS Platform/Compliance Module" \
  -type f \
  \( -iname "*compliance*" \
  -o -iname "*control*" \
  -o -iname "*requirement*" \
  -o -iname "*obligation*" \
  -o -iname "*framework*" \
  -o -iname "*assessment*" \
  -o -iname "*attestation*" \
  -o -iname "*evidence*" \
  -o -iname "*exception*" \
  -o -iname "*regulatory*" \
  -o -iname "*nca*" \
  -o -iname "*sama*" \
  -o -iname "*pdpl*" \
  -o -iname "*iso*" \
  -o -iname "*nist*" \
  -o -iname "*dora*" \) \
  -print | sort

echo "=== COMPLIANCE I18N KEYS ==="
grep -RInE "nav.compliance|modules.compliance|compliance\.|controls\.|frameworks\.|requirements\.|obligations\.|assessments\.|attestations\.|evidence\.|exceptions\." \
  "/root/DOS-AIO/DOS Platform/Shahin-AI Website/frontend/src" \
  "/root/DOS-AIO/DOS Platform/Compliance Module" \
  2>/dev/null | head -800
```

Classify every result:

```txt id="compliance-classify"
A. Move into Compliance Module
Compliance-owned UI, API, domain, application, DB, i18n, permissions, controls, frameworks, mappings, assessments, evidence, agents, workflows, routes, contracts, tests.

B. Keep outside as thin host adapter
Gateway proxy mount, PM2 config, product-shell config, Dynamic UI generic resolver, Shahin product bootstrap.

C. Remove after build passes
Duplicate old Compliance code, stale route mappings, obsolete scattered files.

D. Leave unrelated
Foundation-owned, Governance-owned, Risk-owned, Policy-owned, Evidence-owned, Privacy-owned, or platform-generic files.

IMPORTANT:
Do not steal files from other modules unless they are clearly Compliance-owned.

Examples:
- Foundation owns org/users/roles/locations/positions.
- Governance owns governance operating model, committees, decisions, authority.
- Risk owns risks, incidents, risk assessments, treatment.
- Policy owns policy lifecycle if separated.
- Evidence Module owns generic evidence storage if already separate.
- Compliance owns control frameworks, requirements, obligations, mappings, compliance assessments, attestations, exceptions, and compliance posture.
```

Phase 2 — move Compliance UI into Compliance Module:

```txt id="compliance-ui"
Target:

/root/DOS-AIO/DOS Platform/Compliance Module/ui/

Move Compliance-owned pages/components from Shahin SPA or scattered folders into Compliance Module.

Examples of what belongs in Compliance Module:
- compliance-overview
- compliance-dashboard
- compliance-frameworks
- compliance-controls
- control-library
- control-detail
- regulatory-requirements
- obligations
- compliance-assessments
- assessment-detail
- compliance-attestations
- evidence-mapping
- control-evidence
- compliance-exceptions
- exception-detail
- compliance-calendar
- compliance-reports
- framework-mapping
- nca-compliance
- sama-compliance
- pdpl-compliance
- iso27001-compliance
- nist-compliance
- dora-compliance
- compliance page registry
- compliance route registry
- compliance API client wrappers
- compliance i18n files

Shahin-AI Website may keep only:
- product shell/bootstrap
- generic Dynamic UI host
- generated route loader
- component allowlist importing Compliance exports
- product branding/theme
```

Phase 3 — move Compliance backend into Compliance Module:

```txt id="compliance-backend"
Target:

/root/DOS-AIO/DOS Platform/Compliance Module/interface/http
/root/DOS-AIO/DOS Platform/Compliance Module/application
/root/DOS-AIO/DOS Platform/Compliance Module/domain
/root/DOS-AIO/DOS Platform/Compliance Module/infrastructure
/root/DOS-AIO/DOS Platform/Compliance Module/db

Move Compliance-owned route handlers/controllers/services from scattered services/modules into Compliance Module.

Compliance Module must export a router factory, for example:

createComplianceRouter(deps)

or the equivalent existing module pattern.

A host service may keep only a thin adapter:

import { createComplianceRouter } from '@dos/module-compliance/interface/http';

app.register('/api/compliance', ...)
app.register('/api/compliance/frameworks', ...)
app.register('/api/compliance/controls', ...)
app.register('/api/compliance/requirements', ...)
app.register('/api/compliance/obligations', ...)
app.register('/api/compliance/assessments', ...)
app.register('/api/compliance/attestations', ...)
app.register('/api/compliance/exceptions', ...)
app.register('/api/compliance/evidence-mapping', ...)

But business logic must live in Compliance Module, not user-service, gateway, or Shahin SPA.
```

Phase 4 — Compliance contract becomes source of truth:

```txt id="compliance-contract"
Create/update:

/root/DOS-AIO/DOS Platform/Compliance Module/contracts/compliance.contract.json

It must include:
- moduleCode: compliance
- productKey: compliance or foundation/compliance enrollment key as currently used
- routes
- pages
- API endpoints
- permissions
- navigation
- i18n namespaces
- DB migrations/seeds
- control-framework ownership
- Dynamic UI enrollment
- agents/workflows if present

Canonical Compliance routes should be:

/compliance/overview
/compliance/frameworks
/compliance/controls
/compliance/controls/:id
/compliance/requirements
/compliance/obligations
/compliance/assessments
/compliance/assessments/:id
/compliance/attestations
/compliance/evidence-mapping
/compliance/exceptions
/compliance/calendar
/compliance/reports
/compliance/settings

If product route prefix is /compliance-management or /controls, decide one canonical prefix and redirect/remove stale routes.

Do not mix Compliance navigation into Foundation unless it is only a cross-module card/link.
```

Phase 5 — fix i18n inside Compliance Module:

```txt id="compliance-i18n"
Compliance i18n must live under:

/root/DOS-AIO/DOS Platform/Compliance Module/ui/i18n/ar.json
/root/DOS-AIO/DOS Platform/Compliance Module/ui/i18n/en.json

Use one namespace:

compliance.*

Required key groups:
- compliance.nav.*
- compliance.overview.*
- compliance.frameworks.*
- compliance.controls.*
- compliance.requirements.*
- compliance.obligations.*
- compliance.assessments.*
- compliance.attestations.*
- compliance.evidence.*
- compliance.exceptions.*
- compliance.reports.*
- compliance.actions.*
- compliance.emptyStates.*
- compliance.errors.*
- compliance.filters.*

Do not show raw keys to users.

Do not use generic controls.* or framework.* unless a shared component requires aliases.
```

Phase 6 — package exports and boundaries:

```txt id="compliance-exports"
Update package exports:

/root/DOS-AIO/DOS Platform/Compliance Module/package.json

Exports should expose:
- ./contract
- ./ui
- ./ui/routes
- ./ui/registry
- ./interface/http
- ./db/migrations
- ./permissions
- ./agents
- ./workflows

Update tsconfig paths to import Compliance from its module package, not relative scattered paths.

Forbidden imports after consolidation:
- Shahin-AI Website importing Compliance via long relative paths into old scattered folders.
- Dynamic UI importing Compliance internals directly.
- gateway importing Compliance business logic.
- Foundation Module importing Compliance internals directly.
- Governance Module importing Compliance internals directly.
- Risk Module importing Compliance internals directly.
- user-service owning Compliance business logic.

Allowed:
- host adapters importing Compliance public exports only.
- Dynamic UI consuming Compliance contract only.
- Shahin product consuming generated route/component registry only.
```

Phase 7 — build and test while server remains stopped:

```txt id="compliance-build"
Run:

cd "/root/DOS-AIO/DOS Platform/Compliance Module"
pnpm run build || true
pnpm test || true

Then from active workspace root:

cd /root/DOS-AIO
pnpm install --frozen-lockfile

pnpm --filter @dos/module-compliance run build
pnpm --filter gateway run build
pnpm --filter user-service run build || true
pnpm --filter compliance-controls-service run build || true

cd "/root/DOS-AIO/DOS Platform/Shahin-AI Website/frontend"
pnpm run build

Do not restart production yet.
```

Phase 8 — boundary verification:

```txt id="compliance-boundary-check"
Run:

echo "=== NO COMPLIANCE BUSINESS LOGIC OUTSIDE COMPLIANCE MODULE ==="

grep -RInE "compliance|Compliance|controls|control-library|requirements|obligations|frameworks|assessments|attestations|evidence|exceptions|regulatory|policy-mapping|control-mapping|nca|sama|pdpl|iso27001|nist|dora" \
  "/root/DOS-AIO/DOS Platform/Shahin-AI Website/frontend/src" \
  /root/DOS-AIO/services \
  /root/DOS-AIO/packages \
  /root/DOS-AIO/modules \
  "/root/DOS-AIO/DOS Platform/Dynamic UI" \
  "/root/DOS-AIO/DOS Platform/Foundation Module" \
  "/root/DOS-AIO/DOS Platform/Governance Module" \
  "/root/DOS-AIO/DOS Platform/Risk Module" \
  2>/dev/null \
  | grep -v "/root/DOS-AIO/DOS Platform/Compliance Module" \
  | head -800

Each remaining hit must be classified:
- allowed host adapter
- allowed import from Compliance public export
- allowed generated registry
- allowed cross-module link/card
- violation to move
```

Acceptance criteria:

```txt id="compliance-acceptance"
PASS only if:

1. Compliance Module contains all Compliance-owned UI/API/domain/i18n/DB/permission/contract files.
2. Shahin-AI Website contains no Compliance business logic, only host/bootstrap/generated imports.
3. Dynamic UI contains no Compliance hardcoding, only generic resolver logic.
4. Foundation/Governance/Risk modules do not contain Compliance business logic.
5. Host services contain no Compliance business logic, only router registration/import adapter if needed.
6. Gateway contains no Compliance business logic, only proxy/mount wiring.
7. Compliance routes are canonical and contract-owned.
8. No visible raw i18n keys remain in Compliance pages.
9. Frontend build passes.
10. Compliance package build passes.
11. gateway and affected host-service builds pass.
12. No Docker/cloud deploy files added.
13. No source-root migration performed outside this Compliance consolidation.
14. Server was not restarted before final approval.
```

Final report format:

```txt id="compliance-report"
FINAL REPORT — Compliance Boundary Consolidation

1. Verdict:
PASS / PARTIAL / NOT PASS

2. Files moved:
old path -> new path

3. Files left outside Compliance Module:
path | reason | allowed/violation

4. Compliance package exports changed:
file | exports

5. Host adapters changed:
service/file | reason

6. Dynamic UI changes:
file | generic or Compliance-specific?

7. Shahin SPA changes:
file | removed/moved/host import only

8. Cross-module boundaries:
Foundation/Governance/Risk/Policy/Evidence touched yes/no | why

9. i18n keys fixed:
key | file

10. Route contract:
old route | new route | owner

11. Build results:
command | result

12. Remaining blockers:
exact blocker only

13. Explicit statements:
- server was not restarted
- no Docker/cloud files added
- no mock endpoints added
- no source-root migration performed
```

Important final instruction to include:

```txt id="compliance-final-rule"
This is not a UI patch.
This is not endpoint silencing.
This is a boundary correction.

Compliance must own Compliance.
The product only hosts it.
Dynamic UI only resolves it.
Gateway only routes it.
Services only mount it.
Other modules only link to it through contracts.
```
