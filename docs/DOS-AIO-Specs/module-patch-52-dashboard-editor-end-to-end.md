# Module Patch MP-52 — Dashboard Editor Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 52 — Dashboard Editor Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Dashboard Editor module** end to end. 

It tells an agent exactly how to:
- inspect dashboard layout editing, widget placement, custom dashboard creation, and share permissions
- compare the current implementation against the canonical dashboard-editor target
- know what belongs to the Editor, what belongs to DOS dashboarding, and how widget rendering is deferred
- know exactly what files, services, and dynamic DOM injection architecture must exist

### 0.4 Module identity
- Module code: `dashboard-editor`
- Layer: technical support surface
- Criticality: **P3 low**
- Runtime role: visual dashboard layout editor, drag-and-drop widget placement, dashboard sharing and permission management, template configuration
- Primary dependency domains: DOS foundation, DAuth control spine, dashboard, widgets

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0 (Common Enforcement Standard)
- Patch 1 (Platform Full-Stack Core)
- Patch 3 (DAuth Access)
- Patch 9 (UI/UX Standards)
- Patch 11 (Observability)

---

## 2. Module Purpose and Boundaries

### 2.1 What Dashboard Editor owns directly
- Dashboard layout JSON specification management
- Canvas editing actions (drag, drop, resize, reorder of widgets)
- Custom dashboard creation (user-specific views)
- Dashboard sharing controls and DAuth access configuration for layouts
- Default template definitions

### 2.2 What Dashboard Editor consumes from DOS
- Foundation org structure
- Event backbone (notifying layout changes to connected clients)

### 2.3 What Dashboard Editor consumes from DAuth
- Scoped access (determining who is allowed to edit global dashboards vs personal dashboards)

### 2.4 What Dashboard Editor consumes from adjacent modules
- **Dashboard**: Handing off the compiled layout JSON to the Dashboard module for standard read-only rendering
- **Widgets**: Querying the Widgets catalog registry to know what components are available to be dragged onto the canvas

### 2.5 What Dashboard Editor must not implement
- Duplicate widget component code (consumed directly from the Widgets catalog)
- Rendering heavy data models itself (the editor manages *metadata*, not the data)

---

## 3. Canonical Backend Structure

```text
backend/src/modules/dashboard-editor/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  diagnostics/
  ports/
  index.ts
  dashboard-editor.module.ts
```

### 3.1 Required backend service families
- **Layout Editor Service**: Parsing, validating, and compacting dashboard layout metadata
- **Template Management Service**: Serving predefined default layouts by user role
- **Sharing Service**: Managing access lists and sharing tokens for custom dashboards
- **Diagnostics Service**: Ensuring the structural integrity of saved JSON layouts

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/dashboard-editor/
  pages/
  components/
  services/
  contracts/
  store/
  index.ts
```

Required surfaces:
- Interactive Dashboard Editor Canvas
- Draggable Widget Palette Sidebar
- Widget Configuration Dialogs (for setting widget-specific properties like time rangers)
- Layout Sharing & Permissions Dialog
- Template Browser

---

## 5. Data Model Requirements

Dashboard Editor expands on core dashboard tables:
- `dashboard_layouts` — dashboard_id, user_id, layout_json, is_global, created_at, updated_at
- `dashboard_templates` — template_id, role_target, layout_json
- `dashboard_shares` — share_id, dashboard_id, shared_with_user_id, permission_type (read/edit)

---

## 6. API Surface Requirements

Required route groups:
- **Layout CRUD**: `/api/dashboard-editor/layouts`
- **Template Management**: `/api/dashboard-editor/templates`
- **Sharing Configuration**: `/api/dashboard-editor/shares`
- **Diagnostics**: `/api/dashboard-editor/diagnostics`

Required contracts:
- `DashboardLayoutContract`
- `DashboardTemplateContract`
- `DashboardShareContract`

Zod schemas must validate that `layout_json` adheres to a strict grid structure (preventing corrupted database entries).

---

## 7. Workflow and DAuth Integration

- **DAuth**: Users can only edit `is_global = true` dashboards if they possess the `dashboard.global.edit` permission. Users can freely edit their own personal dashboards.
- **Workflow**: No workflow engines required.

---

## 8. AI Integration

Allowed AI participation:
- Smart layout suggestions based on the user's role or common usage patterns (e.g., "Add the Risk Matrix widget")
- Auto-arrangement of widgets for optimal resolution viewing

---

## 9. UI and Experience Requirements

The UI must provide:
- A buttery-smooth drag-and-drop experience utilizing modern HTML5 drag constraints or equivalent Angular libraries.
- Live-preview mode.
- Contextual menus for resizing widgets directly on the grid.

Must define:
- Empty states (when no widgets are on the canvas)
- Explicit visual cues when saving layout state.


### 9.1 Cross-Module UX and Interactivity
- **Live Widget Registry Interop**: Editors can drag and drop active widgets from any licensed DOS module seamlessly into the canvas.
- **Real-Time Layout Sync**: Edits made on global templates propagate instantly to all active browsers via WebSocket bursts.

---

## 10. Settings/Admin/Runtime Control

Required controls:
- Enforceable maximum widgets per dashboard (to prevent browser crash limits)
- Role-based default assignments (e.g. CISO gets the CISO template by default)
- Template catalog enablement switches

---

## 11. Observability and Operations

Required diagnostics:
- Orphaned dashboards (custom dashboards belonging to deactivated users)
- Broken widget references (a dashboard references a widget code that no longer exists in the Widgets catalog)
- Excessively large layout arrays

---

## 12. Required Tests

- JSON structural validation unit tests
- Layout sharing DAuth boundary tests
- Template initialization tests
- Diagnostic sweep logic tests

---

## 13. Exact Build Instructions

If `dashboard-editor` lacks persistence:
- Build the actual PostgreSQL tables handling the layout objects. Avoid keeping preferences in localstorage as they will not sync across devices.
- Connect the frontend grid component directly to the API sync layer.

---

## 14. Acceptance Criteria

Pass only if:
- Dashboards can be fully customized, saved, and recalled.
- Templates properly propagate to new users automatically.
- DAuth accurately prevents unauthorized edits to global dashboards.

---

## 15. Fail Conditions

FAIL if:
- Layouts are purely frontend localstorage.
- A user can arbitrarily inject malformed JSON into the `/layouts` endpoint causing application crashes.
- Shared URLs allow unauthorized data leakage.

---

## 16. Recommended Next Part

After this module patch, the next recommended module patch is:
**Module Patch 53 — GRC Query Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the visual editor against the DOS standard, verify secure JSON persistance, map out drag-and-drop dependencies, and validate in the ledger.
