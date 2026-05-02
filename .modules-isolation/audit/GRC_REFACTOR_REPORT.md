# GRC Workspace Re-profile — Wave 1 Report

Locale: `.modules-isolation/workspace/`
Live `modules/`, `platform/`, `services/`, `products/`: **untouched.**

## What was produced

```
.modules-isolation/workspace/grc-profile/
├── schema/grc-module.schema.json     # Canonical module profile contract
├── workspace-cards.json              # 19-card workspace order + archive/relocate lists
└── manifests/
    ├── foundation.profile.json       # Card 0 — platform fabric (NOT a business card)
    ├── governance.profile.json       # Card 1
    ├── qiyas.profile.json            # Card 2
    ├── regulatory.profile.json       # Card 3
    ├── compliance.profile.json       # Card 4
    ├── risk.profile.json             # Card 5
    ├── controls.profile.json         # Card 6
    ├── policy.profile.json           # Card 7
    ├── asset.profile.json            # Card 8
    ├── vendor.profile.json           # Card 9
    ├── incident.profile.json         # Card 10
    ├── exceptions.profile.json       # Card 11
    ├── issues.profile.json           # Card 12
    ├── evidence.profile.json         # Card 13
    ├── audit.profile.json            # Card 14
    ├── bcp.profile.json              # Card 15
    ├── training.profile.json         # Card 16
    ├── reporting.profile.json        # Card 17
    └── ai_governance.profile.json    # Card 18
```

Also: `audit/MODULE_MAPPING.md` (folder → card mapping, fabric relocations, archives).

## Acceptance gate (from user spec)

| Check | Status |
|---|---|
| Workspace shows 19 cards (Foundation + 18) | ✅ `workspace-cards.json` |
| No onboarding card | ✅ none declared |
| No raw module manifests as cards | ✅ business cards = 18 GRC entries |
| Foundation is platform/base, not business | ✅ `foundation.profile.json` `is_business_card=false`, `tier="platform"` |
| Each module declares lifecycle | ✅ all 18 — 13 canonical states + transitions |
| workflow hooks | ✅ 5 hooks per module (intake/owner/post-approval/deviation/retest) |
| owner/accountable role | ✅ `owner_role.accountable` + `responsible` |
| RACI/RAPID mapping | ✅ `raci` block per module |
| org hierarchy scope | ✅ `org_scope: org→BU→dept→team→position→own` |
| permission codes | ✅ standard 10-permission set, namespaced `{module}.<code>` |
| evidence hooks | ✅ 4 hooks (primary/remediation/retest/monitoring) |
| audit trail events | ✅ 7 categories per module |
| reporting/KPI output | ✅ KPIs + KRIs + exec_pack_section |
| Cross-module dependencies declared | ✅ `consumes` per module |

## Folder consolidation — 73 folders → 18 cards

See `audit/MODULE_MAPPING.md`. Highlights:

- **Cards 1-18** absorb 51 source folders.
- **Shell layer (relocated):** `inbox`, `notifications`, `notification-center`, `messaging`, `approval-center`, `mobile`, `shared`, `widgets`, `privacy` → moved to `platform/inbox/`, `platform/runtime/`, `modules/packages/module-shared/`, or as a Compliance submodule.
- **Archived:** `errors`, `not-found`, `placeholder`, `sample-reports`.

## Permission model (uniform across all 18 modules)

```
{module}.record.read   {module}.record.write   {module}.record.approve
{module}.record.manage {module}.record.delete  {module}.record.configure
{module}.evidence.read {module}.evidence.write
{module}.report.read   {module}.export
```

## Role model (uniform)

| Role | Default permissions |
|---|---|
| `{module}.executive_owner` | all 10 |
| `{module}.module_lead`     | all except `record.delete` |
| `{module}.approver`        | read, write, approve, evidence.read, report.read |
| `{module}.contributor`     | read, write, evidence.read/write, report.read |
| `{module}.viewer`          | read, evidence.read, report.read |

## Lifecycle (uniform 13-state loop)

```
create → classify → assign_owner → raci_map → risk_compliance_link
       → workflow_approval → evidence_attach → monitor
       → exception_or_issue → remediate → retest_review → close → archive
```

12 transitions wired with triggers; permission guards on `assign_owner`,
`workflow_approval`, `evidence_attach`, `archive`.

## Workflow hooks (uniform)

Each module emits 5 standard hooks the workflow engine subscribes to:
`{module}.intake_review` (24 h), `{module}.owner_acknowledge` (48 h),
`{module}.post_approval` (8 h), `{module}.deviation_triage` (12 h),
`{module}.retest_review` (72 h). SLA hours can be tuned per module later.

## What is NOT done in Wave 1 (intentionally deferred)

1. **Physical folder consolidations.** The manifests describe the target;
   actually `git mv`-ing 51 folders into 18 module homes is Wave 2 — too disruptive
   to do in the same wave that introduces the schema.
2. **Code migration to the new perm/role names.** Existing code uses ad-hoc
   permission strings; mapping them to `{module}.record.<verb>` is Wave 3.
3. **Workflow definitions.** Manifests declare hook events; the actual XState
   workflow definitions (`{module}.intake_review`, etc.) are written by the
   workflow team in Wave 4 once the engine package surface is frozen.
4. **DB schema.** RACI / role assignment / org hierarchy tables live in
   `platform/foundation` and `dos.access_*` — those exist; per-module tables
   need migration files generated from the manifests (Wave 5, scriptable).
5. **Workspace shell wiring.** Reading `workspace-cards.json` from the SPA shell
   is a Shahin-AI product change — out of scope of `modules/`.

## Suggested wave plan

| Wave | Owner | Scope |
|---|---|---|
| W1 ✅ | this agent | Schema + 19 manifests + mapping + cards.json |
| W2 | code agent | Physical folder consolidation per `MODULE_MAPPING.md` |
| W3 | code agent | Migrate permission strings + role names to standard |
| W4 | workflow team | Define the 5 × 18 = 90 workflow definitions |
| W5 | DB team | Generate migrations for module RACI/audit/evidence tables |
| W6 | shahin-ai product | Shell renders 19 cards, hides non-conforming routes |

## Validation hint (manifest sanity)

```
node -e "
  const fs=require('fs'),Ajv=require('ajv');
  const ajv=new Ajv({allErrors:true,strict:false});
  const sch=JSON.parse(fs.readFileSync('.modules-isolation/workspace/grc-profile/schema/grc-module.schema.json','utf8'));
  const v=ajv.compile(sch);
  for(const f of fs.readdirSync('.modules-isolation/workspace/grc-profile/manifests')){
    if(f==='foundation.profile.json') continue;
    const d=JSON.parse(fs.readFileSync('.modules-isolation/workspace/grc-profile/manifests/'+f,'utf8'));
    console.log(f, v(d) ? 'OK' : v.errors);
  }
"
```
