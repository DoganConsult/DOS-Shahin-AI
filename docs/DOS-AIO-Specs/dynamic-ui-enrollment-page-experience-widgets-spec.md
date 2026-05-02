# Dynamic UI — Module Enrollment, Page Experience, and Widgets (Universal Spec)

This document is the single authoritative reference for **UI Dynamic Spaces** implementation (Dynamic UI + Page Experience + Widgets + Agent/Workflow/Evidence layers).

- Consolidates and supersedes the aligned plan previously captured in `DOS-AIO-Specs/5a2f2c4c-2b29-4b92-9c47-5c2d46f2a81f_plan.md` (that file remains retained for change history and traceability).
- Updated in place to preserve repository history where version control is available.

## Table of Contents

- [0. Scope](#0-scope)
- [0.1 Non-goals](#01-non-goals)
- [0.2 Implementation Plan (Aligned)](#02-implementation-plan-aligned)
- [1. Canonical Architecture](#1-canonical-architecture)
  - [1.1 Shell knowledge boundary](#11-shell-knowledge-boundary)
- [2. Module UI Contract (module-owned)](#2-module-ui-contract-module-owned)
  - [2.1 Contract file location](#21-contract-file-location)
  - [2.2 Contract schema (minimum)](#22-contract-schema-minimum)
  - [2.3 Route contract fields (required)](#23-route-contract-fields-required)
- [3. Page Experience Contract (user-profile oriented)](#3-page-experience-contract-user-profile-oriented)
  - [3.1 Normalized UserContext (required input)](#31-normalized-usercontext-required-input)
  - [3.2 PageExperienceContract (required per route)](#32-pageexperiencecontract-required-per-route)
  - [3.3 Resolver (single source of runtime truth)](#33-resolver-single-source-of-runtime-truth)
  - [3.4 Rendering rule (hard law)](#34-rendering-rule-hard-law)
  - [3.5 Page Experience gates (must pass)](#35-page-experience-gates-must-pass)
- [4. Shell Behavior Rules (contract-driven)](#4-shell-behavior-rules-contract-driven)
  - [4.1 KPI strip](#41-kpi-strip)
  - [4.2 Layout](#42-layout)
  - [4.3 Titles](#43-titles)
- [5. Theme Tokens (module accent without chaos)](#5-theme-tokens-module-accent-without-chaos)
- [6. Renderer Registry (generic first, custom second)](#6-renderer-registry-generic-first-custom-second)
- [7. Widgets (signature widget per page)](#7-widgets-signature-widget-per-page)
  - [7.1 Rule](#71-rule)
  - [7.2 Core widget types (build once; reuse everywhere)](#72-core-widget-types-build-once-reuse-everywhere)
  - [7.3 Widget contract shape (per route)](#73-widget-contract-shape-per-route)
  - [7.4 Widget selection rules by pageType](#74-widget-selection-rules-by-pagetype)
  - [7.5 Agent actions on widgets (contract-driven)](#75-agent-actions-on-widgets-contract-driven)
- [8. Data Model (dynamic_ui_* minimum)](#8-data-model-dynamicui-minimum)
- [9. Enrollment Flow (no shell edits)](#9-enrollment-flow-no-shell-edits)
- [10. Hard Gates (must pass to claim “enrolled”)](#10-hard-gates-must-pass-to-claim-enrolled)
- [11. Universal UI Design Standards (applies to all widgets and pages)](#11-universal-ui-design-standards-applies-to-all-widgets-and-pages)
  - [11.1 Typography](#111-typography)
  - [11.2 Color and semantics](#112-color-and-semantics)
  - [11.3 Spacing and layout](#113-spacing-and-layout)
  - [11.4 Responsive rules](#114-responsive-rules)
  - [11.5 Accessibility (WCAG AA gate)](#115-accessibility-wcag-aa-gate)
- [12. Persona-Oriented Workspace (role-aware by contract)](#12-persona-oriented-workspace-role-aware-by-contract)
- [13. Real-time Interface (when enabled)](#13-real-time-interface-when-enabled)
  - [13.1 Route-level flag](#131-route-level-flag)
  - [13.2 Minimum real-time signals (when enabled)](#132-minimum-real-time-signals-when-enabled)
  - [13.3 Rules](#133-rules)
- [14. Workflow-Native Actions (governed UI)](#14-workflow-native-actions-governed-ui)
  - [14.1 Minimum workflow states surfaced](#141-minimum-workflow-states-surfaced)
  - [14.2 Action validity law](#142-action-validity-law)
- [15. Explainability and Trust (UI must explain itself)](#15-explainability-and-trust-ui-must-explain-itself)
  - [15.1 “Why am I seeing this?”](#151-why-am-i-seeing-this)
  - [15.2 Decision preview before write](#152-decision-preview-before-write)
- [16. Evidence Fabric (operating evidence by default)](#16-evidence-fabric-operating-evidence-by-default)
- [17. “Time Machine” / History Replay (audit-grade UX)](#17-time-machine-history-replay-audit-grade-ux)
- [18. Global Operating Cockpit Layers (cross-module)](#18-global-operating-cockpit-layers-cross-module)
  - [18.1 Command palette](#181-command-palette)
  - [18.2 Global work queue](#182-global-work-queue)
  - [18.3 Trust center (in-product)](#183-trust-center-in-product)
- [19. AI Experience Operating Layer (enterprise-safe AI UX)](#19-ai-experience-operating-layer-enterprise-safe-ai-ux)
  - [19.1 AI Trust Layer (required for all AI outputs)](#191-ai-trust-layer-required-for-all-ai-outputs)
  - [19.2 AI action receipt (required for AI-assisted actions)](#192-ai-action-receipt-required-for-ai-assisted-actions)
  - [19.3 AI decision preview (required for sensitive writes)](#193-ai-decision-preview-required-for-sensitive-writes)
  - [19.4 AI Workbench per page](#194-ai-workbench-per-page)
  - [19.5 Arabic-first AI experience](#195-arabic-first-ai-experience)
  - [19.6 AI memory with governance](#196-ai-memory-with-governance)
  - [19.7 Risk-aware UI](#197-risk-aware-ui)
- [20. Dynamic Agent UI (contract-driven; not “agents page”)](#20-dynamic-agent-ui-contract-driven-not-agents-page)
  - [20.1 Agent hierarchy (universal)](#201-agent-hierarchy-universal)
  - [20.2 Module agent contract (module-owned)](#202-module-agent-contract-module-owned)
  - [20.3 Page-level agent experience (per route)](#203-page-level-agent-experience-per-route)
  - [20.4 Workflow agents (attached to workflow transitions)](#204-workflow-agents-attached-to-workflow-transitions)
  - [20.5 Squad agents (multi-agent orchestration)](#205-squad-agents-multi-agent-orchestration)
  - [20.6 Reusable agent UI components (build once)](#206-reusable-agent-ui-components-build-once)
  - [20.7 Agent data model (minimum)](#207-agent-data-model-minimum)
  - [20.8 Agent permission levels (hard law)](#208-agent-permission-levels-hard-law)
  - [20.9 Agent gates (must pass)](#209-agent-gates-must-pass)
- [21. Page Quality Gate (internal readiness scoring)](#21-page-quality-gate-internal-readiness-scoring)
- [22. Implementation Phases (recommended build order)](#22-implementation-phases-recommended-build-order)
- [23. Enterprise Design System (global) + Module Personality (tokens)](#23-enterprise-design-system-global-module-personality-tokens)
- [24. Global Visual Language (universal)](#24-global-visual-language-universal)
  - [24.1 Core direction](#241-core-direction)
  - [24.2 Global layout skeleton](#242-global-layout-skeleton)
  - [24.3 Global tokens (baseline)](#243-global-tokens-baseline)
  - [24.4 Shape and sizing rules](#244-shape-and-sizing-rules)
  - [24.5 Interaction states (required everywhere)](#245-interaction-states-required-everywhere)
- [25. Module Personality Tokens (examples; applies to any module)](#25-module-personality-tokens-examples-applies-to-any-module)
  - [25.1 Foundation module](#251-foundation-module)
  - [25.2 Risk AI module](#252-risk-ai-module)
  - [25.3 Workflow module](#253-workflow-module)
  - [25.4 Compliance module](#254-compliance-module)
  - [25.5 Agent UI style by module (personality within the same system)](#255-agent-ui-style-by-module-personality-within-the-same-system)
- [26. Universal Advanced Components (build once; reuse everywhere)](#26-universal-advanced-components-build-once-reuse-everywhere)
  - [26.1 Page Masthead (every page)](#261-page-masthead-every-page)
  - [26.2 Command Center (module overview only)](#262-command-center-module-overview-only)
  - [26.3 Smart Data Grid (list pages)](#263-smart-data-grid-list-pages)
  - [26.4 Entity 360 Panel (object pages)](#264-entity-360-panel-object-pages)
  - [26.5 Agent Workbench Panel (all pages when enabled)](#265-agent-workbench-panel-all-pages-when-enabled)
  - [26.6 Recommendation Card (AI findings)](#266-recommendation-card-ai-findings)
  - [26.7 Decision Preview Panel (before sensitive writes)](#267-decision-preview-panel-before-sensitive-writes)
  - [26.8 Evidence Drawer (compliance, audit, AI, workflow)](#268-evidence-drawer-compliance-audit-ai-workflow)
  - [26.9 Workflow Canvas (workflow-enabled pages)](#269-workflow-canvas-workflow-enabled-pages)
  - [26.10 Audit Timeline (important objects)](#2610-audit-timeline-important-objects)
- [27. Page Archetypes (universal mapping)](#27-page-archetypes-universal-mapping)
- [28. Module Page Style Profiles (illustrative; not exhaustive)](#28-module-page-style-profiles-illustrative-not-exhaustive)
  - [28.1 Foundation (illustrative mapping)](#281-foundation-illustrative-mapping)
  - [28.2 Risk AI (illustrative mapping)](#282-risk-ai-illustrative-mapping)
  - [28.3 Workflow (illustrative mapping)](#283-workflow-illustrative-mapping)
  - [28.4 Compliance (illustrative mapping)](#284-compliance-illustrative-mapping)
- [29. Implementation Instruction (copy/paste for agents)](#29-implementation-instruction-copypaste-for-agents)
- [30. Approved Part B Decisions (must be enforced by design)](#30-approved-part-b-decisions-must-be-enforced-by-design)
  - [30.1 Resolver-only UI permission gating](#301-resolver-only-ui-permission-gating)
  - [30.2 Backend RLS as authority](#302-backend-rls-as-authority)
  - [30.3 Generic renderer + signature widget composition](#303-generic-renderer-signature-widget-composition)
  - [30.4 Strict KPI hierarchy](#304-strict-kpi-hierarchy)
  - [30.5 Command palette from enrolled contracts](#305-command-palette-from-enrolled-contracts)
  - [30.6 Evidence/audit middleware for governed actions](#306-evidenceaudit-middleware-for-governed-actions)
- [31. Universal Module Style Contract (moduleStyleTokens)](#31-universal-module-style-contract-modulestyletokens)
- [32. All-Module Style Map (contract-first; no custom CSS)](#32-all-module-style-map-contract-first-no-custom-css)
  - [32.1 Foundation (`foundation`)](#321-foundation-foundation)
  - [32.2 Risk AI (`risk`)](#322-risk-ai-risk)
  - [32.3 Compliance Controls (`compliance`)](#323-compliance-controls-compliance)
  - [32.4 Workflow (`workflow`)](#324-workflow-workflow)
  - [32.5 Governance Policy (`policy`)](#325-governance-policy-policy)
  - [32.6 Evidence / Audit Reporting (`evidence`)](#326-evidence-audit-reporting-evidence)
  - [32.7 Privacy (`privacy`)](#327-privacy-privacy)
  - [32.8 Vendor (`vendor`)](#328-vendor-vendor)
  - [32.9 Asset (`asset`)](#329-asset-asset)
  - [32.10 BCP (`bcp`)](#3210-bcp-bcp)
  - [32.11 Training (`training`)](#3211-training-training)
  - [32.12 Remediation / Action (`action`)](#3212-remediation-action-action)
  - [32.13 DORA (`dora`)](#3213-dora-dora)
  - [32.14 Qiyas Journey (`journey`)](#3214-qiyas-journey-journey)
  - [32.15 Analytics (`analytics`)](#3215-analytics-analytics)
  - [32.16 Reporting (`reporting`)](#3216-reporting-reporting)
  - [32.17 Executive Intelligence (`executive`)](#3217-executive-intelligence-executive)
  - [32.18 AI Governance (`ai-governance`)](#3218-ai-governance-ai-governance)
  - [32.19 AI Gateway / AI Engine (`ai-engine`)](#3219-ai-gateway-ai-engine-ai-engine)
  - [32.20 DSOC (`dsoc`)](#3220-dsoc-dsoc)
  - [32.21 DNOC (`dnoc`)](#3221-dnoc-dnoc)
  - [32.22 DAuth / Identity Authorization (`dauth`)](#3222-dauth-identity-authorization-dauth)
  - [32.23 Tenant / Workspace / Config Center (`config-center`)](#3223-tenant-workspace-config-center-config-center)
  - [32.24 Notifications / Inbox (`notifications`)](#3224-notifications-inbox-notifications)
  - [32.25 Records (`records`)](#3225-records-records)
  - [32.26 Integrations (`integrations`)](#3226-integrations-integrations)
  - [32.27 MCP Gateway (`mcp`)](#3227-mcp-gateway-mcp)
  - [32.28 Portals (`portals`)](#3228-portals-portals)
  - [32.29 Dashboard Widgets (`widgets`)](#3229-dashboard-widgets-widgets)
  - [32.30 Platform Product (`product`)](#3230-platform-product-product)
  - [32.31 AGRC OS (`agrc-os`)](#3231-agrc-os-agrc-os)
  - [32.32 Platform Admin (`platform-admin`)](#3232-platform-admin-platform-admin)
  - [32.33 User/Profile (`user-profile`)](#3233-userprofile-user-profile)
  - [32.34 Audit Trail (`audit-trail`)](#3234-audit-trail-audit-trail)
- [33. Agent Tone Families (global consistency rules)](#33-agent-tone-families-global-consistency-rules)
  - [33.1 Governance/Identity modules](#331-governanceidentity-modules)
  - [33.2 Risk/Compliance/Audit modules](#332-riskcomplianceaudit-modules)
  - [33.3 Operations modules](#333-operations-modules)
  - [33.4 Executive modules](#334-executive-modules)
- [34. All-Module Agent Instruction (copy/paste)](#34-all-module-agent-instruction-copypaste)
- [35. Appendix — ModuleStyleTokens Examples (JSON)](#35-appendix-modulestyletokens-examples-json)
  - [35.1 Foundation (`foundation`)](#351-foundation-foundation)
  - [35.2 Risk AI (`risk`)](#352-risk-ai-risk)
  - [35.3 Compliance (`compliance`)](#353-compliance-compliance)
  - [35.4 Workflow (`workflow`)](#354-workflow-workflow)
  - [35.5 DAuth (`dauth`)](#355-dauth-dauth)
  - [35.6 Executive (`executive`)](#356-executive-executive)
- [36. Shahin SPA Shell Incident Playbook (P0)](#36-shahin-spa-shell-incident-playbook-p0)
  - [36.1 Canonical roots and boundaries](#361-canonical-roots-and-boundaries)
  - [36.2 Read-only incident proof](#362-read-only-incident-proof)
  - [36.3 Restore the SPA build artifact](#363-restore-the-spa-build-artifact)
  - [36.4 Prevention guard (no Docker/cloud/source drift)](#364-prevention-guard-no-dockercloudsource-drift)
  - [36.5 Inventory scattered files (no moves)](#365-inventory-scattered-files-no-moves)

## 0. Scope

This specification defines the **universal, contract-driven UI standard** for the platform:

- **Enroll any module once** and automatically apply:
  - navigation
  - route exposure
  - page type and layout
  - theme tokens
  - KPI visibility rules
  - page actions
  - widgets and signature experiences
  - role/profile-based experience
  - agent/workflow/audit integration where applicable

This spec is **module-agnostic** and must be usable by any module without hardcoding module names inside the shell.

## 0.1 Non-goals

- Redesigning architecture or introducing parallel UI systems.
- Per-module shell logic, per-module CSS, or “Foundation-only” rules.
- Implementing feature behavior by “UI hiding”; backend authorization remains mandatory.

## 0.2 Implementation Plan (Aligned)

This section integrates the aligned plan content originally captured in:

- `DOS-AIO-Specs/5a2f2c4c-2b29-4b92-9c47-5c2d46f2a81f_plan.md`

### Objective

Keep implementation work aligned with this governing specification, including the Part B enforcement decisions (§30).

### Deliverables

1. Module contracts include `moduleStyleTokens` for all enrolled modules (see §31 and §32).
2. All routes include:
   - `pageType`, `layout`, `kpiScope`, `titleKey` (see §2.3 and §3.2)
   - `signatureWidget` (or explicit generic fallback) and `mobileVariant` (see §7 and §27)
3. SPA uses:
   - `DynamicPageExperienceResolver` for all visibility decisions (see §3.3 and §30.1)
   - generic page-type renderers + signature widget composition (see §6 and §30.3)
4. Governed actions enforce:
   - backend RLS authority (see §30.2)
   - workflow state gating (see §14 and §30.6)
   - evidence/audit middleware and decision preview for risky writes (see §15.2, §16, §30.6)
5. Command palette reads only from enrolled contracts and resolved permissions (see §18.1 and §30.5).

### Validation gates

Use the all-module acceptance gate:

- §21 Page Quality Gate

### Notes

- No random module CSS.
- No shell hardcoding by module name.
- No frontend-only authorization.

## 1. Canonical Architecture

```text
Module Contract
   ↓
Dynamic UI Contract Publisher
   ↓
dynamic_ui_* DB tables
   ↓
/api/dynamic-ui/contract/:moduleCode
   ↓
SPA DynamicUiBootstrapService
   ↓
ShellHostComponent + Renderer Registry + Theme Service
   ↓
Module UI appears correctly
```

### 1.1 Shell knowledge boundary

The shell must not know “Foundation”, “Risk”, “Compliance”, etc.

The shell may only react to normalized contract fields such as:

```text
pageType
layout
kpiScope
theme
slots
actions
permissions
componentKey
dataResource
signatureWidget
secondaryWidgets
userIntent
dataScope
audienceProfiles
realtimeEnabled
workflowEnabled
auditEnabled
agentEnabled
```

## 2. Module UI Contract (module-owned)

### 2.1 Contract file location

Each module owns a contract file:

```text
DOS Platform/<Module Name>/contracts/ui.contract.json
```

### 2.2 Contract schema (minimum)

```json
{
  "moduleCode": "foundation",
  "displayName": { "en": "Foundation", "ar": "الأساس" },
  "theme": {
    "accent": "emerald",
    "icon": "account_tree",
    "density": "comfortable",
    "surface": "enterprise-light"
  },
  "navigation": [
    { "route": "/foundation/overview", "labelKey": "foundation.overview.title", "icon": "dashboard", "order": 1 }
  ],
  "routes": [
    {
      "route": "/foundation/overview",
      "componentKey": "FoundationOverviewPage",
      "pageType": "overview",
      "layout": "dashboard",
      "kpiScope": "module-overview",
      "permission": "foundation:read",
      "titleKey": "foundation.overview.title",
      "dataResource": "foundation.overview"
    }
  ]
}
```

### 2.3 Route contract fields (required)

```ts
type DynamicRouteContract = {
  moduleCode: string;
  route: string;
  componentKey?: string;
  titleKey: string;
  permission?: string;
  dataResource?: string;

  pageType:
    | 'overview'
    | 'list'
    | 'object'
    | 'workflow'
    | 'analytics'
    | 'audit'
    | 'settings';

  layout:
    | 'dashboard'
    | 'full-page'
    | 'split-view'
    | 'object-page'
    | 'wizard'
    | 'report';

  kpiScope: 'module-overview' | 'page-local' | 'none';
};
```

#### kpiScope rules

```text
overview page      → kpiScope = module-overview
operational pages  → kpiScope = none
record pages       → kpiScope = none
special pages      → kpiScope = page-local only if needed
```

## 3. Page Experience Contract (user-profile oriented)

Dynamic UI must resolve **what the user sees on a page**, not only which component opens.

```text
Module Contract
  → Route Contract
  → Page Experience Contract
  → User Context Resolver
  → Final Rendered Page
```

### 3.1 Normalized UserContext (required input)

Every page must receive the same normalized user context:

```ts
type UserContext = {
  userId: string;
  tenantId: string;
  locale: 'ar' | 'en';
  direction: 'rtl' | 'ltr';

  roles: string[];
  permissions: string[];
  modules: string[];

  profileType:
    | 'tenant_owner'
    | 'platform_admin'
    | 'foundation_admin'
    | 'hr_manager'
    | 'department_manager'
    | 'auditor'
    | 'viewer'
    | 'external_user';

  orgScope?: {
    organizationIds: string[];
    businessUnitIds: string[];
    departmentIds: string[];
    teamIds: string[];
  };

  preferences?: {
    density: 'compact' | 'comfortable';
    defaultLanguage: 'ar' | 'en';
    favoriteViews: string[];
  };
};
```

UserContext must be derived from canonical endpoints such as:

```text
/api/auth/oidc/session
/api/access/my-permissions
/api/dynamic-ui/contract/:moduleCode
```

### 3.2 PageExperienceContract (required per route)

```ts
type DynamicAction = {
  id: string;
  labelKey: string;
  permission?: string;
  profiles?: string[];
  kind?: 'primary' | 'secondary' | 'danger' | 'link';
};

type PageExperienceContract = {
  route: string;
  titleKey: string;
  pageType: DynamicRouteContract['pageType'];
  layout: Exclude<DynamicRouteContract['layout'], 'report'> | 'report';
  kpiScope: DynamicRouteContract['kpiScope'];

  userIntent: 'monitor' | 'manage' | 'review' | 'approve' | 'investigate' | 'configure' | 'report';
  audienceProfiles: string[];

  visibleWhen: {
    permissions?: string[];
    roles?: string[];
    modules?: string[];
  };

  dataScope: { mode: 'tenant' | 'org_scope' | 'department_scope' | 'self' | 'global' };

  primaryActions: DynamicAction[];
  secondaryActions: DynamicAction[];

  defaultView: {
    tableDensity?: 'compact' | 'normal';
    defaultFilters?: Record<string, unknown>;
    defaultSort?: string;
  };

  emptyStateKey: string;
  errorStateKey: string;
  helpKey?: string;
};
```

### 3.3 Resolver (single source of runtime truth)

Create one resolver in SPA:

```text
DynamicPageExperienceResolver
```

It must resolve runtime experience from:

```text
route contract + page experience contract + UserContext + permissions + tenant entitlements + locale/direction
```

Resolved output shape:

```ts
type ResolvedPageExperience = {
  title: string;
  direction: 'rtl' | 'ltr';
  layout: DynamicRouteContract['layout'];
  kpiScope: DynamicRouteContract['kpiScope'];
  readonly: boolean;

  visibleActions: DynamicAction[];
  hiddenActions: DynamicAction[];

  dataScope: { mode: PageExperienceContract['dataScope']['mode'] };

  emptyState: string;
  errorState: string;
};
```

### 3.4 Rendering rule (hard law)

Bad:

```ts
if (user.role === 'admin') showButton();
```

Good:

```ts
visibleActions = pageExperience.visibleActions;
```

Components render from the resolved contract. They do not embed role logic for visibility decisions.

### 3.5 Page Experience gates (must pass)

```text
1. Page title comes from contract titleKey.
2. Page actions come from resolved user permissions.
3. Page data is scoped to tenant/org/user profile.
4. Auditor profile is read-only.
5. Manager profile sees only scoped records.
6. Admin/owner can manage.
7. Empty/error/loading states are localized.
8. Arabic uses RTL correctly.
9. English uses LTR correctly.
10. No hardcoded role logic inside component for visibility.
```

## 4. Shell Behavior Rules (contract-driven)

### 4.1 KPI strip

The shell must show module KPI strip only when:

```ts
const route = activeDynamicRoute();
const showKpiStrip = route.kpiScope === 'module-overview' && route.pageType === 'overview';
```

### 4.2 Layout

Layout is applied only from `route.layout` and must never be inferred from module code.

### 4.3 Titles

Page titles are applied from `titleKey` and resolved through i18n. Raw keys must never render in production UI.

## 5. Theme Tokens (module accent without chaos)

Modules may supply theme tokens, but must stay within the global design system.

Theme contract example:

```json
{
  "theme": {
    "accent": "emerald",
    "icon": "account_tree",
    "density": "comfortable",
    "surface": "enterprise-light",
    "pageHeaderVariant": "standard",
    "tableDensity": "normal",
    "cardStyle": "enterprise"
  }
}
```

Runtime application example:

```ts
document.documentElement.style.setProperty('--module-accent', theme.accent);
document.body.dataset.module = moduleCode;
document.body.dataset.pageType = pageType;
document.body.dataset.layout = layout;
```

Rule: module styles must be **tokens**, not custom per-module CSS.

## 6. Renderer Registry (generic first, custom second)

Generic renderers by page type:

```ts
const PAGE_RENDERERS = {
  overview: OverviewPageRenderer,
  list: ListPageRenderer,
  object: ObjectPageRenderer,
  workflow: WorkflowPageRenderer,
  analytics: AnalyticsPageRenderer,
  audit: AuditPageRenderer,
  settings: SettingsPageRenderer
};
```

Allowlist for custom components only when needed:

```ts
const COMPONENT_MAP = {
  FoundationOverviewPage,
  FoundationLocationsPage,
  FoundationCommitteesPage,
  RiskRegisterPage,
  ComplianceControlsPage
};
```

Rule:

```text
If componentKey exists → render custom component.
If not → render generic pageType renderer from contract.
```

## 7. Widgets (signature widget per page)

### 7.1 Rule

Every page must have one main **signature widget** that matches the job of that page.

Pages must not be passive tables only. Each page experience should support (when applicable):

```text
live data
actions
AI assistance
workflow state
audit trail
permission-aware controls
```

### 7.2 Core widget types (build once; reuse everywhere)

```text
1. Smart Data Grid
2. KPI Strip
3. Work Queue
4. Timeline / Audit Trail
5. Approval Workflow Panel
6. Agent Copilot Panel
7. Entity 360 Profile
8. Relationship Graph
9. Org / Hierarchy Canvas
10. RACI / Ownership Matrix
11. Kanban Workflow Board
12. Risk / Compliance Heatmap
13. Map / Geo Coverage Widget
14. Document / Evidence Viewer
15. Decision Room
16. Bulk Action Wizard
17. Policy Impact Analyzer
18. SoD Conflict Analyzer
19. Permission Matrix
20. Live Activity Feed
21. AI Recommendations Panel
22. Task / SLA Tracker
23. Readiness Scorecard
24. Guided Form / Wizard
25. Simulation / What-if Panel
```

Each widget must support:

```text
real data
permissions
role/profile filtering
Arabic/English
RTL/LTR
loading state
empty state
error state
audit event
agent action
workflow action
```

### 7.3 Widget contract shape (per route)

```json
{
  "route": "/foundation/committees",
  "pageType": "list",
  "layout": "full-page",
  "signatureWidget": {
    "type": "decision-room",
    "dataResource": "foundation.committees",
    "agentEnabled": true,
    "workflowEnabled": true,
    "auditEnabled": true
  },
  "secondaryWidgets": [
    { "type": "smart-grid", "dataResource": "foundation.committees" },
    { "type": "timeline", "dataResource": "foundation.committeeDecisions" }
  ]
}
```

### 7.4 Widget selection rules by pageType

```text
Overview page:
  Command Center widget

List page:
  Smart Grid + one domain-specific visual widget

Object page:
  Entity 360 + Timeline + Workflow Panel

Workflow page:
  Approval Panel + SLA Tracker + Agent Assistant

Audit page:
  Forensic Timeline

Settings page:
  Control Center

Analytics page:
  Heatmap / Trend / Scorecard
```

### 7.5 Agent actions on widgets (contract-driven)

Widget action contract example:

```json
{
  "agentActions": [
    { "id": "summarize", "labelKey": "agent.actions.summarize", "agentId": "A01" },
    { "id": "detect-gaps", "labelKey": "agent.actions.detectGaps", "agentId": "A07" },
    { "id": "prepare-approval", "labelKey": "agent.actions.prepareApproval", "agentId": "A09" }
  ]
}
```

Agent action laws:

```text
permission-checked
audited
workflow-aware
never auto-write without approval
visible only when useful
```

## 8. Data Model (dynamic_ui_* minimum)

Dynamic UI persistence should include at least:

```text
dos.dynamic_ui_modules
dos.dynamic_ui_navigation
dos.dynamic_ui_routes
dos.dynamic_ui_kpis
dos.dynamic_ui_actions
dos.dynamic_ui_data_resources
dos.dynamic_ui_theme_tokens
dos.dynamic_ui_i18n_keys
```

Critical fields for `dos.dynamic_ui_routes`:

```text
module_code
route
component_key
page_type
layout
kpi_scope
permission_key
title_key
data_resource_key
order_index
is_active
```

Critical fields for `dos.dynamic_ui_theme_tokens`:

```text
module_code
accent
icon
density
surface
table_density
page_header_variant
```

## 9. Enrollment Flow (no shell edits)

For any new module:

```text
1. Create module-owned ui.contract.json
2. Run contract publisher
3. Seed dynamic_ui_* tables
4. Add allowed component keys if custom components exist
5. Run drift smoke
6. Build SPA
7. Verify route-catalog
```

## 10. Hard Gates (must pass to claim “enrolled”)

```text
/api/dynamic-ui/contract/{moduleCode} returns module contract
/api/dynamic-ui/route-catalog includes all active routes
every route has pageType
every route has layout
every route has kpiScope
every route has titleKey
navigation renders from contract
overview page shows module KPIs
non-overview pages do not show overview KPIs
permissions filter navigation
SPA build passes
drift test passes
```

## 11. Universal UI Design Standards (applies to all widgets and pages)

### 11.1 Typography

- Page title: strong hierarchy, single-line truncation with tooltip on overflow.
- Arabic-first support with proper shaping; English parity.
- Avoid rendering raw translation keys (must have localized fallback).

### 11.2 Color and semantics

- Neutral-first surfaces; accent used sparingly.
- Semantic colors represent meaning (success/warning/danger/info) and must not be color-only indicators.

### 11.3 Spacing and layout

- Use a consistent spacing scale across modules.
- Layout must be stable across loading/empty/error states (avoid layout shift).

### 11.4 Responsive rules

- Mobile must not be “squeezed desktop table”; provide mobile variants for widgets.
- Touch targets must meet enterprise mobile ergonomics.

### 11.5 Accessibility (WCAG AA gate)

- Full keyboard navigation.
- Visible focus states.
- Proper labels and announcements for forms and dynamic regions.
- Respect reduced motion preferences.
- RTL accessibility must preserve reading and focus order.

## 12. Persona-Oriented Workspace (role-aware by contract)

The same module and route must support different experiences by profile:

```text
Tenant Owner       → operating cockpit, risk, approvals, readiness
Foundation Admin   → org/users/roles/configuration
HR Manager         → users, departments, positions, teams
Auditor            → read-only, audit, evidence, access review
Department Manager → scoped users/tasks/requests
Viewer             → limited read-only views
```

Rules:

- The difference is implemented via **UserContext + PageExperienceContract**, not by ad-hoc conditionals in components.
- Persona affects:
  - visible actions
  - default filters and saved views
  - widget variants
  - data scope
  - read-only enforcement

## 13. Real-time Interface (when enabled)

Premium enterprise UX must not require refresh to reflect operational state changes.

### 13.1 Route-level flag

Each route must declare whether real-time is used:

```text
realtimeEnabled: true|false
```

### 13.2 Minimum real-time signals (when enabled)

```text
pending approvals count
new audit events
workflow state changes
AI recommendation status
background export status
access-review campaign progress
```

### 13.3 Rules

- Real-time must be tenant-scoped and permission-scoped.
- Real-time updates must not mutate UI into an inconsistent state; updates must re-run resolvers as needed.
- Real-time failures must degrade gracefully and be observable.

## 14. Workflow-Native Actions (governed UI)

Every operational page that changes governed records must expose workflow state and only valid actions.

### 14.1 Minimum workflow states surfaced

```text
Draft
Pending review
Approved
Rejected
Expired
Blocked by SoD
Needs owner
Needs evidence
Ready for approval
```

### 14.2 Action validity law

Actions must appear only when valid for:

```text
user permissions + workflow step + SoD rules + tenant scope
```

Examples of actions that must be gated:

```text
Submit for approval
Approve
Reject
Request changes
Assign owner
Revoke
Delegate
Export evidence
Start review
```

## 15. Explainability and Trust (UI must explain itself)

### 15.1 “Why am I seeing this?”

Every page/action/widget must be able to explain:

```text
You see this because you are <Profile>
This button is hidden because you lack <permission>
This record is scoped to your department/org scope
This approval is blocked due to SoD/policy
```

Rules:

- Explanations must be localized and safe (no leaking restricted info).
- Blocked states must show the reason and the remediation path (where allowed).

### 15.2 Decision preview before write

Before any sensitive action:

```text
Assign role
Approve delegation
Deactivate user
Approve policy
Change permission matrix
Close access review
```

Show a decision preview:

```text
Before state
After state
Affected users/entities
Risk level
SoD impact
Workflow impact
Audit event that will be created
Rollback option (where supported)
```

## 16. Evidence Fabric (operating evidence by default)

Every governed action must produce operating evidence:

```text
who changed it
why (reason)
when
approval path
before/after diff
policy/control link
attachment/evidence links
AI explanation (if AI assisted)
correlation id
```

Rules:

- Evidence is tenant-scoped, permission-aware, and auditable.
- Evidence must be queryable by auditors through approved read surfaces.

## 17. “Time Machine” / History Replay (audit-grade UX)

The platform must support “as-of” and diff views for critical objects and changes:

```text
Show entity state as of a date
Compare role matrix before/after
Replay committee decision history
Show permissions before change
Show policy lifecycle timeline
```

Rules:

- Uses canonical audit/evidence storage and correlation IDs.
- Must not expose data outside the user’s permitted scope.

## 18. Global Operating Cockpit Layers (cross-module)

These are platform-level UX layers that must be consistent across all modules.

### 18.1 Command palette

Global shortcut:

```text
Ctrl+K → search commands and navigation
```

Commands must cover:

```text
create
open
find
run workflow
ask agent
generate report
go to route
```

### 18.2 Global work queue

Every user must have a unified queue:

```text
Approvals waiting for me
Tasks assigned to me
Access reviews pending
Policies expiring
Delegations needing approval
Evidence requests
AI recommendations
```

### 18.3 Trust center (in-product)

A built-in readiness/trust page must surface:

```text
system health
auth status
audit logging status
tenant isolation status
policy/SoD enforcement status
backup status
SLA status
data residency
integration status
```

## 19. AI Experience Operating Layer (enterprise-safe AI UX)

AI UI must be human-centered, explainable, and behaviorally consistent.

### 19.1 AI Trust Layer (required for all AI outputs)

Every AI output must show:

```text
source
confidence
reasoning summary
data used
last updated
permission scope
risk level
human approval required or not
```

### 19.2 AI action receipt (required for AI-assisted actions)

Every AI-assisted action must create a receipt:

```text
recommendation
human approval
permission check
SoD check
workflow created/advanced
audit record written
evidence linked
rollback reference (if available)
```

### 19.3 AI decision preview (required for sensitive writes)

AI-assisted sensitive actions must always route through the decision preview in §15.2.

### 19.4 AI Workbench per page

Each page may host an AI Workbench panel with commands such as:

```text
Ask
Explain
Summarize
Detect gaps
Generate draft
Compare
Simulate
Prepare approval
Create task
```

Rules:

- Available commands vary by route and profile.
- Commands must be permission-checked and scoped.

### 19.5 Arabic-first AI experience

Arabic cannot be “translated UI”. AI must support:

```text
Arabic prompts and explanations
Arabic workflow comments and summaries
Arabic reports and exports (where applicable)
RTL-native interaction
English parity
```

### 19.6 AI memory with governance

If memory exists, it must be:

```text
visible
editable
tenant-scoped
permission-aware
audited
```

### 19.7 Risk-aware UI

UI behavior changes by risk:

```text
low risk → normal confirm
medium risk → stronger confirmation
high risk → decision preview + workflow approval
blocked → explain SoD/policy reason
```

## 20. Dynamic Agent UI (contract-driven; not “agents page”)

Dynamic UI must render agent experiences from contract, across all modules.

### 20.1 Agent hierarchy (universal)

```text
L0 — Global Platform Agents
L1 — Module Agents
L2 — Page Agents
L3 — Workflow Agents
L4 — Squad Agents
L5 — Autonomous/Scheduled Agents
```

### 20.2 Module agent contract (module-owned)

Each module should have:

```text
contracts/agent.contract.json
```

Example:

```json
{
  "moduleCode": "foundation",
  "agents": [
    {
      "agentId": "foundation-org-agent",
      "nameKey": "agents.foundationOrg.name",
      "scope": "module",
      "capabilities": ["detect_org_gaps", "suggest_owner", "summarize_structure"],
      "allowedPageTypes": ["overview", "list", "object"],
      "allowedActions": ["read", "analyze", "draft"],
      "requiresHumanApproval": true,
      "auditRequired": true
    }
  ]
}
```

### 20.3 Page-level agent experience (per route)

Routes define which agent actions appear:

```json
{
  "route": "/foundation/users",
  "pageType": "list",
  "agentExperience": {
    "enabled": true,
    "primaryAgent": "foundation-access-agent",
    "mode": "side-panel",
    "actions": [
      { "id": "explain-user-access", "labelKey": "agents.actions.explainUserAccess", "permission": "users:read", "level": "analyze" },
      { "id": "prepare-access-review", "labelKey": "agents.actions.prepareAccessReview", "permission": "access_review:create", "level": "workflow", "requiresApproval": true }
    ]
  }
}
```

Rule: no page should show a generic “Ask AI” only; it must expose **the right agent actions** for the job.

### 20.4 Workflow agents (attached to workflow transitions)

Workflow contracts must be able to attach agent actions per step:

```text
request_created → validate scope, detect circular delegation
pending_approval → check SoD conflict, prepare approval brief, simulate impact
approved → write evidence summary, notify impacted users
```

### 20.5 Squad agents (multi-agent orchestration)

Squad rules:

```text
analyze and draft is allowed
writes require explicit human approval
every handoff is logged
max delegation depth enforced
circular delegation prevented
```

### 20.6 Reusable agent UI components (build once)

```text
Agent Workbench Panel
Agent Recommendation Card
Agent Workflow Canvas
Squad Run Timeline
Decision Preview Panel
AI Evidence Drawer
Agent Action Receipt
Agent Command Palette
Agent Inbox / Work Queue
Agent Guardrail Banner
```

### 20.7 Agent data model (minimum)

```text
dos.dynamic_ui_agents
dos.dynamic_ui_agent_actions
dos.dynamic_ui_page_agents
dos.dynamic_ui_workflow_agents
dos.dynamic_ui_agent_squads
dos.dynamic_ui_agent_squad_members
dos.agent_runs
dos.agent_run_steps
dos.agent_action_receipts
dos.agent_recommendations
dos.agent_evidence_links
```

### 20.8 Agent permission levels (hard law)

```text
Level 0 — Read UI only
Level 1 — Read backend data
Level 2 — Analyze
Level 3 — Draft
Level 4 — Propose write (approval required)
Level 5 — Execute approved write
Level 6 — Scheduled automation (policy-limited)
```

No agent should jump from analysis to write.

### 20.9 Agent gates (must pass)

PASS only if:

```text
module has agent.contract.json
all agent actions have permission keys
all write/propose actions require human approval
every agent run writes a ledger row
every squad handoff is logged
low-confidence output is marked
evidence sources are shown
UI shows action receipt after execution
Arabic/English labels exist
auditor profile is read-only
```

FAIL if:

```text
agent action appears without permission check
agent can write directly without approval
no audit receipt
squad handoff invisible
action hidden only by frontend while backend allows it
```

## 21. Page Quality Gate (internal readiness scoring)

Every module and every active route must pass this gate before production UI acceptance:

```text
1. moduleStyleTokens exists.
2. Every route has pageType.
3. Every route has layout.
4. Every route has kpiScope.
5. Every route has titleKey.
6. Every route has signatureWidget or explicit generic fallback.
7. Overview page uses Command Center.
8. Operational pages do not inherit overview KPI cards/strip.
9. Agent actions are permission-checked (resolver-driven).
10. Workflow actions are state-checked (eligibility + step).
11. Risky write actions open Decision Preview.
12. Evidence-required actions open Evidence Drawer.
13. Audit timeline exists for object/write pages (where applicable).
14. Arabic labels exist.
15. English labels exist.
16. RTL is tested.
17. LTR is tested.
18. Mobile 390px is tested.
19. Desktop 1440px is tested.
20. No raw i18n keys.
21. No raw HTTP error text rendered to end users.
22. No fake data.
23. No frontend-only authorization (backend remains authoritative).
24. Backend RLS remains authoritative.
25. SSE/realtime channels declared where live updates are needed.
26. Command Palette includes module/page actions derived from enrolled contracts.
27. “Why am I seeing this?” reason exists for gated surfaces.
28. Build passes.
29. Drift test passes.
30. Negative permission test passes.
```

## 22. Implementation Phases (recommended build order)

```text
Phase 1: Page Experience Contract
Phase 2: User Context Resolver
Phase 3: Widget Registry
Phase 4: Agent Action Registry
Phase 5: Workflow Action Registry
Phase 6: Foundation proof pages
Phase 7: Apply same contract to every module
Phase 8: Global Work Queue
Phase 9: Command Palette
Phase 10: Decision Preview + Evidence Fabric gates
```

## 23. Enterprise Design System (global) + Module Personality (tokens)

The platform must use **one enterprise design system**. Modules may express personality only through contract-driven tokens, widgets, archetypes, and behaviors.

Model:

```text
Global Enterprise UI System
  → Module Style Tokens
  → Page Archetype
  → Signature Widget
  → Agent/Workflow/Evidence Layer
  → Mobile + RTL Variant
```

Rule: do not create random styles per page. All styling must be expressed as tokens and reusable components.

## 24. Global Visual Language (universal)

### 24.1 Core direction

```text
Clean enterprise light UI
Soft neutral background
High-contrast text
Controlled accent colors
Large readable cards
Strong page hierarchy
No noisy gradients everywhere
No passive empty tables
No raw technical errors
```

### 24.2 Global layout skeleton

```text
App topbar
Module shell
Page masthead
Page actions / agent actions
Main content area
Right-side agent/evidence panel
Workflow drawer / decision preview
```

### 24.3 Global tokens (baseline)

```text
Background: #F6F8FB
Surface: #FFFFFF
Surface raised: #F9FAFC
Border: #E3E8EF
Text strong: #111827
Text normal: #374151
Text muted: #6B7280

Success: emerald
Warning: amber
Danger: red
Info: blue
AI: violet/indigo
Audit/Evidence: slate
```

### 24.4 Shape and sizing rules

```text
Cards: 16–20px radius
Main panels: 20–24px radius
Buttons: 10–12px radius
Inputs: 10–12px radius
Tables: soft borders, sticky header
Right panels: drawer style, 420–520px desktop
Mobile drawers: full-screen
```

### 24.5 Interaction states (required everywhere)

Every interactive surface must support:

```text
loading state
empty state
error state
readonly state
blocked-by-permission state
approval-required state
AI recommendation state
audit/evidence state
```

## 25. Module Personality Tokens (examples; applies to any module)

Each module gets a different accent and interaction emphasis, but stays inside the enterprise system.

### 25.1 Foundation module

```text
Accent: Emerald / Teal
Mood: trust, structure, governance
Icon language: org tree, users, roles, shield
Primary widgets: graph, hierarchy, matrix, identity 360
```

### 25.2 Risk AI module

```text
Accent: Amber / Red + Purple AI
Mood: alert, intelligence, urgency
Icon language: risk, radar, warning, brain, scenario
Primary widgets: heatmap, risk radar, AI recommendations, simulation
```

### 25.3 Workflow module

```text
Accent: Blue / Cyan
Mood: movement, flow, control
Icon language: flow, approval, clock, branch, automation
Primary widgets: workflow canvas, approval queue, SLA tracker, instance timeline
```

### 25.4 Compliance module

```text
Accent: Navy / Saffron / Blue
Mood: authority, assurance, regulation
Icon language: policy, checklist, evidence, certificate, control
Primary widgets: control matrix, evidence binder, obligation map, gap board
```

### 25.5 Agent UI style by module (personality within the same system)

Foundation agents:

```text
Structured, calm, governance-focused
Agent cards: missing owner, risky access, SoD conflict, orphan org unit, delegation issue
```

Risk AI agents:

```text
Alert, analytical, high-signal
Agent cards: emerging risk, risk score changed, treatment overdue, incident correlation, scenario warning
```

Workflow agents:

```text
Process-aware, action-oriented
Agent cards: approval bottleneck, SLA breach, missing approver, evidence missing, escalation needed
```

Compliance agents:

```text
Evidence-heavy, assurance-focused
Agent cards: control gap, missing evidence, expired obligation, policy mismatch, regulatory impact
```

## 26. Universal Advanced Components (build once; reuse everywhere)

### 26.1 Page Masthead (every page)

Must show:

```text
Module name
Page title
Page purpose subtitle
Breadcrumb
Status/readiness badge
Primary actions
Agent quick actions
Why am I seeing this?
```

Layout rules:

```text
Raised surface masthead
Title/subtitle grouped
Actions grouped and permission-filtered
Mobile: actions collapse into menu; title remains primary
```

### 26.2 Command Center (module overview only)

Contains:

```text
KPI strip
Work queue
Risk/readiness signals
AI recommendations
Recent activity
Pending approvals
Quick actions
```

Rule:

```text
Only overview pages use module-level KPI strip.
Operational pages do not inherit overview cards.
```

### 26.3 Smart Data Grid (list pages)

Features:

```text
Saved views
Advanced filters
Column chooser
Bulk actions
Inline status chips
Row-level actions
Export
Selection-aware agent actions
```

Mobile rules:

```text
Table becomes record cards
Filters become drawer
Bulk actions become bottom sheet
Primary action sticky
```

### 26.4 Entity 360 Panel (object pages)

Must include (when applicable):

```text
Profile summary
Relationships
Permissions/ownership
Workflow state
Audit timeline
Evidence
AI summary
Recommended actions
```

### 26.5 Agent Workbench Panel (all pages when enabled)

Modes:

```text
Ask
Explain
Summarize
Detect gaps
Prepare draft
Simulate impact
Create workflow proposal
```

AI output must never render without:

```text
confidence
evidence/source
last updated
permission scope
human approval status
```

### 26.6 Recommendation Card (AI findings)

Fields:

```text
Finding title
Risk level
Confidence
Why it matters
Evidence count
Recommended action
Approve / dismiss / create task
```

Severity rules:

```text
Low: green
Medium: amber
High: orange/red
Critical: red + strong warning
```

### 26.7 Decision Preview Panel (before sensitive writes)

Shows:

```text
Before state
After state
Affected users/entities
Permission impact
SoD impact
Workflow impact
Audit record preview
Rollback reference
Approve / reject / request change
```

### 26.8 Evidence Drawer (compliance, audit, AI, workflow)

Shows:

```text
Documents
Screenshots
PDFs
Excel evidence
Audit events
System-generated proof
AI-used sources
```

### 26.9 Workflow Canvas (workflow-enabled pages)

Shows:

```text
Steps
Approvers
Current state
Blocked states
Agent checks
SLA timers
Evidence requirements
```

### 26.10 Audit Timeline (important objects)

Shows:

```text
Actor
Action
Entity
Timestamp
Before/after diff
Correlation ID
IP/device
Evidence link
```

## 27. Page Archetypes (universal mapping)

```text
Overview:
  Command Center + module KPIs + cross-page signals

List:
  Smart Data Grid + one domain-specific signature widget

Object:
  Entity 360 + Timeline + (Workflow Panel if governed)

Workflow:
  Workflow Canvas + SLA Tracker + Decision Preview when writing

Audit:
  Forensic Timeline + diff + export package

Settings:
  Control Center + risky-setting warnings + decision preview for sensitive changes

Analytics:
  Heatmap / trends / scorecards + drilldown to list/object

Report:
  Report Builder / Evidence Pack Builder + export lifecycle + receipts

Builder:
  Canvas / Composer (designer surfaces)
```

Rule: no module should create a page that is “just a table” unless the generic list renderer is intentionally used as fallback.

## 28. Module Page Style Profiles (illustrative; not exhaustive)

The following examples describe expected page experiences and signature widgets. Modules may add more pages, but must follow the archetype and component rules above.

### 28.1 Foundation (illustrative mapping)

```text
/foundation/overview          → Command Center
/foundation/organization      → Org Graph Canvas
/foundation/users             → Smart Grid + Identity 360
/foundation/roles             → Role Catalogue + Coverage
/foundation/roles/:id         → Role 360 + Permission Matrix
/foundation/permissions        → Permission Matrix + Decision Preview
/foundation/teams             → RACI Canvas
/foundation/locations         → Geo Coverage Map + Grid
/foundation/committees        → Decision Room
/foundation/delegations       → Authority Simulator + Timeline
/foundation/ownership-mapping → Ownership Heatmap
/foundation/access-review     → Campaign Cockpit
/foundation/policies          → Lifecycle Board
/foundation/data-processing   → RoPA Map
/foundation/reference-data    → Taxonomy Editor
/foundation/audit             → Forensic Timeline
/foundation/settings          → Tenant Control Center
```

### 28.2 Risk AI (illustrative mapping)

```text
/risk/overview     → Risk Intelligence Command Center
/risk/register     → Risk Intelligence Grid + Severity Matrix
/risk/:id          → Risk 360 + Evidence/Timeline
/risk/heatmap      → Interactive Risk Heatmap
/risk/incidents    → Incident Response Board
/risk/treatments   → Treatment Plan Tracker
/risk/kri          → KRI Monitoring Console
/risk/scenarios    → Simulation Sandbox + Decision Preview
```

### 28.3 Workflow (illustrative mapping)

```text
/workflow/overview        → Workflow Operations Command Center
/workflow/inbox           → Unified Work Queue (workflow focus)
/workflow/designer        → Workflow Designer Canvas
/workflow/instances       → Workflow Instance Monitor
/workflow/instances/:id   → Workflow Instance 360
/workflow/templates       → Template Library
/workflow/sla             → SLA & Escalation Console
```

### 28.4 Compliance (illustrative mapping)

```text
/compliance/overview      → Assurance Command Center
/compliance/obligations   → Obligation Map
/compliance/controls      → Control Library Matrix
/compliance/assessments   → Assessment Cockpit
/compliance/evidence      → Evidence Binder
/compliance/gaps          → Gap Remediation Board
/compliance/reports       → Report Builder + Evidence selection + Export
```

## 29. Implementation Instruction (copy/paste for agents)

```text
Build the advanced enterprise style system for Foundation, Risk AI, Workflow, and Compliance.

Do not create random page-specific styles.

Create one Dynamic UI design system driven by:
- moduleStyleTokens
- pageType
- layout
- kpiScope
- signatureWidget
- userIntent
- agentExperience
- workflowActions
- evidenceRequired
- mobileVariantRequired

Global components:
1. PageMasthead
2. CommandCenter
3. SmartDataGrid
4. Entity360Panel
5. AgentWorkbenchPanel
6. RecommendationCard
7. DecisionPreviewPanel
8. EvidenceDrawer
9. WorkflowCanvas
10. AuditTimeline

Module style tokens:
- Foundation: emerald/teal, structured, org graph, identity, governance
- Risk AI: amber/red/purple, analytical, heatmap, simulation, risk recommendations
- Workflow: blue/cyan, process, stepper, SLA, approvals
- Compliance: navy/saffron/blue, assurance, controls, evidence, obligations

Rules:
- Overview pages use CommandCenter.
- List pages use SmartDataGrid + signature widget.
- Object pages use Entity360Panel + AuditTimeline + AgentWorkbench (when enabled).
- Workflow pages use WorkflowCanvas + DecisionPreviewPanel (for writes).
- Audit pages use AuditTimeline.
- Evidence-heavy pages use EvidenceDrawer.
- No child page inherits module overview KPI strip/cards.
- Components must support Arabic/English, RTL/LTR, desktop/mobile.
- Agent actions must show confidence, evidence, risk, and approval requirement.
- Risky write actions must open DecisionPreviewPanel.
- No fake data.
- No frontend-only permission logic.

Foundation proof pages:
- overview
- users
- roles
- locations
- committees
- delegations
- access-review

Risk AI proof pages:
- overview
- register
- heatmap
- incidents
- treatments

Workflow proof pages:
- overview
- inbox
- designer
- instances
- templates

Compliance proof pages:
- overview
- obligations
- controls
- assessments
- evidence
- gaps

Acceptance:
- each module has distinct accent/personality but the same enterprise design system
- each page has a signature widget
- agent workbench appears where contract enables it
- workflow/decision preview appears for risky actions
- evidence drawer appears for evidence-required actions
- Arabic/RTL and English/LTR work
- mobile and desktop screenshots provided
- build passes

Final target:
Foundation feels like an operating-model control room.
Risk AI feels like an intelligence and simulation cockpit.
Workflow feels like a process execution center.
Compliance feels like an assurance and evidence command center.
```

## 30. Approved Part B Decisions (must be enforced by design)

This specification must follow these approved decisions:

### 30.1 Resolver-only UI permission gating

- UI visibility and action availability must be resolved by platform resolvers from contracts + `UserContext`.
- Components must render `visibleActions` and resolved widget states; they must not implement ad-hoc role checks for visibility decisions.

### 30.2 Backend RLS as authority

- Backend authorization and tenant isolation remain authoritative.
- UI gating does not replace backend enforcement.

### 30.3 Generic renderer + signature widget composition

- Default rendering uses generic page-type renderers.
- Differentiation is achieved by composing:
  - `pageType` + `layout`
  - `signatureWidget` + `secondaryWidgets`
  - `moduleStyleTokens`
  - `agentExperience`
  - `workflow/evidence/audit` flags

### 30.4 Strict KPI hierarchy

- Module KPI strip/cards are allowed only on overview pages where `kpiScope=module-overview`.
- Operational pages must not inherit overview KPI UI.

### 30.5 Command palette from enrolled contracts

- Command palette actions must be derived from enrolled module/page contracts and the user’s resolved permissions.
- Commands must be permission-checked, scoped, and localized.

### 30.6 Evidence/audit middleware for governed actions

- Any governed write must create evidence and audit records.
- Decision preview is mandatory for risky actions before workflow approval.

## 31. Universal Module Style Contract (moduleStyleTokens)

Every module must publish a style contract. The shell reads tokens; modules do not get random per-module CSS.

```ts
type ModuleStyleTokens = {
  moduleCode: string;
  accent: string;
  accentSecondary?: string;
  icon: string;
  mood: string;
  pageDensity: 'compact' | 'comfortable' | 'spacious';
  surfaceStyle: 'standard' | 'operational' | 'intelligence' | 'assurance' | 'security';
  signatureWidgets: string[];
  agentTone: 'governance' | 'risk' | 'assurance' | 'operations' | 'security' | 'executive';
  defaultPageLayout: 'command-center' | 'full-page' | 'split-view' | 'canvas' | 'object-360';
  mobileVariant: 'card-list' | 'bottom-sheet' | 'stepper' | 'map-first' | 'timeline-first';
};
```

Rules:

- Tokens are consumed by the shell and widget registry to apply consistent layout, density, and visual accents.
- Tokens must map to the global design system palette (no arbitrary color systems).
- Tokens must not enable module-specific CSS divergence outside token application.

## 32. All-Module Style Map (contract-first; no custom CSS)

This catalog defines **module personalities** using tokens, signature widgets, and contract-driven behaviors. It is the reference for implementing consistent enterprise UI across modules.

### 32.1 Foundation (`foundation`)

- Purpose: operating model, users, roles, org structure, ownership
- Style: emerald/teal; structured; calm; governance-first
- Signature widgets:
  - Org Graph Canvas
  - Identity 360
  - Permission Matrix
  - RACI Canvas
  - Committee Decision Room
  - Delegation Authority Simulator
  - Ownership Heatmap
  - Access Review Cockpit
- Agent UX:
  - Explain access
  - Detect SoD conflicts
  - Suggest owners
  - Prepare access review
  - Detect orphan org units
- Workflow UX:
  - role assignment approval
  - delegation approval
  - access review campaign
  - committee decision approval

### 32.2 Risk AI (`risk`)

- Purpose: risk intelligence, prediction, treatment, incident connection
- Style: amber/red/violet; analytical; high-signal; AI-forward
- Signature widgets:
  - Risk Heatmap
  - Risk Radar
  - Risk Register Intelligence Grid
  - Risk 360
  - Scenario Simulator
  - KRI Monitor
  - Treatment Tracker
  - Incident Correlation Map
- Agent UX:
  - Detect emerging risk
  - Explain risk movement
  - Suggest treatment plan
  - Simulate residual risk
  - Correlate incidents to risks
- Workflow UX:
  - treatment approval
  - risk acceptance
  - incident escalation
  - risk review campaign

### 32.3 Compliance Controls (`compliance`)

- Purpose: obligations, controls, assessments, regulatory coverage
- Style: navy/saffron/blue; formal; assurance-heavy
- Signature widgets:
  - Control Library Matrix
  - Obligation Map
  - Compliance Coverage Board
  - Assessment Cockpit
  - Evidence Binder
  - Gap Remediation Board
  - Framework Mapping View
- Agent UX:
  - Map obligation to controls
  - Detect missing evidence
  - Summarize control gaps
  - Draft compliance report
  - Compare frameworks
- Workflow UX:
  - control testing
  - evidence review
  - compliance assessment approval
  - gap remediation approval

### 32.4 Workflow (`workflow`)

- Purpose: execution, approvals, orchestration, SLA
- Style: blue/cyan; motion; process; stateful
- Signature widgets:
  - Workflow Designer Canvas
  - Workflow Instance 360
  - My Work Queue
  - SLA Console
  - Approval Queue
  - Escalation Matrix
  - Workflow Template Gallery
- Agent UX:
  - Explain blocked workflow
  - Suggest approver
  - Detect SLA breach
  - Prepare approval brief
  - Recommend escalation
- Workflow UX:
  - workflow control plane surfaces must show: state, blockers, SLA, evidence, decision history

### 32.5 Governance Policy (`policy`)

- Purpose: policy lifecycle, approvals, control linkage
- Style: deep blue/saffron; authority; document-first
- Signature widgets:
  - Policy Lifecycle Board
  - Policy 360
  - Policy Diff Viewer
  - Control Linkage Map
  - Expiry/Renewal Tracker
  - Approval History Timeline
- Agent UX:
  - Summarize policy changes
  - Detect expired policies
  - Suggest linked controls
  - Draft policy renewal brief
  - Compare versions
- Workflow UX:
  - draft → review → approve → publish → renew → retire

### 32.6 Evidence / Audit Reporting (`evidence`)

- Purpose: evidence, findings, reports, audit pack generation
- Style: slate/indigo; forensic; proof-driven
- Signature widgets:
  - Evidence Binder
  - Finding Board
  - Audit Pack Builder
  - Evidence Validity Timeline
  - Report Composer
  - Control Evidence Coverage
- Agent UX:
  - Summarize evidence
  - Detect missing proof
  - Generate audit-ready report
  - Map evidence to controls
  - Check evidence expiry
- Workflow UX:
  - evidence request
  - evidence submission
  - reviewer acceptance/rejection
  - audit report approval

### 32.7 Privacy (`privacy`)

- Purpose: PDPL/GDPR, RoPA, DPIA, consent, data subject requests
- Style: purple/indigo/blue; sensitive-data aware; privacy-first
- Signature widgets:
  - RoPA Map
  - Data Flow Map
  - DPIA Wizard
  - Consent Ledger
  - Data Subject Request Queue
  - Retention Risk Matrix
  - Processor Relationship Map
- Agent UX:
  - Detect missing lawful basis
  - Summarize processing activity
  - Identify high-risk processing
  - Draft DPIA notes
  - Map PDPL/GDPR obligations
- Workflow UX:
  - DPIA review
  - DSR response approval
  - consent exception approval
  - data processing review

### 32.8 Vendor (`vendor`)

- Purpose: third-party risk, vendor assessment, questionnaires, contracts
- Style: orange/blue; external ecosystem; relationship-risk
- Signature widgets:
  - Vendor Risk 360
  - Vendor Assessment Board
  - Questionnaire Builder
  - Contract Evidence Viewer
  - Third-party Risk Heatmap
  - Renewal/Expiry Tracker
- Agent UX:
  - Summarize vendor risk
  - Detect missing questionnaire answers
  - Review vendor evidence
  - Compare vendor risk tiers
  - Draft risk acceptance memo
- Workflow UX:
  - vendor onboarding
  - questionnaire review
  - contract evidence review
  - vendor risk acceptance

### 32.9 Asset (`asset`)

- Purpose: asset inventory, ownership, lifecycle, risk linkage
- Style: steel/blue/green; inventory + control
- Signature widgets:
  - Asset Inventory Grid
  - Asset 360
  - Asset Relationship Graph
  - Ownership Coverage
  - Asset Risk Overlay
  - Lifecycle Timeline
- Agent UX:
  - Detect unowned assets
  - Link assets to risk/control
  - Summarize asset exposure
  - Find stale assets
  - Suggest owner assignment
- Workflow UX:
  - asset onboarding
  - ownership approval
  - retirement workflow
  - risk linkage review

### 32.10 BCP (`bcp`)

- Purpose: business continuity, plans, recovery, exercises
- Style: cyan/amber; resilience; readiness
- Signature widgets:
  - Continuity Readiness Scorecard
  - BCP Plan 360
  - Recovery Timeline
  - Exercise Board
  - Dependency Map
  - Critical Process Matrix
- Agent UX:
  - Detect missing recovery owner
  - Summarize BCP gaps
  - Prepare exercise brief
  - Identify critical dependency risk
  - Draft recovery test report
- Workflow UX:
  - BCP plan review
  - exercise approval
  - recovery plan sign-off
  - post-exercise remediation

### 32.11 Training (`training`)

- Purpose: awareness, training campaigns, completion, attestations
- Style: green/blue; learning; adoption
- Signature widgets:
  - Training Campaign Cockpit
  - Completion Matrix
  - Learner Progress Cards
  - Attestation Tracker
  - Role-based Training Map
  - Training Evidence Binder
- Agent UX:
  - Detect overdue training
  - Generate reminder
  - Summarize training gaps
  - Suggest role-based learning
  - Draft awareness content
- Workflow UX:
  - campaign creation
  - training assignment
  - completion attestation
  - escalation for overdue users

### 32.12 Remediation / Action (`action`)

- Purpose: actions, corrective plans, owners, deadlines
- Style: amber/blue; task execution; closure
- Signature widgets:
  - Remediation Kanban
  - Action 360
  - SLA Aging Board
  - Owner Load View
  - Evidence-to-Closure Timeline
  - Overdue Heatmap
- Agent UX:
  - Suggest remediation plan
  - Detect overdue actions
  - Summarize closure evidence
  - Recommend escalation
  - Draft owner reminder
- Workflow UX:
  - action assignment
  - evidence submission
  - owner closure
  - reviewer validation

### 32.13 DORA (`dora`)

- Purpose: operational resilience, ICT risk, regulatory mapping
- Style: navy/red/cyan; resilience + regulatory severity
- Signature widgets:
  - DORA Readiness Command Center
  - ICT Risk Register
  - Incident Severity Board
  - Third-party ICT Map
  - Resilience Test Tracker
  - Regulatory Obligation Map
- Agent UX:
  - Map incident to DORA obligation
  - Detect resilience gaps
  - Summarize ICT third-party exposure
  - Prepare regulatory notification draft
  - Suggest remediation plan
- Workflow UX:
  - ICT risk review
  - incident regulatory escalation
  - resilience test approval
  - vendor ICT review

### 32.14 Qiyas Journey (`journey`)

- Purpose: maturity journey, assessment path, transformation roadmap
- Style: saffron/blue; guided journey; progress
- Signature widgets:
  - Journey Roadmap
  - Maturity Scorecard
  - Milestone Timeline
  - Gap-to-Action Map
  - Progress Heatmap
  - Recommendation Board
- Agent UX:
  - Explain maturity score
  - Suggest next milestone
  - Draft improvement plan
  - Detect stalled journey items
  - Prepare executive summary
- Workflow UX:
  - maturity assessment approval
  - roadmap sign-off
  - milestone completion evidence

### 32.15 Analytics (`analytics`)

- Purpose: dashboards, metrics, trends, cross-module insights
- Style: indigo/blue; data-rich; executive-grade
- Signature widgets:
  - Analytics Workbench
  - Metric Explorer
  - Trend Dashboard
  - Cross-module Correlation Graph
  - Saved Insight Views
  - Anomaly Detection Panel
- Agent UX:
  - Explain trend
  - Detect anomaly
  - Generate insight summary
  - Build dashboard draft
  - Compare period performance
- Workflow UX:
  - report approval
  - metric definition approval
  - insight publication

### 32.16 Reporting (`reporting`)

- Purpose: scheduled reports, exports, board packs
- Style: slate/blue; publishing; polished reporting
- Signature widgets:
  - Report Builder
  - Report Schedule Calendar
  - Export Queue
  - Board Pack Composer
  - Evidence-linked Report Preview
  - Report Version History
- Agent UX:
  - Draft report narrative
  - Summarize metrics
  - Validate evidence links
  - Generate board summary
  - Explain variance
- Workflow UX:
  - report draft
  - reviewer approval
  - publication
  - export evidence receipt

### 32.17 Executive Intelligence (`executive`)

- Purpose: leadership cockpit, strategic signals, top risks/actions
- Style: dark navy/gold (or light executive premium); high hierarchy
- Signature widgets:
  - Executive Command Center
  - Strategic Risk Radar
  - KPI Narrative Cards
  - Board Brief Generator
  - Decision Queue
  - Enterprise Health Score
- Agent UX:
  - Summarize enterprise posture
  - Prepare CEO/board brief
  - Explain top changes
  - Recommend decision priorities
  - Generate executive narrative
- Workflow UX:
  - board pack approval
  - strategic decision tracking
  - executive action follow-up

### 32.18 AI Governance (`ai-governance`)

- Purpose: model governance, AI risk, model approvals, AI audit
- Style: violet/indigo; AI trust; explainability
- Signature widgets:
  - AI Model Registry
  - Model 360
  - AI Risk Assessment
  - Prompt/Agent Audit Timeline
  - Model Approval Board
  - AI Control Coverage Matrix
- Agent UX:
  - Explain model risk
  - Detect missing AI control
  - Summarize model usage
  - Prepare approval brief
  - Review AI output evidence
- Workflow UX:
  - model onboarding
  - AI risk approval
  - model change review
  - AI incident review

### 32.19 AI Gateway / AI Engine (`ai-engine`)

- Purpose: AI operations, routing, usage, model providers, agent runtime
- Style: violet/cyan; runtime control; technical intelligence
- Signature widgets:
  - AI Usage Monitor
  - Provider Routing Console
  - Agent Runtime Dashboard
  - Token/Cost Analytics
  - Model Health Panel
  - Prompt Trace Viewer
- Agent UX:
  - Explain AI cost spike
  - Detect failing provider
  - Suggest routing adjustment
  - Analyze agent run failure
  - Summarize prompt trace
- Workflow UX:
  - provider config approval
  - routing policy change
  - agent deployment approval

### 32.20 DSOC (`dsoc`)

- Purpose: security operations, alerts, threats, incidents
- Style: red/slate/violet; security urgency
- Signature widgets:
  - Security Command Center
  - Alert Triage Board
  - Threat Timeline
  - Incident Response Canvas
  - User Risk Signals
  - Evidence Chain Viewer
- Agent UX:
  - Triage alert
  - Correlate events
  - Summarize incident
  - Suggest containment steps
  - Generate security report
- Workflow UX:
  - incident escalation
  - containment approval
  - evidence review
  - post-incident closure

### 32.21 DNOC (`dnoc`)

- Purpose: network/service operations, uptime, service health
- Style: cyan/green/slate; reliability; operations
- Signature widgets:
  - Service Health Map
  - Uptime/SLA Board
  - Incident Timeline
  - Dependency Graph
  - Performance Trend Monitor
  - Capacity Forecast
- Agent UX:
  - Explain outage
  - Detect service degradation
  - Suggest recovery steps
  - Summarize incident timeline
  - Recommend capacity action
- Workflow UX:
  - incident response
  - escalation
  - maintenance approval
  - service recovery evidence

### 32.22 DAuth / Identity Authorization (`dauth`)

- Purpose: auth, authorization, policies, decision logs
- Style: deep purple/blue; security; trust; precision
- Signature widgets:
  - Authorization Decision Explorer
  - Policy Matrix
  - OpenFGA Relationship Graph
  - Keycloak Sync Monitor
  - SoD Conflict Board
  - Access Decision Timeline
- Agent UX:
  - Explain denied access
  - Find permission gap
  - Detect policy drift
  - Summarize decision logs
  - Suggest least-privilege fix
- Workflow UX:
  - permission change approval
  - SoD waiver approval
  - policy promotion
  - access review linkage

### 32.23 Tenant / Workspace / Config Center (`config-center`)

- Purpose: tenant lifecycle, workspace config, product activation, settings
- Style: neutral/blue/emerald; platform control
- Signature widgets:
  - Tenant Control Center
  - Workspace Config Editor
  - Product Activation Matrix
  - Tenant Health Score
  - Feature Flag Console
  - Environment Readiness Panel
- Agent UX:
  - Check tenant readiness
  - Explain missing config
  - Suggest safe feature flags
  - Prepare tenant activation
  - Detect misconfiguration
- Workflow UX:
  - product activation approval
  - config change approval
  - tenant lifecycle transition

### 32.24 Notifications / Inbox (`notifications`)

- Purpose: alerts, approvals, tasks, nudges, work queue
- Style: blue/amber; action-oriented; compact
- Signature widgets:
  - Unified Work Queue
  - Notification Stream
  - Approval Inbox
  - Nudge Center
  - SLA Priority Queue
  - Action Digest
- Agent UX:
  - Prioritize my work
  - Summarize unread items
  - Draft response
  - Explain why this needs action
  - Group related tasks
- Workflow UX:
  - approve/reject from inbox
  - request change
  - defer/snooze
  - evidence request response

### 32.25 Records (`records`)

- Purpose: records, retention, documents, lifecycle, archive
- Style: slate/blue; controlled information
- Signature widgets:
  - Records Library
  - Retention Schedule Board
  - Record 360
  - Version Timeline
  - Legal Hold Panel
  - Disposal Approval Queue
- Agent UX:
  - Summarize record
  - Detect retention issue
  - Compare versions
  - Prepare disposal brief
  - Find related records
- Workflow UX:
  - retention review
  - legal hold approval
  - disposal approval
  - record evidence chain

### 32.26 Integrations (`integrations`)

- Purpose: connectors, external systems, sync status, mappings
- Style: cyan/indigo; connectivity; data movement
- Signature widgets:
  - Integration Health Grid
  - Connector Setup Wizard
  - Data Mapping Canvas
  - Sync Timeline
  - Error Queue
  - API Usage Monitor
- Agent UX:
  - Explain sync failure
  - Suggest mapping fix
  - Summarize integration health
  - Detect stale connector
  - Prepare integration test report
- Workflow UX:
  - connector approval
  - credential rotation
  - mapping change approval
  - failed sync remediation

### 32.27 MCP Gateway (`mcp`)

- Purpose: model/context/tool gateway, agent tool access, server registry
- Style: violet/cyan; tool routing; AI infrastructure
- Signature widgets:
  - MCP Server Registry
  - Tool Permission Matrix
  - Tool Invocation Timeline
  - Agent Tool Coverage
  - Context Source Map
  - Tool Health Monitor
- Agent UX:
  - Explain failed tool call
  - Suggest missing tool permission
  - Detect unsafe tool path
  - Summarize tool usage
  - Recommend server routing
- Workflow UX:
  - tool enablement approval
  - MCP server registration
  - permission change approval

### 32.28 Portals (`portals`)

- Purpose: external/internal portals, customer/vendor access, delegated views
- Style: blue/teal; external experience; access-controlled
- Signature widgets:
  - Portal Builder
  - Portal Access Matrix
  - Portal Activity Timeline
  - External User Queue
  - Portal Content Manager
  - Invitation Status Board
- Agent UX:
  - Suggest portal content
  - Explain external access
  - Detect inactive portal users
  - Draft invitation message
  - Summarize portal activity
- Workflow UX:
  - portal publish approval
  - external access approval
  - content review

### 32.29 Dashboard Widgets (`widgets`)

- Purpose: widget catalog, dashboard composition, page widgets
- Style: indigo/emerald; composable UI; builder
- Signature widgets:
  - Widget Catalog
  - Dashboard Composer
  - Widget Health Monitor
  - Data Source Binding Panel
  - Widget Permission Matrix
  - Mobile Preview
- Agent UX:
  - Suggest dashboard layout
  - Detect broken widget data
  - Recommend KPI grouping
  - Explain widget source
  - Generate dashboard draft
- Workflow UX:
  - dashboard publish approval
  - widget configuration approval

### 32.30 Platform Product (`product`)

- Purpose: products, modules, entitlements, product packaging
- Style: navy/emerald; product operating layer
- Signature widgets:
  - Product Registry
  - Module Entitlement Matrix
  - Product Activation Flow
  - Feature Packaging Board
  - Product Health Dashboard
  - Tenant Product Coverage
- Agent UX:
  - Explain product activation
  - Detect entitlement mismatch
  - Suggest product package
  - Summarize tenant adoption
  - Prepare activation checklist
- Workflow UX:
  - product activation approval
  - entitlement change approval
  - package promotion

### 32.31 AGRC OS (`agrc-os`)

- Purpose: cross-module GRC operating cockpit across risk, compliance, audit, governance
- Style: navy/gold/blue; executive GRC command
- Signature widgets:
  - GRC Command Center
  - Cross-module Risk/Compliance Map
  - Regulatory Readiness Score
  - Open GRC Work Queue
  - Executive GRC Brief
  - Assurance Coverage Matrix
- Agent UX:
  - Summarize GRC posture
  - Detect cross-module gaps
  - Prepare GRC board report
  - Recommend priority actions
  - Explain assurance coverage
- Workflow UX:
  - enterprise GRC review
  - board pack approval
  - cross-module remediation

### 32.32 Platform Admin (`platform-admin`)

- Purpose: admin operations, system management, service config
- Style: neutral/slate/blue; precise; admin-focused
- Signature widgets:
  - Admin Console
  - Service Registry
  - Environment Config Panel
  - Permission Administration
  - Deployment Status View
  - System Jobs Monitor
- Agent UX:
  - Explain config issue
  - Detect unsafe setting
  - Summarize service status
  - Prepare change request
  - Find drift
- Workflow UX:
  - admin config approval
  - sensitive setting change
  - platform maintenance approval

### 32.33 User/Profile (`user-profile`)

- Purpose: profiles, preferences, memberships, user lifecycle
- Style: emerald/blue; identity; personal workspace
- Signature widgets:
  - User Profile 360
  - Membership Timeline
  - Preference Center
  - Access Summary
  - Activity History
  - Profile Completion Score
- Agent UX:
  - Explain my access
  - Summarize my pending tasks
  - Recommend profile completion
  - Explain hidden actions
  - Prepare access request
- Workflow UX:
  - profile update approval (where sensitive)
  - access request workflow
  - membership lifecycle

### 32.34 Audit Trail (`audit-trail`)

- Purpose: platform-wide audit inspection
- Style: slate/red/blue; forensic; immutable
- Signature widgets:
  - Forensic Timeline
  - Correlation Explorer
  - Actor Activity Graph
  - Before/After Diff Viewer
  - Audit Export Builder
  - Suspicious Activity Detector
- Agent UX:
  - Explain what happened
  - Group related events
  - Find suspicious admin activity
  - Prepare audit narrative
  - Trace correlation ID
- Workflow UX:
  - audit evidence export
  - incident escalation
  - finding creation

Rule: any additional modules must be added to this catalog using the same structure and must remain token-driven and contract-driven.

## 33. Agent Tone Families (global consistency rules)

### 33.1 Governance/Identity modules

- Applies to: Foundation, DAuth, User/Profile, Tenant/Workspace, Platform Product
- Agent tone: precise, explainable, permission-aware, governance-first
- Common actions:
  - Explain access
  - Detect policy gap
  - Suggest owner
  - Prepare approval
  - Show why hidden

### 33.2 Risk/Compliance/Audit modules

- Applies to: Risk AI, Compliance, Audit Trail, Evidence, DORA, Privacy, Vendor, BCP
- Agent tone: assurance-heavy, evidence-backed, risk-aware, regulatory
- Common actions:
  - Detect gap
  - Summarize evidence
  - Map obligation
  - Prepare report
  - Simulate impact

### 33.3 Operations modules

- Applies to: Workflow, DNOC, DSOC, Notifications, Remediation, Integrations, MCP Gateway, Records
- Agent tone: operational, fast, state-aware, escalation-aware
- Common actions:
  - Explain blocker
  - Prioritize queue
  - Suggest escalation
  - Prepare remediation
  - Summarize timeline

### 33.4 Executive modules

- Applies to: Executive Intelligence, AGRC OS, Analytics, Reporting
- Agent tone: high-level, narrative, decision-oriented, board-ready
- Common actions:
  - Prepare brief
  - Explain trend
  - Summarize posture
  - Recommend priorities
  - Generate board pack

## 34. All-Module Agent Instruction (copy/paste)

```text
Create the all-module Dynamic UI advanced style map.

Goal:
Every module must use the same Dynamic UI design system, but with module-specific style tokens, page archetypes, signature widgets, agent behavior, workflow behavior, evidence behavior, mobile variants, and RTL support.

Do not create random custom CSS per module.
Do not hardcode any module name in the shell.
Do not bypass DynamicPageExperienceResolver.
Do not add frontend-only permission logic.

Required:
1. Add moduleStyleTokens to every module contract.
2. Add pageType/layout/kpiScope/titleKey/signatureWidget/mobileVariant to every route.
3. Add agentExperience where relevant.
4. Add workflowActions where relevant.
5. Add evidenceRequired on evidence-producing actions.
6. Map every module to:
   - accent
   - mood
   - signature widgets
   - agent tone
   - workflow style
   - mobile variant
7. Ensure generic renderer fallback remains available.
8. Ensure signature widgets lazy-load through WIDGET_MAP.
9. Ensure Command Palette reads module nav/actions/agent actions from contract.
10. Ensure all module overview pages use Command Center.
11. Ensure all non-overview pages do not inherit module KPI strip/cards.

Modules to cover:
- Foundation
- Risk AI / Risk Incident
- Compliance Controls
- Workflow
- Governance Policy
- Evidence Audit Reporting
- Privacy
- Vendor
- Asset
- BCP
- Training
- Remediation Action
- DORA
- Qiyas Journey
- Analytics
- Analytics Reporting
- Executive Intelligence
- AI Governance
- AI Gateway / AI Engine
- DSOC
- DNOC
- DAuth / Authorization
- Tenant / Workspace / Config Center
- Notifications / Inbox
- Records
- Integrations
- MCP Gateway
- Portals
- Dashboard Widgets
- Platform Product
- AGRC OS
- Platform Admin
- User/Profile
- Audit Trail

Acceptance:
- every module has moduleStyleTokens
- every active route has pageType/layout/kpiScope/titleKey
- every module has at least one Command Center overview
- operational pages use page-specific widgets, not inherited overview KPI
- agent actions are contract-driven
- workflow actions are contract-driven
- risky actions require decision preview
- evidence actions require evidence drawer
- Arabic/RTL and English/LTR are represented
- mobile variants exist
- build passes
- drift tests fail when route/style/widget fields are missing

Final target:
Every module feels different in purpose, but every module feels like the same Dogan AI OS platform.
```

## 35. Appendix — ModuleStyleTokens Examples (JSON)

Use these as copy/paste starting points. Values must still map to the global palette and component system; do not introduce module-specific CSS.

### 35.1 Foundation (`foundation`)

```json
{
  "moduleCode": "foundation",
  "accent": "emerald",
  "accentSecondary": "teal",
  "icon": "account_tree",
  "mood": "structured, calm, governance-first",
  "pageDensity": "comfortable",
  "surfaceStyle": "operational",
  "signatureWidgets": [
    "org-graph-canvas",
    "identity-360",
    "permission-matrix",
    "raci-canvas",
    "decision-room",
    "delegation-simulator",
    "ownership-heatmap",
    "access-review-cockpit"
  ],
  "agentTone": "governance",
  "defaultPageLayout": "full-page",
  "mobileVariant": "card-list"
}
```

### 35.2 Risk AI (`risk`)

```json
{
  "moduleCode": "risk",
  "accent": "amber",
  "accentSecondary": "violet",
  "icon": "radar",
  "mood": "analytical, high-signal, AI-forward",
  "pageDensity": "comfortable",
  "surfaceStyle": "intelligence",
  "signatureWidgets": [
    "risk-heatmap",
    "risk-radar",
    "risk-register-grid",
    "risk-360",
    "scenario-simulator",
    "kri-monitor",
    "treatment-tracker",
    "incident-correlation-map"
  ],
  "agentTone": "risk",
  "defaultPageLayout": "split-view",
  "mobileVariant": "card-list"
}
```

### 35.3 Compliance (`compliance`)

```json
{
  "moduleCode": "compliance",
  "accent": "navy",
  "accentSecondary": "saffron",
  "icon": "fact_check",
  "mood": "formal, assurance-heavy, evidence-driven",
  "pageDensity": "comfortable",
  "surfaceStyle": "assurance",
  "signatureWidgets": [
    "control-library-matrix",
    "obligation-map",
    "assessment-cockpit",
    "evidence-binder",
    "gap-remediation-board",
    "framework-mapping"
  ],
  "agentTone": "assurance",
  "defaultPageLayout": "full-page",
  "mobileVariant": "bottom-sheet"
}
```

### 35.4 Workflow (`workflow`)

```json
{
  "moduleCode": "workflow",
  "accent": "blue",
  "accentSecondary": "cyan",
  "icon": "schema",
  "mood": "stateful, process-first, SLA-aware",
  "pageDensity": "comfortable",
  "surfaceStyle": "operational",
  "signatureWidgets": [
    "workflow-designer-canvas",
    "workflow-instance-360",
    "my-work-queue",
    "sla-console",
    "approval-queue",
    "escalation-matrix",
    "template-gallery"
  ],
  "agentTone": "operations",
  "defaultPageLayout": "canvas",
  "mobileVariant": "stepper"
}
```

### 35.5 DAuth (`dauth`)

```json
{
  "moduleCode": "dauth",
  "accent": "indigo",
  "accentSecondary": "slate",
  "icon": "policy",
  "mood": "security, precision, trust",
  "pageDensity": "compact",
  "surfaceStyle": "security",
  "signatureWidgets": [
    "authorization-decision-explorer",
    "policy-matrix",
    "relationship-graph",
    "sync-monitor",
    "sod-conflict-board",
    "access-decision-timeline"
  ],
  "agentTone": "security",
  "defaultPageLayout": "split-view",
  "mobileVariant": "timeline-first"
}
```

### 35.6 Executive (`executive`)

```json
{
  "moduleCode": "executive",
  "accent": "navy",
  "accentSecondary": "gold",
  "icon": "insights",
  "mood": "high hierarchy, board-ready",
  "pageDensity": "spacious",
  "surfaceStyle": "standard",
  "signatureWidgets": [
    "executive-command-center",
    "strategic-risk-radar",
    "kpi-narrative-cards",
    "board-brief-generator",
    "decision-queue",
    "enterprise-health-score"
  ],
  "agentTone": "executive",
  "defaultPageLayout": "command-center",
  "mobileVariant": "card-list"
}
```

## 36. Shahin SPA Shell Incident Playbook (P0)

This section consolidates and supersedes the operational incident note previously captured in `DOS-AIO-Specs/Shahin-AI SPA`. It is kept inside the authoritative UI Dynamic Spaces spec because a broken SPA shell blocks every module from rendering, masking Dynamic UI issues as “blank pages”.

> **Phase 4A canonicalization note (2026-04-29):** the Shahin-AI source tree was
> restructured. The legacy parent `DOS Platform/Shahin-AI Website/` no longer
> exists; it was split into two canonical sub-roots under `products/shahin-ai/`:
>
> | Legacy path                                  | Canonical path (post-restructure)         |
> | -------------------------------------------- | ----------------------------------------- |
> | `DOS Platform/Shahin-AI Website/frontend/`   | `DOS Platform/products/shahin-ai/app/`     |
> | `DOS Platform/Shahin-AI Website/spa/`        | `DOS Platform/products/shahin-ai/website/` |
> | `DOS Platform/Shahin-AI Website/` (parent)   | removed                                   |
>
> The product-shell that serves `shahin-ai.com` (subject of this playbook)
> consumes the **app** SPA bundle, so all build/restore commands below operate
> under `products/shahin-ai/app/`.

### 36.1 Canonical roots and boundaries

This incident is specifically about the **product-shell serving `/` returning Express JSON error** (e.g. `{"error":"INTERNAL_ERROR"}`) while `/api/health` remains `200`. That indicates **the SPA static shell is broken or missing**, not the whole backend.

Non-negotiable roots:

```text
Platform source root only:
  /root/DOS-AIO/DOS Platform

Specs root only:
  /root/DOS-AIO/DOS-AIO-Specs

Shahin product source root only (parent of app/ and website/):
  /root/DOS-AIO/DOS Platform/products/shahin-ai
```

Forbidden drift:

```text
NO Docker.
NO Netlify.
NO Vercel.
NO Firebase.
NO Render.
NO Railway.
NO random files outside canonical roots.
```

Runtime model:

```text
PM2 + nginx + gateway + product-shell + native services
```

Do not:

```text
- Do not create Dockerfile/docker-compose or any cloud deploy configs.
- Do not move frontend files into random /root/DOS-AIO folders.
- Do not copy SPA dist manually from scattered folders unless explicitly approved.
- Do not treat proxy.conf.json as production routing.
- Do not change gateway/auth/tenant logic for this incident.
- Do not touch modules unless the SPA shell is restored first.
```

### 36.2 Read-only incident proof

Run only from:

```text
/root/DOS-AIO/DOS Platform/products/shahin-ai
```

Checklist:

```text
1) Verify repo position and SPA source/build roots exist.
2) Verify expected dist path exists and contains index.html + bundles.
3) Verify product-shell process and logs.
4) Verify live responses for /, /index.html, /api/health.
5) Report findings before editing.
```

Commands:

```text
cd "/root/DOS-AIO/DOS Platform/products/shahin-ai"
pwd
ls -la

find . -maxdepth 4 \
  \( -name 'package.json' \
  -o -name 'angular.json' \
  -o -name 'project.json' \
  -o -name 'server.ts' \
  -o -name 'ecosystem*.js' \
  -o -name 'ecosystem*.config.js' \) \
  -print

ls -la "app/dist/shahin-grc/browser" || true
ls -la "app/dist/shahin-grc/browser/index.html" || true

pm2 list
pm2 describe product-shell || true
pm2 logs product-shell --lines 120 --nostream

curl -i https://shahin-ai.com/ | head -80
curl -i https://shahin-ai.com/index.html | head -80
curl -i https://shahin-ai.com/api/health | head -80
```

Report (before edits):

```text
- Does app/dist/shahin-grc/browser/index.html exist?
- Does app/dist/shahin-grc/browser contain JS/CSS bundles?
- What path does product-shell serve as PRODUCT_SHELL_SPA_DIR?
- What error appears in product-shell logs?
- Is product-shell online in PM2?
```

### 36.3 Restore the SPA build artifact

Most likely missing artifact path:

```text
/root/DOS-AIO/DOS Platform/products/shahin-ai/app/dist/shahin-grc/browser/index.html
```

Build only from:

```text
/root/DOS-AIO/DOS Platform/products/shahin-ai/app
```

Commands:

```text
cd "/root/DOS-AIO/DOS Platform/products/shahin-ai/app"

node -v
pnpm -v

pnpm install --frozen-lockfile
pnpm run build

test -f "dist/shahin-grc/browser/index.html" && echo "INDEX_OK"
find "dist/shahin-grc/browser" -maxdepth 1 -type f | sort | head -50
du -sh "dist/shahin-grc/browser"

pm2 reload product-shell

curl -i https://shahin-ai.com/ | head -100
curl -i https://shahin-ai.com/index.html | head -100
curl -i https://shahin-ai.com/api/health | head -80
```

Expected:

```text
- / returns 200 HTML, not JSON.
- /index.html returns 200 HTML.
- /api/health remains 200.
```

### 36.4 Prevention guard (no Docker/cloud/source drift)

Create:

```text
/root/DOS-AIO/tools/guards/no-docker-cloud-and-source-drift.mjs
```

Guard must fail on these forbidden files anywhere under `/root/DOS-AIO` unless explicitly allowlisted as archived docs:

```text
Docker/container forbidden:
- Dockerfile
- docker-compose.yml
- docker-compose.yaml
- compose.yml
- compose.yaml
- .dockerignore
- docker/
- k8s/
- helm/
- charts/

Cloud/static deploy forbidden:
- netlify.toml
- vercel.json
- firebase.json
- .firebaserc
- render.yaml
- railway.json
- static.json
- _redirects
- _headers

Production proxy forbidden:
- proxy.conf.json in Shahin/product/platform production roots
```

Source-boundary rule:

```text
- Platform source files belong under:
  /root/DOS-AIO/DOS Platform

- Specs belong under:
  /root/DOS-AIO/DOS-AIO-Specs

- Shahin SPA/product source belongs under:
  /root/DOS-AIO/DOS Platform/products/shahin-ai
  (split into: products/shahin-ai/app/ for the product SPA,
   and products/shahin-ai/website/ for the marketing site)
```

Guard behavior:

```text
- Must report suspicious files outside canonical roots.
- Must NOT auto-delete.
- Must fail CI/build/release.
```

### 36.5 Inventory scattered files (no moves)

Only inventory; do not move automatically.

```text
cd /root/DOS-AIO

find /root/DOS-AIO \
  -path "/root/DOS-AIO/DOS Platform" -prune -o \
  -path "/root/DOS-AIO/DOS-AIO-Specs" -prune -o \
  -type f \
  \( -name "*.ts" \
  -o -name "*.tsx" \
  -o -name "*.js" \
  -o -name "*.mjs" \
  -o -name "*.json" \
  -o -name "*.html" \
  -o -name "*.scss" \
  -o -name "*.css" \
  -o -name "*.sql" \
  -o -name "package.json" \
  -o -name "angular.json" \
  -o -name "netlify.toml" \
  -o -name "vercel.json" \
  -o -name "Dockerfile" \
  -o -name "docker-compose.yml" \) \
  -print | sort > /tmp/dos_aio_out_of_root_inventory.txt

cat /tmp/dos_aio_out_of_root_inventory.txt | head -300
```

Classify only:

```text
A. duplicate/obsolete
B. generated artifact
C. old backup/archive
D. real source accidentally created outside canonical root
E. unknown needs human approval
```

Final rule:

```text
BOUNDARY RULE:
Before editing, verify current path is inside the correct canonical root.
If the file is outside /root/DOS-AIO/DOS Platform or /root/DOS-AIO/DOS-AIO-Specs, stop and report.
Do not create rescue files, duplicate apps, Docker configs, Netlify configs, Vercel configs, or parallel SPA folders.
```
