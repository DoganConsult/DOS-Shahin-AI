# Foundation Module — STRUCTURE

> Derived artifact. Do not edit by hand.
> Source contracts:
> - `platform/foundation/contracts/navigation/navigation.json`
> - `platform/foundation/contracts/routing/routes.json`
> - `platform/foundation/contracts/agent.contract.json`
> - `platform/foundation/contracts/agents/agents.json`
>
> Doctrine: zero static / zero legacy / Dynamic UI-OS only / DB-driven by published contracts.

Module: `foundation` · navigation schemaVersion 1 · routing schemaVersion 1

## Page Roster (by navigation group, source-of-truth order)

### foundation.group.organization — `modules.foundation.nav.group.organization`

| order | id | route | icon | permission |
|------:|----|-------|------|------------|
| 10 | `foundation.overview` | `/foundation/overview` | `layout-dashboard` | `foundation.module.read` |
| 20 | `foundation.organization` | `/foundation/organization` | `sitemap` | `foundation.data.read` |
| 30 | `foundation.business-units` | `/foundation/business-units` | `briefcase` | `foundation.data.read` |
| 40 | `foundation.departments` | `/foundation/departments` | `building-community` | `foundation.data.read` |
| 50 | `foundation.positions` | `/foundation/positions` | `badge` | `foundation.data.read` |
| 60 | `foundation.locations` | `/foundation/locations` | `map-pin` | `foundation.data.read` |
| 180 | `foundation.hierarchy-viz` | `/foundation/hierarchy-viz` | `binary-tree` | `foundation.hierarchy.read` |

### foundation.group.identity — `modules.foundation.nav.group.identity`

| order | id | route | icon | permission |
|------:|----|-------|------|------------|
| 70 | `foundation.users` | `/foundation/users` | `users` | `foundation.user.read` |
| 80 | `foundation.teams` | `/foundation/teams` | `users-group` | `foundation.data.read` |
| 90 | `foundation.roles` | `/foundation/roles` | `shield` | `foundation.rbac.read` |
| 100 | `foundation.permissions` | `/foundation/permissions` | `key` | `foundation.rbac.read` |
| 190 | `foundation.user-lifecycle` | `/foundation/user-lifecycle` | `arrow-cycle` | `foundation.user.write` |

### foundation.group.governance — `modules.foundation.nav.group.governance`

| order | id | route | icon | permission |
|------:|----|-------|------|------------|
| 110 | `foundation.committees` | `/foundation/committees` | `assembly` | `foundation.data.read` |
| 120 | `foundation.delegations` | `/foundation/delegations` | `share` | `foundation.data.read` |
| 130 | `foundation.access-review` | `/foundation/access-review` | `checklist` | `foundation.review.read` |
| 140 | `foundation.policies` | `/foundation/policies` | `book` | `foundation.data.read` |
| 150 | `foundation.audit` | `/foundation/audit` | `history` | `foundation.audit.read` |
| 160 | `foundation.ownership` | `/foundation/ownership` | `chart-arcs` | `foundation.data.read` |
| 170 | `foundation.sod` | `/foundation/sod` | `shield-lock` | `foundation.sod.write` |
| 200 | `foundation.reference-data` | `/foundation/reference-data` | `database` | `foundation.data.read` |
| 210 | `foundation.diagnostics` | `/foundation/diagnostics` | `stethoscope` | `foundation.module.read` |

## Internal Routes (foundation)

| path | target |
|------|--------|
| `/foundation` | `modules/foundation#index` |
| `/foundation/overview` | `modules/foundation#overview` |
| `/foundation/organization` | `modules/foundation#organization` |
| `/foundation/business-units` | `modules/foundation#business-units` |
| `/foundation/departments` | `modules/foundation#departments` |
| `/foundation/positions` | `modules/foundation#positions` |
| `/foundation/locations` | `modules/foundation#locations` |
| `/foundation/users` | `modules/foundation#users` |
| `/foundation/users/:id` | `modules/foundation#user-detail` |
| `/foundation/teams` | `modules/foundation#teams` |
| `/foundation/roles` | `modules/foundation#roles` |
| `/foundation/committees` | `modules/foundation#committees` |
| `/foundation/delegations` | `modules/foundation#delegations` |
| `/foundation/access-review` | `modules/foundation#access-review` |
| `/foundation/policies` | `modules/foundation#policies` |
| `/foundation/audit` | `modules/foundation#audit` |

## API Routes (foundation)

| path | target |
|------|--------|
| `/api/users` | `services/user-service#users` |
| `/api/organizations` | `services/user-service#organizations` |
| `/api/business-units` | `services/user-service#business-units` |
| `/api/foundation/departments` | `services/user-service#departments` |
| `/api/foundation/teams` | `services/user-service#teams` |
| `/api/positions` | `services/user-service#positions` |
| `/api/locations` | `services/user-service#locations` |
| `/api/committees` | `services/user-service#committees` |
| `/api/invitations` | `services/user-service#invitations` |
| `/api/profiles/roles` | `services/user-service#profile-roles` |
| `/api/audit-trail` | `services/user-service#audit-trail` |
| `/api/tenants/home/overview` | `services/user-service#tenant-home-overview` |
| `/api/foundation/events` | `services/user-service#foundation-events-sse` |
| `/api/foundation/users/export` | `modules/foundation/interface/http/users.routes#export` |
| `/api/foundation/lookups` | `modules/foundation/interface/http/foundation-aggregator.routes#lookups` |
| `/api/foundation/module-config` | `modules/foundation/interface/http/module-config.routes` |
| `/api/module-config/foundation` | `services/tenant-service#module-config-proxy` |
| `/api/foundation/module-config/list/:variant` | `modules/foundation/interface/http/module-config.routes#list` |
| `/api/foundation/module-config/detail/:variant` | `modules/foundation/interface/http/module-config.routes#detail` |
| `/api/foundation/module-config/form/:variant` | `modules/foundation/interface/http/module-config.routes#form` |
| `/api/foundation/module-config/views/:variant` | `modules/foundation/interface/http/module-config.routes#views` |
| `/api/foundation/module-config/filters` | `modules/foundation/interface/http/module-config.routes#filters` |
| `/api/foundation/access-review` | `modules/foundation/interface/http/access-review.routes` |
| `/api/foundation/access-reviews` | `modules/foundation/interface/http/access-review.routes` |
| `/api/foundation/ownership-mapping` | `modules/foundation/interface/http/ownership-mapping.routes` |
| `/api/foundation/ownership-mappings` | `modules/foundation/interface/http/ownership-mapping.routes` |
| `/api/foundation/governance/delegations` | `modules/foundation/interface/http/delegation.routes` |

## Foundation Agents (module-owned contract)

| agentId | scope | capabilities | allowedActions | requiresHumanApproval |
|---------|-------|--------------|----------------|-----------------------|
| `foundation-org-agent` | module | detect_org_gaps, suggest_owner, summarize_structure, prepare_org_review | read, analyze, draft | yes |
| `foundation-access-agent` | page | explain_access, detect_sod_conflict, detect_risky_permissions, prepare_access_review, simulate_permission_change | read, analyze, draft, start_workflow | yes |
| `foundation-committee-agent` | page | prepare_meeting_brief, summarize_open_decisions, detect_quorum_issue, create_followups | read, analyze, draft | yes |
| `foundation-audit-scribe` | workflow | draft_audit_summary, group_events_by_incident, extract_evidence_links | read, analyze, draft | yes |

## Agent Registry (canonical bindings)

```json
{
  "schemaVersion": 1,
  "moduleCode": "foundation",
  "internalContractRef": "../agent.contract.json",
  "agents": [
    {
      "agentId": "foundation-org-agent",
      "scope": "module",
      "level": "L1",
      "nameKey": "agents.foundationOrg.name",
      "descriptionKey": "agents.foundationOrg.description",
      "capabilities": [
        "detect_org_gaps",
        "suggest_owner",
        "summarize_structure",
        "prepare_org_review"
      ],
      "allowedActions": [
        "read",
        "analyze",
        "draft"
      ],
      "requiresHumanApproval": true,
      "auditRequired": true,
      "defaultRiskLevel": "low"
    },
    {
      "agentId": "foundation-access-agent",
      "scope": "module",
      "level": "L2",
      "nameKey": "agents.foundationAccess.name",
      "descriptionKey": "agents.foundationAccess.description",
      "capabilities": [
        "explain_access",
        "detect_sod_conflict",
        "detect_risky_permissions",
        "prepare_access_review",
        "simulate_permission_change"
      ],
      "allowedActions": [
        "read",
        "analyze",
        "draft",
        "start_workflow"
      ],
      "requiresHumanApproval": true,
      "auditRequired": true,
      "defaultRiskLevel": "medium"
    },
    {
      "agentId": "foundation-committee-agent",
      "scope": "module",
      "level": "L2",
      "nameKey": "agents.foundationCommittee.name",
      "capabilities": [
        "prepare_meeting_brief",
        "summarize_open_decisions",
        "detect_quorum_issue",
        "create_followups"
      ],
      "allowedActions": [
        "read",
        "analyze",
        "draft"
      ],
      "requiresHumanApproval": true,
      "auditRequired": true,
      "defaultRiskLevel": "low"
    },
    {
      "agentId": "foundation-audit-scribe",
      "scope": "module",
      "level": "L3",
      "nameKey": "agents.foundationAuditScribe.name",
      "capabilities": [
        "draft_audit_summary",
        "group_events_by_incident",
        "extract_evidence_links"
      ],
      "allowedActions": [
        "read",
        "analyze",
        "draft"
      ],
      "requiresHumanApproval": true,
      "auditRequired": true,
      "defaultRiskLevel": "low"
    }
  ],
  "squads": [
    {
      "squadId": "foundation-access-review-squad",
      "nameKey": "agents.squads.accessReview.name",
      "orchestratorAgentId": "foundation-access-agent",
      "members": [
        "foundation-org-agent",
        "foundation-access-agent",
        "foundation-audit-scribe",
        "foundation-committee-agent"
      ],
      "humanApprovalRequired": true,
      "ledgerRequired": true,
      "preventCircularDelegation": true,
      "maxDepth": 5
    }
  ]
}
```

## Provenance

| source | sha256 |
|--------|--------|
| `navigation/navigation.json` | `sha256:7ca67a0edc7f6bfa4f48f1ae9a2a0c34954dd23ed550e43fb2b91bbd00c6d2bf` |
| `routing/routes.json` | `sha256:0718a3fe44d6af1df115865f52cd3eba5cf7780724dedbede5be6b117a150265` |
| `agent.contract.json` | `sha256:34eac5f71a0a37262c05c9fd58840b67ef0604b8fc0fdf1a1290d2d2ef4e5794` |
| `agents/agents.json` | `sha256:55055e8be867725358febdecd7ad9e377e6eaeba4f0f67760b13189b383c84af` |

Emitted by: `scripts/program/foundation-ai/emit-structure.mjs` · 2026-05-06T18:05:18.020Z
