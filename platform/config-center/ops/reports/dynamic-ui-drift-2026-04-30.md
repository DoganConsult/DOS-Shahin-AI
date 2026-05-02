# Dynamic UI Drift Report — 2026-04-30

**Files scanned:** 28 SQL · routes: 54 · widget rows: 20 · permissions: 15

**WIDGET_KEY_MAP keys:** 43 · **COMPONENT_MAP keys:** 222 · **canonical perms:** 570 · **granted perms (any role):** 427

## Summary

| Class | Description | Count |
|---|---|---|
| D1 | Signature widget permission mismatch | 1 |
| D2 | Route component_key missing from COMPONENT_MAP | 21 |
| D3 | Widget_key missing from WIDGET_KEY_MAP | 3 |
| D4 | Permission missing from canonical-permissions | 14 |
| D5 | Permission not granted by any role | 14 |
| **Total** | | **53** |

## D1 — 1 violation(s)

```json
[
  {
    "route": "/foundation/access-review",
    "module": "foundation",
    "route_perm": "foundation:read",
    "widget_perm": "access_review:read",
    "widget_key": "campaign-cockpit",
    "file": "platform/dynamic-ui/db/public/seeds/009_seed_foundation_actions_widgets_agents.sql"
  }
]
```

## D2 — 21 violation(s)

```json
[
  {
    "route": "/foundation/overview",
    "module": "foundation",
    "component_key": "FoundationOverviewComponent"
  },
  {
    "route": "/foundation/organization",
    "module": "foundation",
    "component_key": "FoundationOrganizationComponent"
  },
  {
    "route": "/foundation/business-units",
    "module": "foundation",
    "component_key": "FoundationBusinessUnitsComponent"
  },
  {
    "route": "/foundation/departments",
    "module": "foundation",
    "component_key": "FoundationDepartmentsComponent"
  },
  {
    "route": "/foundation/users",
    "module": "foundation",
    "component_key": "FoundationUsersComponent"
  },
  {
    "route": "/foundation/roles",
    "module": "foundation",
    "component_key": "FoundationRolesComponent"
  },
  {
    "route": "/foundation/teams",
    "module": "foundation",
    "component_key": "FoundationTeamsComponent"
  },
  {
    "route": "/foundation/locations",
    "module": "foundation",
    "component_key": "FoundationLocationsComponent"
  },
  {
    "route": "/foundation/positions",
    "module": "foundation",
    "component_key": "FoundationPositionsComponent"
  },
  {
    "route": "/foundation/committees",
    "module": "foundation",
    "component_key": "FoundationCommitteesComponent"
  },
  {
    "route": "/foundation/delegations",
    "module": "foundation",
    "component_key": "FoundationDelegationsComponent"
  },
  {
    "route": "/foundation/ownership-mapping",
    "module": "foundation",
    "component_key": "FoundationOwnershipMappingComponent"
  },
  {
    "route": "/foundation/access-review",
    "module": "foundation",
    "component_key": "FoundationAccessReviewComponent"
  },
  {
    "route": "/foundation/policies",
    "module": "foundation",
    "component_key": "FoundationPoliciesComponent"
  },
  {
    "route": "/foundation/data-processing",
    "module": "foundation",
    "component_key": "FoundationDataProcessingComponent"
  },
  {
    "route": "/foundation/reference-data",
    "module": "foundation",
    "component_key": "FoundationReferenceDataComponent"
  },
  {
    "route": "/foundation/audit",
    "module": "foundation",
    "component_key": "FoundationAuditComponent"
  },
  {
    "route": "/foundation/settings",
    "module": "foundation",
    "component_key": "FoundationSettingsComponent"
  },
  {
    "route": "/foundation/roles/:id",
    "module": "foundation",
    "component_key": "FoundationRoleDetailComponent"
  },
  {
    "route": "/foundation/permissions",
    "module": "foundation",
    "component_key": "FoundationPermissionMatrixComponent"
  },
  {
    "route": "/foundation/operations-readiness",
    "module": "foundation",
    "component_key": "FoundationOperationsReadinessComponent"
  }
]
```

## D3 — 3 violation(s)

```json
[
  {
    "widget_key": "risk",
    "route": "ai-os",
    "module": "compliance"
  },
  {
    "widget_key": "risk-register-grid",
    "route": "/risk/register",
    "module": "risk",
    "_from": "routes.signature_widget"
  },
  {
    "widget_key": "risk-register-grid",
    "route": "/risk/assessments",
    "module": "risk",
    "_from": "routes.signature_widget"
  }
]
```

## D4 — 14 violation(s)

```json
[
  {
    "permission": "foundation:read"
  },
  {
    "permission": "users:manage"
  },
  {
    "permission": "admin:read"
  },
  {
    "permission": "governance:read"
  },
  {
    "permission": "privacy:read"
  },
  {
    "permission": "audit:read"
  },
  {
    "permission": "foundation:admin"
  },
  {
    "permission": "risk:read"
  },
  {
    "permission": "compliance:read"
  },
  {
    "permission": "governance:write"
  },
  {
    "permission": "workflow:read"
  },
  {
    "permission": "workflow:write"
  },
  {
    "permission": "access_review:read"
  },
  {
    "permission": "evidence"
  }
]
```

## D5 — 14 violation(s)

```json
[
  {
    "permission": "foundation:read"
  },
  {
    "permission": "users:manage"
  },
  {
    "permission": "admin:read"
  },
  {
    "permission": "governance:read"
  },
  {
    "permission": "privacy:read"
  },
  {
    "permission": "audit:read"
  },
  {
    "permission": "foundation:admin"
  },
  {
    "permission": "risk:read"
  },
  {
    "permission": "compliance:read"
  },
  {
    "permission": "governance:write"
  },
  {
    "permission": "workflow:read"
  },
  {
    "permission": "workflow:write"
  },
  {
    "permission": "access_review:read"
  },
  {
    "permission": "evidence"
  }
]
```

