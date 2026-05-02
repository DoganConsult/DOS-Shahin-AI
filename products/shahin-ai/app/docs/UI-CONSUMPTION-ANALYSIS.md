# UI Consumption Points Analysis: Initiatives, Milestones, and Digests

## Executive Summary

This document maps all UI consumption points for **Initiatives**, **Milestones**, and **Digests** across the Shahin-AI KSA GRC Platform. It identifies existing patterns, potential integration points, and recommended implementation approaches.

---

## 1. INITIATIVES — Where They Could Be Displayed

### 1.1 Dedicated Pages (Already Implemented)

**Location:** `/governance/initiatives`
- **Component:** `governance-initiatives.component.ts`
- **Pattern:** Table view with filters, summary cards, search
- **Features:**
  - Summary cards: Total, Active, Scheduled, Recent Runs
  - Filterable by module
  - Sortable columns: Initiative name, module, status, autonomy, schedule, last run
  - "Run Orchestrator" action button
  - Click-to-view details

### 1.2 Module Overview Pages

**A) Governance Overview (`/governance`)**
- **Component:** `governance-overview.component.ts`
- **Current Display:** "Leadership OS" section shows:
  - KPI card: `initiatives.recentRuns` (count)
  - Visual indicator in leadership KPI grid
- **Enhancement Opportunity:** Add initiative status breakdown (active/scheduled/completed)

**B) Risk Overview (`/risk`)**
- **Component:** `risk-overview.component.ts`
- **Pattern:** KPI cards with sparklines, health alerts
- **Enhancement Opportunity:** Show risk-related initiatives (e.g., "Risk Remediation Initiative")

**C) Compliance Overview (`/compliance`)**
- **Component:** `compliance-page.component.ts`
- **Pattern:** Framework posture grid, priority issues table
- **Enhancement Opportunity:** Show compliance-driven initiatives (e.g., "Framework Gap Closure Initiative")

### 1.3 Cockpit/Operational Dashboards

**A) Workspace Home (`/workspace-home`)**
- **Component:** `workspace-home.component.ts`
- **Current Display:**
  - "Next Actions" section (top 10 actionable items)
  - "AI Recommended Actions" section
  - "Module Progress" section (framework coverage)
- **Enhancement Opportunity:**
  - Add "Active Initiatives" section showing:
    - Initiative name, purpose, module, progress %, next milestone
    - Filter by module or status
  - Integrate initiative-generated actions into "Next Actions" list

**B) AGRC-OS Dashboard (`/agrc-os`)**
- **Component:** `agrc-os-dashboard.component.ts`
- **Current Display:** Unified command center with widgets
- **Enhancement Opportunity:**
  - Add "Initiative Status" widget showing:
    - Active initiatives count
    - Recent runs
    - Blocked/at-risk initiatives
  - Integrate with `autonomousStatus` signal

**C) Main Dashboard (`/dashboard`)**
- **Component:** `dashboard.component.ts`
- **Current Display:** Dynamic widget container (`app-widget-container`)
- **Enhancement Opportunity:**
  - Register `InitiativeStatusWidgetComponent` in `widget-registry.ts`
  - Display as configurable widget in dashboard grid

### 1.4 Executive Dashboard Components

**A) Executive Overview (`/executive`)**
- **Component:** `executive-overview-page.component.ts`
- **Current Widgets:**
  - `ExecutiveSummaryWidgetComponent`
  - `TopBreachedKrisWidgetComponent`
  - `PolicyReviewDebtWidgetComponent`
  - `EngineTrendWidgetComponent`
- **Enhancement Opportunity:**
  - Add `InitiativeProgressWidgetComponent` showing:
    - Strategic initiative completion rate
    - Initiative velocity (runs per period)
    - Top initiatives by impact

**B) Leadership Summary Widget**
- **Component:** `leadership-summary-widget.component.ts`
- **Current Display:** Already shows `initiatives.recentRuns` and `initiatives.activeRuns`
- **Status:** ✅ **ALREADY IMPLEMENTED**
- **Data Source:** `GovernanceApiService.getLeadershipSummary()`

### 1.5 Widget Library Integration

**A) Dynamic Widget System**
- **Registry:** `frontend/src/app/features/dashboard/widget-registry.ts`
- **Pattern:** Widgets registered by ID, loaded dynamically
- **Enhancement Opportunity:**
  - Create `InitiativeStatusWidgetComponent`
  - Register as `'initiative-status-widget'` in `DASHBOARD_WIDGET_COMPONENTS`
  - Display initiative summary (active count, recent runs, blocked)

**B) Progress/Milestone Widgets (Reusable)**
- **Component:** `progress-ring-chart.component.ts`
- **Usage:** Generic progress visualization
- **Enhancement Opportunity:**
  - Use for initiative completion percentage
  - Use for milestone progress within initiatives

### 1.6 AI Copilot Integration

**A) Copilot Widget (`app-copilot-widget`)**
- **Component:** `copilot-widget.component.ts`
- **Current Display:** Action cards with approve/reject
- **Enhancement Opportunity:**
  - Show initiative-generated recommendations as `proposedActions`
  - Display initiative status in context panel
  - Allow users to trigger initiatives via chat

**B) AI Workflow Recommendations**
- **Component:** `ai-workflow-recommendations.component.ts`
- **Current Display:** List of AI-driven workflow suggestions
- **Enhancement Opportunity:**
  - Include initiative-triggered recommendations
  - Show initiative context in recommendation cards

### 1.7 Next-Best-Action Displays

**A) Workspace Home — Next Actions**
- **Component:** `workspace-home.component.html` (lines 145-189)
- **Pattern:** List of actionable items with priority, type, due date
- **Enhancement Opportunity:**
  - Include initiative-generated actions (from `initiative-orchestrator.service.ts` artifact types: `process_task`, `recommendation`, `alert`)
  - Show initiative source in action metadata

**B) AI Recommended Actions**
- **Component:** `workspace-home.component.html` (lines 191-229)
- **Pattern:** AI-suggested next steps with priority badges
- **Enhancement Opportunity:**
  - Include initiative-orchestrated AI recommendations
  - Display initiative name in action source

---

## 2. MILESTONES — Where They Could Be Shown

### 2.1 Dedicated Pages (Already Implemented)

**Location:** `/governance/milestones`
- **Component:** `governance-milestones.component.ts`
- **Pattern:** Table view with filters, summary cards, progress bars
- **Features:**
  - Summary cards: Total, Completed, Blocked, At Risk
  - Filterable by module and state
  - Sortable columns: Milestone code, module, state, health, progress %
  - Visual progress bars (0-100%) with color coding
  - "Evaluate Live" action button
  - Click-to-view details

### 2.2 90-Day Plan Page (Already Implemented)

**Location:** `/ninety-day-plan`
- **Component:** `ninety-day-plan.component.ts`
- **Pattern:** PrimeNG Timeline grouped into Day 1-30, Day 31-60, Day 61-90
- **Features:**
  - Milestone grouping by day intervals
  - Status indicators: completed (green), overdue (red), pending (info)
  - Stats summary: completed count, overdue count, pending count
  - Scope filtering (entity/framework/period)
- **Data Source:** `GrcService` roadmap API

### 2.3 Module Overview Pages

**A) Governance Overview (`/governance`)**
- **Component:** `governance-overview.component.ts`
- **Current Display:** "Leadership OS" section shows:
  - KPI cards: `milestones.total`, `milestones.completed`, `milestones.blocked`, `milestones.atRisk`
  - "Policy Readiness" progress bar (`lc-fill` with percentage)
- **Status:** ✅ **ALREADY IMPLEMENTED**
- **Data Source:** `leadershipData()` signal from `GovernanceApiService`

**B) Risk Overview (`/risk`)**
- **Component:** `risk-overview.component.ts`
- **Pattern:** KPI cards with sparklines, velocity indicators
- **Enhancement Opportunity:**
  - Show risk-related milestones (e.g., "Risk Treatment Milestone")
  - Display milestone progress in risk velocity context

**C) Compliance Overview (`/compliance`)**
- **Component:** `compliance-page.component.ts`
- **Pattern:** Framework posture grid, control status
- **Enhancement Opportunity:**
  - Show compliance milestones (e.g., "Framework Assessment Milestone")
  - Display milestone completion in framework coverage

### 2.4 Cockpit/Operational Dashboards

**A) Workspace Home (`/workspace-home`)**
- **Component:** `workspace-home.component.ts`
- **Current Display:**
  - "Module Progress" section (framework coverage with progress bars)
- **Enhancement Opportunity:**
  - Add "Milestone Progress" section showing:
    - Milestone name, module, state, health, progress %
    - Filter by module or health status
    - Visual progress indicators (similar to framework progress bars)

**B) AGRC-OS Dashboard (`/agrc-os`)**
- **Component:** `agrc-os-dashboard.component.ts`
- **Enhancement Opportunity:**
  - Add "Milestone Health" widget showing:
    - Total milestones, completed, blocked, at-risk
    - Health distribution chart
    - Top blocked/at-risk milestones list

**C) Main Dashboard (`/dashboard`)**
- **Component:** `dashboard.component.ts`
- **Enhancement Opportunity:**
  - Register `MilestoneProgressWidgetComponent` in `widget-registry.ts`
  - Display milestone summary with drill-down to details

### 2.5 Executive Dashboard Components

**A) Executive Overview (`/executive`)**
- **Component:** `executive-overview-page.component.ts`
- **Enhancement Opportunity:**
  - Add `MilestoneHealthWidgetComponent` showing:
    - Milestone completion rate
    - Health distribution (healthy/at-risk/blocked)
    - Trend over time

**B) Leadership Summary Widget**
- **Component:** `leadership-summary-widget.component.ts`
- **Current Display:** Already shows:
  - `milestones.total`, `milestones.completed`, `milestones.blocked`, `milestones.atRisk`
  - Blocked milestones list (top 5)
  - At-risk milestones list (top 5)
- **Status:** ✅ **ALREADY IMPLEMENTED**
- **Data Source:** `GovernanceApiService.getLeadershipSummary()`

### 2.6 Progress/Milestone Widgets (Reusable)

**A) Progress Ring Chart**
- **Component:** `progress-ring-chart.component.ts`
- **Usage:** Generic circular progress visualization
- **Current Usage:** Used for various progress metrics
- **Enhancement Opportunity:**
  - Use for milestone progress percentage
  - Animate progress updates
  - Show milestone health color coding

**B) Momentum Indicator Widget**
- **Component:** `momentum-indicator.widget.ts`
- **Usage:** Shows forward/stagnant/backward momentum
- **Enhancement Opportunity:**
  - Use for milestone trend analysis
  - Show milestone velocity (progress rate)

**C) Maturity Gap Widget**
- **Component:** `maturity-gap.widget.ts`
- **Usage:** Visualizes gap between perceived and actual maturity
- **Enhancement Opportunity:**
  - Use for milestone target vs. actual progress
  - Show milestone health gap

**D) Ninety-Day Timeline Component**
- **Component:** `ninety-day-timeline.component.ts`
- **Usage:** ECharts-based timeline visualization
- **Enhancement Opportunity:**
  - Use for milestone timeline view
  - Show milestone events on timeline

### 2.7 AI Copilot Integration

**A) Copilot Widget**
- **Component:** `copilot-widget.component.ts`
- **Enhancement Opportunity:**
  - Show milestone status in context
  - Display milestone blockers in chat
  - Allow users to query milestone progress

**B) AI Entity Context Panel**
- **Component:** `ai-entity-context-panel.component.ts` (referenced in risk-overview)
- **Enhancement Opportunity:**
  - Show milestone AI insights
  - Display milestone recommendations

---

## 3. DIGESTS — Where They Could Be Consumed

### 3.1 Dedicated Pages (Already Implemented)

**Location:** `/governance/digests`
- **Component:** `governance-digests.component.ts`
- **Pattern:** Card grid layout with filters
- **Features:**
  - Summary cards: Total, Executive, Blocked Items, Next Actions
  - Filterable by digest type
  - Card display showing:
    - Digest type, period (start-end dates)
    - Blocked items count (with danger tag)
    - Next best actions count
    - Summary text (truncated)
  - "Generate" button for creating new digests
  - Click-to-view details
- **Status:** ✅ **ALREADY IMPLEMENTED**

### 3.2 Digest/Briefing Generation Services (Backend)

**A) Agent Standup Service**
- **Service:** `backend/src/services/agent-standup.service.ts`
- **Function:** `generateStandupDigest(tenantId: string): Promise<StandupDigest>`
- **Output:** Aggregates completed items, findings, blockers, recommendations
- **UI Consumption:** Display in digest cards, executive summaries

**B) Maturity Dashboard Service**
- **Service:** `backend/src/services/maturity-dashboard.service.ts`
- **Function:** Generates maturity summaries
- **UI Consumption:** Executive dashboard widgets

**C) Questionnaire Intelligence Service**
- **Service:** `backend/src/services/questionnaire-intelligence.service.ts`
- **Function:** Generates intelligence reports
- **UI Consumption:** Executive summaries, digests

**D) AI Analytics Service**
- **Service:** `backend/src/services/ai-analytics.service.ts`
- **Function:** Generates AI-driven analytics summaries
- **UI Consumption:** Executive dashboards, digests

**E) Report Generator Service**
- **Service:** `backend/src/services/report-generator.service.ts`
- **Function:** Generates executive reports
- **UI Consumption:** Report pages, executive dashboards

### 3.3 Executive Dashboard Components

**A) Executive Overview (`/executive`)**
- **Component:** `executive-overview-page.component.ts`
- **Current Widgets:**
  - `ExecutiveSummaryWidgetComponent` — could consume digest data
  - `TopBreachedKrisWidgetComponent`
  - `PolicyReviewDebtWidgetComponent`
  - `EngineTrendWidgetComponent`
- **Enhancement Opportunity:**
  - Add `DigestSummaryWidgetComponent` showing:
    - Latest digest period
    - Blocked items count
    - Next best actions count
    - Digest type breakdown

**B) Leadership Summary Widget**
- **Component:** `leadership-summary-widget.component.ts`
- **Enhancement Opportunity:**
  - Add digest summary section showing:
    - Latest digest date
    - Blocked items count
    - Next actions count

### 3.4 Cockpit/Operational Dashboards

**A) Workspace Home (`/workspace-home`)**
- **Component:** `workspace-home.component.ts`
- **Enhancement Opportunity:**
  - Add "Latest Digest" section showing:
    - Digest type, period, summary
    - Blocked items list (top 5)
    - Next best actions list (top 5)
    - Link to full digest view

**B) AGRC-OS Dashboard (`/agrc-os`)**
- **Component:** `agrc-os-dashboard.component.ts`
- **Enhancement Opportunity:**
  - Add "Digest Status" widget showing:
    - Latest digest period
    - Blocked items count
    - Next actions count
    - Digest generation status

**C) Main Dashboard (`/dashboard`)**
- **Component:** `dashboard.component.ts`
- **Enhancement Opportunity:**
  - Register `DigestSummaryWidgetComponent` in `widget-registry.ts`
  - Display latest digest summary with drill-down

### 3.5 Next-Best-Action Displays

**A) Workspace Home — Next Actions**
- **Component:** `workspace-home.component.html` (lines 145-189)
- **Enhancement Opportunity:**
  - Include digest `nextBestActions` in the "Next Actions" list
  - Show digest source in action metadata
  - Display digest period in action context

**B) AI Recommended Actions**
- **Component:** `workspace-home.component.html` (lines 191-229)
- **Enhancement Opportunity:**
  - Include digest-generated recommendations
  - Display digest type in action source

**C) Digest Cards (Already Implemented)**
- **Component:** `governance-digests.component.ts`
- **Current Display:** Shows `nextBestActions` count in digest cards
- **Status:** ✅ **ALREADY IMPLEMENTED**

### 3.6 AI Copilot Integration

**A) Copilot Widget**
- **Component:** `copilot-widget.component.ts`
- **Enhancement Opportunity:**
  - Show digest summary in chat context
  - Display digest blocked items as action cards
  - Allow users to query digest content

**B) AI Workflow Recommendations**
- **Component:** `ai-workflow-recommendations.component.ts`
- **Enhancement Opportunity:**
  - Include digest-generated recommendations
  - Show digest context in recommendation cards

### 3.7 Backend API Routes

**A) Cooperative Workflows Routes**
- **File:** `backend/src/routes/cooperative-workflows.routes.ts`
- **Purpose:** Handles standup/digest generation endpoints
- **UI Consumption:** Digest generation, acknowledgment

**B) Governance Executive Summaries Routes**
- **File:** `backend/src/routes/governance-executive-summaries.routes.ts`
- **Purpose:** Handles executive summary generation
- **UI Consumption:** Executive dashboard widgets

**C) Report Hub Routes**
- **File:** `backend/src/routes/report-hub.routes.ts`
- **Purpose:** Handles report generation
- **UI Consumption:** Report pages, executive dashboards

---

## 4. CURRENT UI PATTERNS FOR SIMILAR FEATURES

### 4.1 Table/List Patterns

**Pattern:** PrimeNG Table with filters, sorting, pagination
- **Examples:**
  - `governance-initiatives.component.ts` — initiatives table
  - `governance-milestones.component.ts` — milestones table
  - `compliance-page.component.ts` — priority issues table
- **Reusable Components:**
  - `TableModule`, `TagModule`, `ButtonModule`, `SkeletonModule`, `DropdownModule`, `InputTextModule`
- **Common Features:**
  - Sortable columns
  - Filterable by module/status/state
  - Pagination (20 rows default)
  - Row hover effects
  - Click-to-view details

### 4.2 Card Grid Patterns

**Pattern:** Responsive card grid with PrimeNG Card
- **Examples:**
  - `governance-digests.component.ts` — digest cards (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
  - `compliance-page.component.ts` — framework posture grid
  - `workspace-home.component.html` — module progress cards
- **Common Features:**
  - Responsive grid (1 col mobile, 2-3 cols desktop)
  - Hover effects (shadow-md transition)
  - Click-to-view details
  - Summary information in card header/body

### 4.3 KPI Summary Cards

**Pattern:** Summary cards with counts and breakdowns
- **Examples:**
  - `governance-initiatives.component.ts` — Total, Active, Scheduled, Recent Runs
  - `governance-milestones.component.ts` — Total, Completed, Blocked, At Risk
  - `governance-digests.component.ts` — Total, Executive, Blocked Items, Next Actions
  - `governance-overview.component.ts` — Leadership OS KPIs
- **Common Features:**
  - Grid layout (grid-cols-1 md:grid-cols-4)
  - White background, rounded corners, shadow-sm
  - Large bold numbers (text-2xl font-bold)
  - Color-coded values (green-600, red-600, yellow-600, blue-600, purple-600)
  - Small labels (text-sm text-gray-600)

### 4.4 Progress Visualization Patterns

**Pattern:** Progress bars/rings with percentage and color coding
- **Examples:**
  - `governance-milestones.component.ts` — progress bars (w-24 bg-gray-200 rounded-full h-2)
  - `governance-overview.component.ts` — Policy Readiness bar (lc-track, lc-fill)
  - `workspace-home.component.html` — framework coverage bars (fw-bar-track, fw-bar-fill)
  - `progress-ring-chart.component.ts` — circular progress with D3
- **Common Features:**
  - Color coding: green (100%), blue (50-99%), yellow (1-49%), gray (0%)
  - Percentage display (text-sm)
  - Animated fill transitions
  - Size customization (width, height, strokeWidth)

### 4.5 Timeline Patterns

**Pattern:** PrimeNG Timeline or ECharts timeline
- **Examples:**
  - `ninety-day-plan.component.ts` — PrimeNG Timeline grouped by 30-day intervals
  - `ninety-day-timeline.component.ts` — ECharts timeline for rolling 90-day view
- **Common Features:**
  - Grouped by time periods (Day 1-30, 31-60, 61-90)
  - Status indicators (completed, overdue, pending)
  - Date formatting (AppDatePipe)
  - Click-to-view details

### 4.6 Action List Patterns

**Pattern:** List of actionable items with priority, type, due date
- **Examples:**
  - `workspace-home.component.html` — Next Actions list (na-list, na-item)
  - `workspace-home.component.html` — AI Recommended Actions list
- **Common Features:**
  - Priority color coding (na-critical, na-high, na-medium, na-low)
  - Icon per action type (pi-bolt, pi-lightbulb, pi-bell, pi-file)
  - Due date display (appDate pipe)
  - Click-to-navigate (navigateTo route)
  - Priority dot indicator (na-priority-dot)

### 4.7 Widget Patterns

**Pattern:** Dynamic widget system with WidgetShell
- **Examples:**
  - `dashboard.component.ts` — app-widget-container with widget-registry
  - `leadership-summary-widget.component.ts` — widget with WidgetShell
  - `momentum-indicator.widget.ts` — standalone widget
  - `maturity-gap.widget.ts` — standalone widget
- **Common Features:**
  - WidgetShell wrapper (title, fetchedAt, loading state)
  - Configurable via `@Input() config`
  - Registered in `widget-registry.ts`
  - Display modes (grid, list, chart)
  - Drill-down events (`onDrillDown`)

### 4.8 AI Integration Patterns

**Pattern:** AI Copilot with action cards and recommendations
- **Examples:**
  - `copilot-widget.component.ts` — floating chat with proposedActions
  - `ai-workflow-recommendations.component.ts` — recommendation cards
  - `ai-entity-context-panel.component.ts` — contextual AI insights
- **Common Features:**
  - Action cards with approve/reject buttons
  - Priority badges (critical, high, medium, low)
  - Confidence indicators (tag with percentage)
  - Status badges (pending, executing, approved, rejected, completed, failed)
  - Action trail (proposed → approved → assigned → executed)
  - RACI badges (Responsible, Accountable, Consulted, Informed)

### 4.9 Empty State Patterns

**Pattern:** EmptyStateComponent with variant, title, description, action
- **Examples:**
  - `governance-initiatives.component.ts` — "No initiatives found"
  - `governance-milestones.component.ts` — "No milestones found"
  - `governance-digests.component.ts` — empty digest grid
  - `workspace-home.component.html` — "All Clear" for no actions
- **Common Features:**
  - Variant: empty, error, success
  - Title and description (i18n translated)
  - Action button (optional)
  - RTL support (dir input)

### 4.10 Loading State Patterns

**Pattern:** PrimeNG Skeleton or loading spinners
- **Examples:**
  - `governance-initiatives.component.ts` — p-skeleton height="400px"
  - `governance-milestones.component.ts` — p-skeleton height="400px"
  - `workspace-home.component.html` — skeleton-kpi, skeleton-actions
- **Common Features:**
  - Skeleton height/width customization
  - Border radius (borderRadius="10px")
  - Multiple skeletons for lists/grids
  - Loading signal/state management

---

## 5. RECOMMENDED IMPLEMENTATION PRIORITIES

### Priority 1: Enhance Existing Dedicated Pages
- ✅ **Already Implemented:** Initiatives, Milestones, Digests dedicated pages
- **Enhancement:** Add more filters, export functionality, bulk actions

### Priority 2: Integrate into Module Overview Pages
- **Governance Overview:** ✅ Already shows milestones/initiatives in Leadership OS
- **Risk Overview:** Add risk-related milestones/initiatives
- **Compliance Overview:** Add compliance-driven milestones/initiatives
- **Evidence Overview:** Add evidence-related milestones/initiatives
- **Audit Overview:** Add audit-related milestones/initiatives

### Priority 3: Add to Cockpit Dashboards
- **Workspace Home:** Add "Active Initiatives" and "Milestone Progress" sections
- **AGRC-OS Dashboard:** Add Initiative Status and Milestone Health widgets
- **Main Dashboard:** Register Initiative/Milestone/Digest widgets in widget-registry

### Priority 4: Create Executive Widgets
- **InitiativeProgressWidgetComponent:** Strategic initiative completion rate, velocity
- **MilestoneHealthWidgetComponent:** Health distribution, trend over time
- **DigestSummaryWidgetComponent:** Latest digest period, blocked items, next actions

### Priority 5: Enhance AI Integration
- **Copilot Widget:** Show initiative/milestone/digest status in chat
- **AI Recommendations:** Include initiative/digest-generated recommendations
- **Entity Context Panel:** Show milestone/digest AI insights

### Priority 6: Reuse Progress Widgets
- **Progress Ring Chart:** Use for milestone progress visualization
- **Momentum Indicator:** Use for milestone trend analysis
- **Maturity Gap Widget:** Use for milestone target vs. actual progress
- **Ninety-Day Timeline:** Use for milestone timeline view

---

## 6. DATA FLOW & API INTEGRATION

### 6.1 Backend Services

**Initiatives:**
- `backend/src/services/initiative-orchestrator.service.ts`
  - `runOrchestrator()` — executes initiatives
  - Artifact types: `process_task`, `escalation`, `recommendation`, `alert`, `digest_item`, `approval_request`
  - Links to milestones via `createOutcomeLink()`

**Milestones:**
- `backend/src/services/milestone-engine.service.ts`
  - `upsertMilestoneInstance()` — creates/updates milestone instances
  - `evaluateMilestonesFromLiveData()` — evaluates milestone state from live data
  - State: `not_started`, `in_progress`, `blocked`, `completed`, `regressed`
  - Health: `healthy`, `at_risk`, `blocked`, `unknown`

**Digests:**
- `backend/src/services/agent-standup.service.ts`
  - `generateStandupDigest()` — generates digest from agent data
  - `acknowledgeDigest()` — acknowledges digest with priorities
  - Output: `StandupDigest` with completed items, findings, blockers, recommendations

### 6.2 Frontend API Services

**Governance API:**
- `GovernanceApiService.getLeadershipSummary()` — returns milestones/initiatives summary
- `GovernanceApiService.getInitiatives()` — returns initiative list
- `GovernanceApiService.getMilestones()` — returns milestone instances
- `GovernanceApiService.getDigests()` — returns digest list
- `GovernanceApiService.runOrchestrator()` — triggers initiative orchestrator
- `GovernanceApiService.evaluateMilestones()` — triggers milestone evaluation

**GRC Service:**
- `GrcService.getRoadmapMilestones()` — returns 90-day plan milestones
- `GrcLiveService` — real-time updates for milestones/initiatives

### 6.3 Real-Time Updates

**SignalR Integration:**
- `GrcDashboardHub` — pushes updates on workflow/compliance/risk/SLA events
- **Enhancement Opportunity:** Add milestone/initiative/digest event pushes
- **Hub:** `/hubs/dashboard` (tenant group auto-join)

**WebSocket Service:**
- `WebSocketService` — handles real-time notifications
- **Enhancement Opportunity:** Subscribe to milestone/initiative/digest updates

---

## 7. IMPLEMENTATION CHECKLIST

### 7.1 Initiatives

- [x] Dedicated page (`/governance/initiatives`)
- [x] Leadership Summary Widget integration
- [ ] Workspace Home "Active Initiatives" section
- [ ] AGRC-OS Dashboard Initiative Status widget
- [ ] Main Dashboard Initiative widget registration
- [ ] Executive Overview Initiative Progress widget
- [ ] Module overview pages integration (Risk, Compliance, Evidence, Audit)
- [ ] AI Copilot integration
- [ ] Next Actions integration (initiative-generated actions)

### 7.2 Milestones

- [x] Dedicated page (`/governance/milestones`)
- [x] 90-Day Plan page (`/ninety-day-plan`)
- [x] Governance Overview Leadership OS section
- [x] Leadership Summary Widget integration
- [ ] Workspace Home "Milestone Progress" section
- [ ] AGRC-OS Dashboard Milestone Health widget
- [ ] Main Dashboard Milestone widget registration
- [ ] Executive Overview Milestone Health widget
- [ ] Module overview pages integration (Risk, Compliance, Evidence, Audit)
- [ ] Progress Ring Chart integration
- [ ] Momentum Indicator integration
- [ ] AI Copilot integration

### 7.3 Digests

- [x] Dedicated page (`/governance/digests`)
- [x] Backend generation services (agent-standup, maturity-dashboard, etc.)
- [ ] Workspace Home "Latest Digest" section
- [ ] AGRC-OS Dashboard Digest Status widget
- [ ] Main Dashboard Digest widget registration
- [ ] Executive Overview Digest Summary widget
- [ ] Leadership Summary Widget digest section
- [ ] Next Actions integration (digest nextBestActions)
- [ ] AI Copilot integration

---

## 8. UI PATTERN TEMPLATES

### 8.1 Initiative Card Template

```html
<div class="initiative-card" (click)="viewDetails(initiative)">
  <div class="initiative-header">
    <span class="initiative-name">{{ initiative.initiativeName }}</span>
    <p-tag [value]="initiative.moduleCode" severity="info" />
  </div>
  <div class="initiative-purpose">{{ initiative.purpose }}</div>
  <div class="initiative-meta">
    <span class="initiative-status" [class]="initiative.isActive ? 'active' : 'inactive'">
      {{ initiative.isActive ? 'Active' : 'Inactive' }}
    </span>
    <span class="initiative-autonomy">Level {{ initiative.autonomyLevel }}</span>
    <span class="initiative-schedule">
      {{ initiative.scheduleCron || 'Manual' }}
    </span>
  </div>
  <div class="initiative-progress">
    <div class="progress-bar">
      <div class="progress-fill" [style.width.%]="initiative.progressPct || 0"></div>
    </div>
    <span class="progress-text">{{ initiative.progressPct || 0 }}%</span>
  </div>
</div>
```

### 8.2 Milestone Card Template

```html
<div class="milestone-card" (click)="viewDetails(milestone)">
  <div class="milestone-header">
    <span class="milestone-code">{{ milestone.milestoneCode }}</span>
    <p-tag [value]="milestone.moduleCode" severity="info" />
  </div>
  <div class="milestone-state">
    <p-tag [value]="milestone.state" [severity]="getStateSeverity(milestone.state)" />
    <p-tag [value]="milestone.health || 'unknown'" [severity]="getHealthSeverity(milestone.health)" />
  </div>
  <div class="milestone-progress">
    <div class="progress-bar">
      <div class="progress-fill" [style.width.%]="milestone.progressPct || 0"></div>
    </div>
    <span class="progress-text">{{ milestone.progressPct || 0 }}%</span>
  </div>
</div>
```

### 8.3 Digest Card Template

```html
<p-card class="digest-card" (click)="viewDetails(digest)">
  <ng-template pTemplate="header">
    <div class="digest-header">
      <div class="digest-type">{{ digest.digestType }}</div>
      <div class="digest-period">{{ formatDate(digest.periodStart) }} - {{ formatDate(digest.periodEnd) }}</div>
    </div>
  </ng-template>
  <div class="digest-body">
    @if (digest.blockedItems && digest.blockedItems.length > 0) {
      <p-tag [value]="digest.blockedItems.length + ' blocked'" severity="danger" />
    }
    @if (digest.nextBestActions && digest.nextBestActions.length > 0) {
      <div class="digest-actions">{{ digest.nextBestActions.length }} next actions</div>
    }
    @if (digest.summary) {
      <div class="digest-summary">{{ digest.summary }}</div>
    }
  </div>
</p-card>
```

---

## 9. CONCLUSION

The platform already has **strong foundational implementations** for Initiatives, Milestones, and Digests:

✅ **Fully Implemented:**
- Dedicated pages for all three entities
- Leadership Summary Widget integration
- Governance Overview Leadership OS section
- 90-Day Plan page for milestones
- Backend services for generation and orchestration

🚀 **Enhancement Opportunities:**
- Cockpit dashboard integration (Workspace Home, AGRC-OS, Main Dashboard)
- Executive widget creation
- Module overview page integration
- AI Copilot integration
- Next Actions integration
- Progress widget reuse

The existing UI patterns (tables, cards, KPIs, progress bars, timelines, action lists, widgets) provide a **solid foundation** for extending Initiatives, Milestones, and Digests across the platform.

