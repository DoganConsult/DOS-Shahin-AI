# Profile Pluggability — Architecture

## Why "profile"?

A **profile** is a pluggable behavioural envelope on top of the same `modules/` code.
Profiles let one codebase ship as different products (GRC, ISO 27001, DORA,
Privacy-only, custom regulator) without forking module sources.

A profile defines:

| Axis | What changes per profile |
|---|---|
| Lifecycle states & transitions | risk.classify → … differs by regulation |
| Workflow hooks & SLAs | ISO 27001 vs DORA review cadence |
| Permissions / roles registry | naming + role bundles |
| Dynamic UI rows (cards/routes/views/columns/filters/actions/forms/widgets) | KSA labels vs EU labels, hidden columns, different KPIs |
| Workspace card grid | which modules are visible and in what order |
| Seed data | reference catalogues, frameworks, default users |

The module *source* (Angular components, services, DB tables) does **not** change
across profiles. Same `risk_record` table, same Angular `RiskListComponent`.

## Layout

```
.modules-isolation/workspace/
├── profile-shared/          # cross-profile (platform DNA)
│   ├── schema/grc-module.schema.json
│   ├── dynamic-ui-schema/01_ui_registry.sql   # 11 dos.ui_* tables + dos.profile_registry, dos.tenant_profile, dos.resolve_profile_code()
│   └── contracts/index.ts   # Profile, ProfileResolver, DynamicUiClient, UI row types
├── profiles/
│   └── grc/                 # one profile per directory
│       ├── profile.json
│       ├── workspace-cards.json
│       ├── manifests/<code>.profile.json
│       ├── registries/{permissions,roles,scopes}.registry.json
│       ├── workflows/<module>/<hook>.workflow.json
│       ├── migrations/sql/<ts>__module_<code>.sql
│       └── dynamic-ui-seeds/{00_profile_registry,01_ui_module,…}.sql
└── profile-tools/
    ├── scaffold-new-profile.sh
    └── validate-profile.sh
```

## DB model

Every UI row carries `profile_code TEXT NOT NULL REFERENCES dos.profile_registry(code)`.
Composite FKs `(profile_code, module_code)` from `ui_route`, `ui_view`,
`ui_form`, `ui_navigation`, `ui_widget` to `ui_module`.

Tenant binding: `dos.tenant_profile(tenant_id PK, profile_code)`.
Resolver helper: `dos.resolve_profile_code(tenant_id) → text` (default `'grc'`).

## Runtime resolution

```
HTTP request
    → gateway extracts tenant_id (DAuth)
    → ProfileResolver.resolveProfileForTenant(tenantId)   // dos.tenant_profile
    → DynamicUiClient.resolveX(..., ctx.profileCode)      // every query is WHERE profile_code = $1
    → UI-System renders
```

The resolver is platform-owned (lives in `dynamic-ui-service`), tenant-aware,
and cacheable per (tenantId, profileCode) tuple.

## Adding a new profile

```bash
cd .modules-isolation/workspace
profile-tools/scaffold-new-profile.sh iso27001 "ISO/IEC 27001"
# edit profiles/iso27001/manifests/*.profile.json
# regenerate registries/seeds (per-profile generators sit alongside)
profile-tools/validate-profile.sh iso27001
```

## Best-practice rules

1. **Module source code is profile-agnostic.** No `if (profile === 'grc')` branches.
2. **All profile choices are declarative** (manifest JSON + seed SQL). Code reads.
3. **`profile_code` is the first column in every `ui_*` index.** Always WHERE-filtered.
4. **Tenant overrides** still go through `dos.ui_tenant_override` and stack on
   top of the resolved profile rows.
5. **Default profile = `grc`** so existing tenants keep working without an
   explicit assignment row.
6. **Never duplicate `profile-shared/`** into a profile. Profile-specific files
   only.

## Closed loop

```
profile-shared/schema/grc-module.schema.json  ← validates →  profiles/<p>/manifests/*.profile.json
                                                                    │
                                                                    ▼
                                          profiles/<p>/registries/{permissions,roles,scopes}
                                                                    │
                                                                    ▼
                                                profiles/<p>/workflows/<module>/<hook>
                                                                    │
                                                                    ▼
                                              profiles/<p>/migrations/sql/__module_<m>
                                                                    │
                                                                    ▼
                                            profiles/<p>/dynamic-ui-seeds/*.sql
                                                                    │
                                                                    ▼
                                  profile-shared/contracts/index.ts (DynamicUiClient)
                                                                    │
                                                                    ▼
                                     UI-System rendering in Shahin / Tuwaiq / Doganlab …
```

Identical wiring as W1–W6, just per-profile.
