# AI OS Integration Patterns

**Version:** 1.0.0  
**Effective Date:** 2026-03-20  
**Status:** FROZEN — Integration Policy

---

## Overview

This document defines how Governance AI OS runtime outputs integrate with the canonical UI foundation. The AI OS backend generates structured outputs (context, initiatives, milestones, leadership digests, next-best-actions, drill-through data, role-aware cockpits), and this document maps them to the unified frontend component patterns.

**Key Principle:** The frontend does not build new UIs for AI OS outputs. Instead, AI OS outputs plug into existing canonical components (widget shells, page shells, stat cards, drill-through panels, etc.).

---

## AI OS Runtime Outputs

### 1. Context Engine Outputs

**Backend Service:** `contextual-ai.service.ts`, `context-reader.service.ts`

**Output Types:**
- `GovernanceContextSummary` — tenant governance context (complexity, profiles, automation readiness)
- `ModuleOperatingStateSummary[]` — module on/off/trial states
- `PageContext` — current page context (module, entity, filters)
- `EntitySummary` — entity summaries (risk, control, policy, incident, vendor, framework, evidence, assessment)

**Integration Points:**
- **Widget Shell** (`app-widget-shell`) — display context-aware widget content
- **Page Shell** (`app-page-shell`) — show context breadcrumbs and module state
- **Stat Card** (`app-stat-card`) — display context metrics (module count, complexity score)
- **Drill-Through Panel** (`app-drill-through-panel`) — navigate to entity details from context

---

### 2. Initiative & Milestone Orchestration

**Backend Service:** `roadmap-builder.service.ts`, `roadmap.service.ts`

**Output Types:**
- `Milestone` — milestone with tasks, estimated days, completion status
- `RoadmapTask` — tasks within milestones (title, description, target module/action, priority, status)
- `WhatNextAction[]` — next actions derived from roadmap phases

**Integration Points:**
- **Widget Container** (`app-widget-container`) — display milestone progress widgets
- **Stat Card** (`app-stat-card`) — show milestone completion percentage, tasks remaining
- **Page Shell** (`app-page-shell`) — milestone breadcrumbs in page header
- **Drill-Through Panel** (`app-drill-through-panel`) — navigate to milestone details, task lists
- **Empty State** (`app-empty-state`) — show "No active milestones" when roadmap is empty

---

### 3. Leadership Digest

**Backend Service:** `maturity-dashboard.service.ts`, `report-hub.service.ts`

**Output Types:**
- `ExecutiveSummary` — bilingual executive summary with:
  - `summaryEn` / `summaryAr` — summary paragraphs
  - `highlights[]` — key highlights (en/ar)
  - `riskAreas[]` — risk areas (en/ar)
  - `recommendations[]` — recommendations (en/ar)
  - `generatedAt` — timestamp

**Integration Points:**
- **Widget Shell** (`app-widget-shell`) — display executive summary widget with export action
- **Page Shell** (`app-page-shell`) — executive summary page with bilingual content
- **Stat Card** (`app-stat-card`) — show maturity score, trend indicators
- **ECharts** (`app-echart`) — display maturity trend charts, risk heatmaps

---

### 4. Next-Best-Action

**Backend Service:** `next-best-action.service.ts`, `operating-cockpit.service.ts`, `contextual-ai.service.ts`

**Output Types:**
- `NextBestAction[]` — unified priority queue (process tasks, AI recommendations, AI alerts, overdue evidence)
- `CockpitNextAction[]` — cockpit-specific actions with rule codes, categories, counts
- `WhatNextAction[]` — roadmap-based "what next" actions

**Integration Points:**
- **Widget Container** (`app-widget-container`) — display next-best-action widget with priority queue
- **Stat Card** (`app-stat-card`) — show action counts by priority (critical, high, medium, low)
- **Page Shell** (`app-page-shell`) — action list page with filters and sorting
- **Drill-Through Panel** (`app-drill-through-panel`) — navigate to action details, entity pages
- **Empty State** (`app-empty-state`) — show "No pending actions" when queue is empty

---

### 5. Drill-Through

**Backend Service:** `drill-through.service.ts` (frontend), `contextual-ai.service.ts` (backend context)

**Output Types:**
- `DrillLevel` — drill-through level with view type (list, detail, summary), title, route, payload
- `DrillBreadcrumb[]` — breadcrumb trail for navigation

**Integration Points:**
- **Drill-Through Panel** (`app-drill-through-panel`) — canonical component for multi-level drill-through
- **Widget Container** (`app-widget-container`) — emit drill-down events that open drill-through panel
- **Stat Card** (`app-stat-card`) — clickable stat cards that trigger drill-through
- **Page Shell** (`app-page-shell`) — breadcrumb integration with drill-through navigation

---

### 6. Role-Aware Cockpit

**Backend Service:** `operating-cockpit.service.ts`, `context-reader.service.ts`

**Output Types:**
- `OperatingCockpitSnapshot` — persona-based cockpit with:
  - `persona` — persona label and description (en/ar)
  - `liveMetrics` — open tasks, overdue tasks, pending approvals, open findings, evidence gaps, active risks, startup progress
  - `nextBestActions[]` — cockpit-specific next actions
  - `recommendations[]` — AI recommendations
  - `startupChecklist[]` — startup checklist items
  - `governanceContext` — governance context summary

**Integration Points:**
- **Page Shell** (`app-page-shell`) — cockpit page with persona header
- **Stat Card** (`app-stat-card`) — display live metrics (open tasks, overdue, approvals, findings, evidence gaps, risks)
- **Widget Container** (`app-widget-container`) — display cockpit widgets (next actions, recommendations, checklist)
- **ECharts** (`app-echart`) — display startup progress charts, metric trends

---

## Integration Patterns by Component

### Pattern 1: Widget Shell Integration

**Use Case:** Display AI OS outputs in widget format

**Example:**
```typescript
// AI OS outputs are passed as widget data
const executiveSummary = await getExecutiveSummary(tenantId);

// Widget shell displays the summary with export action
<app-widget-shell
  [title]="'Executive Summary'"
  [state]="'ready'"
  [lastUpdatedUtc]="executiveSummary.generatedAt"
  (action)="onWidgetAction($event)">
  <div class="executive-summary-content">
    <p>{{ i18n.localize(executiveSummary.summaryEn, executiveSummary.summaryAr) }}</p>
    <div class="highlights">
      @for (h of executiveSummary.highlights; track h.en) {
        <div>{{ i18n.localize(h.en, h.ar) }}</div>
      }
    </div>
  </div>
</app-widget-shell>
```

**Backend API:**
- `GET /api/maturity/executive-summary` → `ExecutiveSummary`
- `GET /api/context/governance` → `GovernanceContextSummary`
- `GET /api/next-best-actions` → `NextBestAction[]`

---

### Pattern 2: Stat Card Integration

**Use Case:** Display AI OS metrics as KPIs

**Example:**
```typescript
// AI OS outputs provide metric values
const cockpit = await getOperatingCockpit(tenantId, userId);

// Stat cards display metrics
<app-stat-card
  [icon]="'tasks'"
  [value]="cockpit.liveMetrics.openTasks"
  [label]="'Open Tasks'"
  [accentColor]="'var(--primary)'" />

<app-stat-card
  [icon]="'exclamation-triangle'"
  [value]="cockpit.liveMetrics.overdueTasks"
  [label]="'Overdue Tasks'"
  [accentColor]="'var(--risk-high)'" />
```

**Backend API:**
- `GET /api/operating-cockpit` → `OperatingCockpitSnapshot`
- `GET /api/dashboard/ai-summary` → `AISummary`

---

### Pattern 3: Page Shell Integration

**Use Case:** Display AI OS outputs in full-page format

**Example:**
```typescript
// AI OS outputs provide page context
const context = await getPageContext(tenantId, userId, currentRoute);

// Page shell displays context-aware content
<app-page-shell
  [icon]="context.moduleIcon"
  [title]="i18n.localize(context.moduleTitleEn, context.moduleTitleAr)"
  [breadcrumbs]="context.breadcrumbs"
  [loading]="loading()">
  <!-- AI OS content here -->
</app-page-shell>
```

**Backend API:**
- `GET /api/context/page?module=...&entity=...` → `PageContext`
- `GET /api/journey/suggestions` → `JourneyAwareSuggestion`

---

### Pattern 4: Drill-Through Panel Integration

**Use Case:** Navigate from AI OS outputs to detailed views

**Example:**
```typescript
// AI OS outputs provide drill-through data
const nextAction: NextBestAction = {
  id: 'action-1',
  type: 'process_task',
  title: 'Review evidence for Control X',
  route: '/evidence/overview',
  entityType: 'evidence',
  entityId: 'ev-123'
};

// Drill-through panel opens on action click
this.drillThroughService.open({
  viewType: 'detail',
  title: nextAction.title,
  titleAr: nextAction.titleAr,
  route: nextAction.route,
  payload: { entityType: nextAction.entityType, entityId: nextAction.entityId }
});
```

**Backend API:**
- `GET /api/context/entity-summary?type=...&id=...` → `EntitySummary`
- `GET /api/drill-through/levels?source=...&target=...` → `DrillLevel[]`

---

### Pattern 5: Widget Container Integration

**Use Case:** Display AI OS widgets dynamically

**Example:**
```typescript
// AI OS outputs define widget configurations
const aiWidgets = [
  {
    id: 'executive-summary',
    component: ExecutiveSummaryWidgetComponent,
    nameEn: 'Executive Summary',
    nameAr: 'الملخص التنفيذي',
    defaultWidth: 2,
    defaultHeight: 2
  },
  {
    id: 'next-actions',
    component: NextActionsWidgetComponent,
    nameEn: 'Next Best Actions',
    nameAr: 'الإجراءات التالية',
    defaultWidth: 1,
    defaultHeight: 2
  }
];

// Widget container loads widgets dynamically
@for (w of aiWidgets; track w.id) {
  <app-widget-container
    [widgetComponent]="w.component"
    [nameEn]="w.nameEn"
    [nameAr]="w.nameAr"
    [width]="w.defaultWidth"
    [height]="w.defaultHeight"
    (onDrillDown)="onDrillDown(w.id, $event)" />
}
```

**Backend API:**
- `GET /api/dashboard/widgets?persona=...` → Widget configurations
- `GET /api/operating-cockpit` → `OperatingCockpitSnapshot` (includes widget data)

---

### Pattern 6: Empty State Integration

**Use Case:** Show empty states when AI OS outputs are empty

**Example:**
```typescript
// AI OS outputs may be empty
const nextActions = await getNextBestActions(tenantId, userId, role);

@if (nextActions.length === 0) {
  <app-empty-state
    [variant]="'default'"
    [title]="'No pending actions'"
    [titleAr]="'لا توجد إجراءات معلقة'"
    [description]="'All tasks are up to date'"
    [descriptionAr]="'جميع المهام محدثة'"
    [actionLabel]="'View Dashboard'"
    [actionLabelAr]="'عرض لوحة التحكم'"
    (action)="navigateToDashboard()" />
}
```

**Backend API:**
- All AI OS endpoints return empty arrays/objects when no data exists

---

## Data Flow Patterns

### Pattern A: Context → Widget → Drill-Through

1. **Context Engine** generates `PageContext` or `EntitySummary`
2. **Widget Shell** displays context-aware content
3. User clicks widget action → **Drill-Through Panel** opens with entity details

**Example Flow:**
```
PageContext (module: 'risk', entity: 'risk-123')
  → Widget Shell displays risk summary
  → User clicks "View Details"
  → Drill-Through Panel opens with risk detail view
  → User can navigate to related controls, evidence, treatments
```

---

### Pattern B: Initiative → Stat Card → Page

1. **Roadmap Builder** generates `Milestone[]` with tasks
2. **Stat Card** displays milestone completion percentage
3. User clicks stat card → **Page Shell** opens milestone detail page

**Example Flow:**
```
Milestone (name: 'Foundation Setup', tasks: [...])
  → Stat Card shows "Foundation Setup: 60% complete"
  → User clicks stat card
  → Page Shell opens /milestones/foundation-setup
  → Page displays milestone tasks, progress, next actions
```

---

### Pattern C: Next-Best-Action → Widget Container → Drill-Through

1. **Next-Best-Action Service** generates `NextBestAction[]`
2. **Widget Container** displays action queue widget
3. User clicks action → **Drill-Through Panel** opens action detail or entity page

**Example Flow:**
```
NextBestAction[] (priority queue)
  → Widget Container displays "Next Best Actions" widget
  → User clicks "Review evidence for Control X"
  → Drill-Through Panel opens with evidence detail
  → User can navigate to control, framework, assessment
```

---

### Pattern D: Leadership Digest → Page Shell → Export

1. **Maturity Dashboard Service** generates `ExecutiveSummary`
2. **Page Shell** displays executive summary page
3. User clicks export action → PDF/Excel export generated

**Example Flow:**
```
ExecutiveSummary (summary, highlights, riskAreas, recommendations)
  → Page Shell displays executive summary page
  → User clicks "Export" action
  → Backend generates PDF/Excel with bilingual content
  → User downloads report
```

---

### Pattern E: Role-Aware Cockpit → Dashboard → Widgets

1. **Operating Cockpit Service** generates `OperatingCockpitSnapshot` for persona
2. **Page Shell** displays cockpit dashboard
3. **Widget Container** displays multiple cockpit widgets (metrics, actions, recommendations)

**Example Flow:**
```
OperatingCockpitSnapshot (persona: 'ComplianceManager', metrics: {...}, actions: [...])
  → Page Shell displays "Compliance Manager Cockpit"
  → Widget Container displays:
    - Live Metrics widget (stat cards)
    - Next Best Actions widget
    - Recommendations widget
    - Startup Checklist widget
```

---

## API Contract Summary

### Context Engine APIs

| Endpoint | Output Type | Integration Component |
|----------|-------------|---------------------|
| `GET /api/context/governance` | `GovernanceContextSummary` | Stat Card, Widget Shell |
| `GET /api/context/module-states` | `ModuleOperatingStateSummary[]` | Page Shell, Stat Card |
| `GET /api/context/page?module=...` | `PageContext` | Page Shell |
| `GET /api/context/entity-summary?type=...&id=...` | `EntitySummary` | Drill-Through Panel, Widget Shell |
| `GET /api/journey/suggestions` | `JourneyAwareSuggestion` | Widget Shell, Page Shell |

### Initiative/Milestone APIs

| Endpoint | Output Type | Integration Component |
|----------|-------------|---------------------|
| `GET /api/roadmap` | `GRCRoadmap` (phases, milestones, tasks) | Widget Container, Stat Card, Page Shell |
| `GET /api/roadmap/milestones` | `Milestone[]` | Widget Container, Page Shell |
| `GET /api/roadmap/tasks` | `RoadmapTask[]` | Widget Container, Drill-Through Panel |

### Leadership Digest APIs

| Endpoint | Output Type | Integration Component |
|----------|-------------|---------------------|
| `GET /api/maturity/executive-summary` | `ExecutiveSummary` | Widget Shell, Page Shell |
| `GET /api/reports/executive` | `ExecutiveSummary` | Widget Shell, Page Shell (with export) |

### Next-Best-Action APIs

| Endpoint | Output Type | Integration Component |
|----------|-------------|---------------------|
| `GET /api/next-best-actions` | `NextBestAction[]` | Widget Container, Page Shell |
| `GET /api/operating-cockpit` | `OperatingCockpitSnapshot` | Page Shell, Widget Container, Stat Card |
| `GET /api/context/what-next` | `WhatNextAction[]` | Widget Shell, Page Shell |

### Drill-Through APIs

| Endpoint | Output Type | Integration Component |
|----------|-------------|---------------------|
| `GET /api/drill-through/levels?source=...&target=...` | `DrillLevel[]` | Drill-Through Panel |
| `GET /api/context/entity-summary?type=...&id=...` | `EntitySummary` | Drill-Through Panel |

---

## Component Usage Guidelines

### When to Use Widget Shell

- **Use:** Display AI OS outputs that need refresh, export, or pin actions
- **Examples:** Executive summary, context summaries, next-best-action queue
- **State Management:** Use widget shell's built-in state (ready, loading, empty, error)

### When to Use Stat Card

- **Use:** Display single metric values from AI OS outputs
- **Examples:** Open tasks count, overdue count, maturity score, module count
- **Trend Support:** Use `trend` input for showing metric changes

### When to Use Page Shell

- **Use:** Display full-page AI OS outputs with breadcrumbs and context
- **Examples:** Executive summary page, cockpit dashboard, milestone detail page
- **Breadcrumbs:** Use AI OS context to build breadcrumb trails

### When to Use Widget Container

- **Use:** Display dynamic AI OS widgets in dashboard grid
- **Examples:** Cockpit widgets, milestone widgets, action queue widgets
- **Drill-Down:** Emit `onDrillDown` events to open drill-through panel

### When to Use Drill-Through Panel

- **Use:** Navigate from AI OS outputs to detailed entity views
- **Examples:** Click action → open entity detail, click stat → open filtered list
- **Multi-Level:** Support breadcrumb navigation within drill-through

### When to Use Empty State

- **Use:** Show empty states when AI OS outputs are empty
- **Examples:** No next actions, no milestones, no recommendations
- **Action Support:** Provide action buttons to create/explore content

---

## Bilingual Support

All AI OS outputs support bilingual content (English/Arabic). Frontend components must use `I18nService.localize()` to display bilingual content:

```typescript
// AI OS output
const summary: ExecutiveSummary = {
  summaryEn: 'Your compliance posture is strong...',
  summaryAr: 'وضع الامتثال لديك قوي...',
  highlights: [
    { en: 'Highlight 1', ar: 'النقاط البارزة 1' },
    ...
  ]
};

// Component usage
<p>{{ i18n.localize(summary.summaryEn, summary.summaryAr) }}</p>
```

---

## State Management

AI OS outputs are typically:
- **Fetched on page load** — via Angular services calling backend APIs
- **Cached client-side** — using Angular signals or RxJS observables
- **Refreshed on demand** — via widget shell refresh action or page reload
- **Real-time updates** — via SignalR (if implemented) for live metric updates

**Example:**
```typescript
// Service fetches AI OS output
executiveSummary$ = this.http.get<ExecutiveSummary>('/api/maturity/executive-summary').pipe(
  shareReplay(1)
);

// Component subscribes
this.executiveSummary$ = this.service.executiveSummary$;
```

---

## Error Handling

When AI OS endpoints fail:
1. **Widget Shell** displays error state (built-in)
2. **Empty State** shows error variant if appropriate
3. **Page Shell** shows loading skeleton, then error message
4. **Retry Logic** — widget shell provides retry action

**Example:**
```typescript
// Widget shell handles errors automatically
<app-widget-shell [state]="'error'" (action)="onRetry()">
  <!-- Error state displayed automatically -->
</app-widget-shell>
```

---

## Related Documents

- `CANONICAL_COMPONENT_MAP.md` — Canonical component ownership
- `STATE_PATTERNS.md` — State pattern usage policy
- `CHART_POLICY.md` — Chart library usage policy
- `DESIGN_TOKEN_MIGRATION.md` — Design token migration log

---

## Future Enhancements

1. **Real-time Updates:** SignalR integration for live AI OS output updates
2. **Widget Registry:** Dynamic widget registration for AI OS widgets
3. **Custom Widgets:** Allow AI OS to define custom widget components
4. **Drill-Through Service:** Enhanced drill-through service with AI OS context
5. **Role-Based Filtering:** Filter AI OS outputs by user role/persona
