# Dynamic UI OS - Entity Mapping Matrix

**Comprehensive mapping of Pages, Features, Agents, Roles, Navigation, IBM Carbon Components, and UI Surfaces**

---

## Overview

The Dynamic UI OS manages relationships between 18 core entities through the `dos.dynamic_ui_*` table family. This document provides a complete mapping matrix showing how entities relate to each other.

---

## Entity Relationship Matrix

### 1. Pages (Routes) → Features

**Table**: `dos.dynamic_ui_routes`

| Field | Description | Mapped To |
|-------|-------------|-----------|
| `path_pattern` | Page URL pattern | Navigation routes |
| `component_key` | IBM Carbon component | `dos.dynamic_ui_component_registry` |
| `permission_key` | Required permission | Role/Permission system |
| `page_type` | Page classification | Feature categorization |
| `kpi_scope` | KPI scope | `dos.dynamic_ui_kpis` |
| `data_resource_key` | Data binding | `dos.dynamic_ui_data_resources` |
| `realtime_channels` | WebSocket topics | Event backbone |

**Features per Page**:
- `audit_enabled` → Audit feature
- `realtime_enabled` → Real-time updates
- `evidence_required` → Evidence collection
- `signature_widget` → Digital signature

---

### 2. Pages → Agents

**Table**: `dos.dynamic_ui_page_agents`

| Field | Description | Mapped To |
|-------|-------------|-----------|
| `route` | Page path | `dos.dynamic_ui_routes.path_pattern` |
| `agent_id` | AI agent (A01-A13) | `dos.dynamic_ui_agents` |
| `is_primary` | Primary agent flag | Agent orchestration |
| `presentation` | UI presentation mode | Surface layout |
| `permission` | Agent access permission | Role system |

**Agent Placement**:
- Primary agent per page
- Multiple agents per page (squad support)
- Presentation modes: sidebar, panel, inline, modal

**Agent Definitions** (`dos.dynamic_ui_agents`):
- `agent_id`: A01-A13 (canonical agents)
- `level`: L1-L4 (autonomy levels)
- `scope`: page, workflow, global
- `capabilities`: JSONB capability set
- `allowed_page_types`: Page type restrictions
- `allowed_actions`: Action permissions

---

### 3. Pages → Roles

**Table**: `dos.dynamic_ui_routes` + `dos.dynamic_ui_actions` + `dos.dynamic_ui_widgets`

| Field | Description | Mapped To |
|-------|-------------|-----------|
| `permission_key` | Page access permission | DAuth roles |
| `visible_when_perm` | Conditional visibility | Role-based UI |
| `visible_when_profile` | Profile-based visibility | User profiles |

**Role Mapping**:
- Route-level permissions
- Action-level permissions
- Widget-level permissions
- KPI-level permissions
- Data resource permissions

**Permission Flow**:
```
User → DAuth Role → Permission Key → UI Element Visibility
```

---

### 4. Pages → Navigation

**Table**: `dos.dynamic_ui_navigation`

| Field | Description | Mapped To |
|-------|-------------|-----------|
| `route` | Navigation target | `dos.dynamic_ui_routes.path_pattern` |
| `module_code` | Module ownership | `dos.dynamic_ui_modules` |
| `parent_id` | Hierarchical nav | Self-referencing FK |
| `sort_order` | Display order | UI rendering |

**Navigation Structure**:
- Module-level navigation
- Hierarchical (parent → child)
- Tenant-scoped overrides
- Readiness gates

---

### 5. Pages → IBM Carbon Components

**Table**: `dos.dynamic_ui_routes.component_key` → `dos.dynamic_ui_component_registry`

| Field | Description | Mapped To |
|-------|-------------|-----------|
| `component_key` | Carbon component ID | `dos.ui_carbon_components` |
| `vendor` | Component vendor | Enforcement (must be 'ibm-carbon') |
| `carbon_key` | Carbon catalog key | `dos.ui_carbon_components.carbon_key` |
| `approval_status` | Runtime approval | Enforcement (must be 'approved') |

**IBM Carbon Enforcement**:
- Layer 1: DB triggers (`trg_carbon_only_runtime`, `trg_carbon_only_catalog`)
- Layer 2: Server resolver filtering
- Layer 3: ESLint rules banning disallowed imports
- Layer 4: Bundle scan rejecting banned vendors
- Layer 5: WC registry patrol (`wc-registry-allowlist.ts`)
- Layer 6: Client guard (`CarbonAllowlistGuard`)
- Layer 7: Boot probe (`runCarbonOnlyBootProbe`)

**Component Mapping**:
```
Route.component_key → Component Registry → Carbon Catalog → IBM Carbon Component
```

---

### 6. Pages → UI Surfaces

**Table**: `dos.dynamic_ui_shells`

| Field | Description | Mapped To |
|-------|-------------|-----------|
| `layout_version` | Shell layout version | Workspace shell |
| `layout` | Layout JSONB structure | Surface regions |
| `module_code` | Module ownership | Module catalog |

**UI Surface Regions**:
- Shell surfaces (header, sidebar, main, footer)
- Page surfaces (masthead, content, context rail)
- Widget zones (kpi-strip, actions, widgets)
- Mobile variants (bottom-sheet, full-page)

**Surface Hierarchy**:
```
Shell Surface → Page Surface → Widget Zone → Component
```

---

### 7. Dynamic UI OS Entity Relationships

### Core Entity Graph

```
dynamic_ui_modules (1)
├── dynamic_ui_module_status (N) — per-tenant enrollment
├── dynamic_ui_navigation (N) — nav entries
│   └── dynamic_ui_navigation (N) — hierarchical
├── dynamic_ui_routes (N) — page experiences
│   ├── dynamic_ui_actions (N) — page actions
│   ├── dynamic_ui_widgets (N) — page widgets
│   ├── dynamic_ui_page_agents (N) — page agents
│   ├── dynamic_ui_kpis (N) — page KPIs
│   └── dynamic_ui_intents (N) — voice intents
├── dynamic_ui_agents (N) — AI agents
│   ├── dynamic_ui_agent_actions (N) — agent-bound actions
│   ├── dynamic_ui_page_agents (N) — page placement
│   ├── dynamic_ui_workflow_agents (N) — workflow binding
│   └── dynamic_ui_agent_squads (N) — squads
│       └── dynamic_ui_agent_squad_members (N) — squad members
├── dynamic_ui_data_resources (N) — data bindings
├── dynamic_ui_theme_tokens (N) — theme overrides
├── dynamic_ui_user_preferences (N) — user prefs
└── dynamic_ui_shells (N) — shell layouts
```

---

## Per-Entity Mappings

### Per Page
- **Route**: `path_pattern`
- **Component**: `component_key` → IBM Carbon
- **Permission**: `permission_key` → Role
- **Layout**: `layout` → UI Surface
- **KPIs**: `kpi_scope` → KPI definitions
- **Actions**: `route` → Action catalog
- **Widgets**: `route` → Widget catalog
- **Agents**: `route` → Agent placement
- **Data**: `data_resource_key` → Data resources
- **Realtime**: `realtime_channels` → Event topics

### Per Feature
- **Audit**: `audit_enabled` flag
- **Realtime**: `realtime_enabled` flag
- **Evidence**: `evidence_required` flag
- **Signature**: `signature_widget` key
- **Mobile**: `mobile_variant` JSONB
- **Empty State**: `empty_state_key`
- **Error State**: `error_state_key`

### Per Agent
- **ID**: A01-A13 (canonical agents)
- **Level**: L1-L4 (autonomy)
- **Scope**: page, workflow, global
- **Capabilities**: JSONB capability set
- **Pages**: `dynamic_ui_page_agents`
- **Actions**: `dynamic_ui_agent_actions`
- **Workflows**: `dynamic_ui_workflow_agents`
- **Squads**: `dynamic_ui_agent_squads`

### Per Role
- **Permissions**: `permission_key` across all entities
- **Visibility**: `visible_when_perm` conditional rendering
- **Profiles**: `visible_when_profile` profile-based access
- **Audit**: Role-based audit trails

### Per Navigation
- **Module**: `module_code` ownership
- **Hierarchy**: `parent_id` tree structure
- **Route**: Target page path
- **Order**: `sort_order` display sequence
- **Readiness**: `readiness` gate status

### Per IBM Carbon Component
- **Registry**: `dos.dynamic_ui_component_registry`
- **Catalog**: `dos.ui_carbon_components`
- **Enforcement**: 7-layer stack (DB → Server → Lint → Bundle → WC → Client → Boot)
- **Approval**: `approval_status = 'approved'`
- **Vendor**: `vendor = 'ibm-carbon'`

### Per UI Surface
- **Shell**: `dynamic_ui_shells` layout JSONB
- **Page**: Surface regions (masthead, content, context)
- **Widget Zones**: Zone placement (kpi-strip, actions, widgets)
- **Mobile**: Variant layouts (bottom-sheet, full-page)
- **Theme**: `dynamic_ui_theme_tokens` overrides

---

## Dynamic UI OS Runtime Flow

### 1. Route Resolution
```
URL → dynamic_ui_routes.path_pattern
  → component_key → IBM Carbon Component
  → permission_key → Role Check
  → layout → UI Surface
```

### 2. Permission Check
```
User → DAuth Token → Roles → Permissions
  → visible_when_perm → UI Element Visibility
  → visible_when_profile → Profile-based Display
```

### 3. Component Resolution
```
component_key → dynamic_ui_component_registry
  → carbon_key → ui_carbon_components
  → CarbonAllowlistGuard.verify() → Runtime Check
```

### 4. Agent Placement
```
route → dynamic_ui_page_agents
  → agent_id → dynamic_ui_agents
  → presentation → Surface Layout
  → permission → Role Check
```

### 5. Data Binding
```
data_resource_key → dynamic_ui_data_resources
  → permission → Role Check
  → url_or_query → Data Fetch
  → shape_ref → Type Contract
```

---

## Enforcement Layers

### IBM Carbon Enforcement (7 Layers)
1. **DB Triggers**: Block non-IBM vendor rows
2. **Server Resolver**: Filter allowlist at API boundary
3. **ESLint**: Ban disallowed imports at build time
4. **Bundle Scan**: Reject banned vendors in emitted JS
5. **WC Patrol**: Block non-Carbon custom element registration
6. **Client Guard**: Runtime verify() before render
7. **Boot Probe**: Refuse service start on violations

### Role-Based Access Control
- DAuth central authority
- Permission keys per entity
- Conditional visibility rendering
- Profile-based access patterns

---

## Summary

The Dynamic UI OS provides a comprehensive entity mapping system that connects:

- **18 database tables** for UI configuration
- **7 Carbon enforcement layers** for component safety
- **13 canonical AI agents** (A01-A13) for automation
- **Role-based permissions** for access control
- **Hierarchical navigation** for structure
- **UI surface layouts** for rendering

All mappings are tenant-scoped, allowing platform defaults with per-tenant overrides.
