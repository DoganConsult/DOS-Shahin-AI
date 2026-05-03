# Workflow Module — Complete Direct Seed Content

## 1. Module identity

| Field | Value |
|---|---|
| module_code | `workflow` |
| product_key | `shahin-ai` |
| route_base | `/workflow` |
| owner_service | `workflow-service` |
| module_status | `active_after_validation` |
| module_name_en | `Workflow` |
| module_name_ar | `Workflow` |
| category | `workflow` |

## 2. Initialization group

### `dos.module_registry`

| module_code | product_key | title_en | category | status | owner_service |
|---|---|---|---|---|---|
| `workflow` | `shahin-ai` | `Workflow` | `workflow` | `active` | `workflow-service` |

### `dos.navigation_registry`

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
|---|---|---|---|---|---|---|
| `workflow` | `workflow` | `/workflow` | `Workflow` | `Workflow` | `workflow.read` | 10 |
| `workflow.overview` | `workflow` | `/workflow/overview` | Overview | نظرة عامة | `workflow.read` | 10 |
| `workflow.templates` | `workflow` | `/workflow/templates` | Templates | القوالب | `workflow.templates.read` | 20 |
| `workflow.instances` | `workflow` | `/workflow/instances` | Instances | المثيلات | `workflow.instances.read` | 30 |
| `workflow.approvals` | `workflow` | `/workflow/approvals` | Approvals | الموافقات | `workflow.approvals.read` | 40 |

### Dynamic UI route/component rows

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
|---|---|---|---|---|---|---|
| `workflow.overview.page` | `/workflow/overview` | `workflow` | `workflow.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `workflow.templates.page` | `/workflow/templates` | `workflow` | `workflow.templates.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `workflow.instances.page` | `/workflow/instances` | `workflow` | `workflow.instances.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |
| `workflow.approvals.page` | `/workflow/approvals` | `workflow` | `workflow.approvals.read` | `ibm-carbon` | `VERIFY_CARBON_KEY` | `approved` |

### Permissions

| permission_code | description |
|---|---|
| `workflow.admin` | workflow admin |
| `workflow.approvals.read` | workflow approvals read |
| `workflow.instances.read` | workflow instances read |
| `workflow.read` | workflow read |
| `workflow.templates.read` | workflow templates read |
| `workflow.write` | workflow write |

### Roles and bindings

| role_code | permissions |
|---|---|
| `tenant_owner` | all `workflow.*` |
| `workflow_admin` | `workflow.read`, `workflow.write`, `workflow.admin` |
| `workflow_operator` | read/write operational permissions |
| `workflow_auditor` | read/audit permissions |
| `standard_user` | read only if tenant enables module |

## 3. Provisioning group per tenant

| Table | Required seed |
|---|---|
| `dos.tenant_product_activation` | `tenant_id + shahin-ai + active` |
| `dos.tenant_module_entitlements` | `tenant_id + workflow + active` |
| `dos.tenant_memberships` | user has tenant membership and role |
| `dos.tenant_trials` | active trial if trial tenant |
| `dos.tenant_subscriptions` | active/trialing subscription |
| OpenFGA / DAuth tuples | user/role/module/resource tuples |

## 4. Business / operations group

| Table | Purpose | Scope |
|---|---|---|
| `dos.workflow_approvals` | page data / API backing | `tenant_id` required where applicable |
| `dos.workflow_instances` | page data / API backing | `tenant_id` required where applicable |
| `dos.workflow_templates` | page data / API backing | `tenant_id` required where applicable |

## 5. Page seed matrix

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `workflow.overview` | `/workflow/overview` | Overview | نظرة عامة | `WorkflowOverviewComponent` | `GET /api/workflow/overview` | `dos.workflow_instances` | `workflow.read` | `VERIFY` |
| 2 | `workflow.templates` | `/workflow/templates` | Templates | القوالب | `WorkflowTemplatesComponent` | `GET /api/workflow/templates` | `dos.workflow_templates` | `workflow.templates.read` | `VERIFY` |
| 3 | `workflow.instances` | `/workflow/instances` | Instances | المثيلات | `WorkflowInstancesComponent` | `GET /api/workflow/instances` | `dos.workflow_instances` | `workflow.instances.read` | `VERIFY` |
| 4 | `workflow.approvals` | `/workflow/approvals` | Approvals | الموافقات | `WorkflowApprovalsComponent` | `GET /api/workflow/approvals` | `dos.workflow_approvals` | `workflow.approvals.read` | `VERIFY` |

## 6. Direct SQL seed skeleton

```sql
BEGIN;

-- UPSERT workflow into dos.module_registry
-- UPSERT parent and child rows into dos.navigation_registry
-- UPSERT Dynamic UI rows only after carbon_key verification
-- UPSERT permissions into platform_dauth.permissions
-- UPSERT role bindings into platform_dauth.role_permissions
-- UPSERT tenant entitlements only for selected tenant

COMMIT;
```

## 7. Validation checklist

- [ ] module_registry row exists
- [ ] nav rows exist
- [ ] route exists
- [ ] component exists
- [ ] API exists
- [ ] backend route exists
- [ ] DB table/query exists
- [ ] permission exists
- [ ] role binding exists
- [ ] tenant entitlement exists
- [ ] org/tenant scope enforced
- [ ] no mock/static data
- [ ] build passes
Workspace Host features and components
#	Feature	Purpose	Component / selector	IBM Carbon primitives
1	App shell frame	Overall authenticated shell	dos-app-shell	UIShell, Content, Layer
2	Workspace header	Product identity + global actions	dos-workspace-header	Header, HeaderName, HeaderGlobal, HeaderAction
3	Product logo/name	Shahin-AI+ brand identity	inside dos-workspace-header	HeaderName
4	Tenant/workspace label	Show current tenant/workspace context	inside dos-workspace-header	Tag, HeaderAction
5	Selected module label	Show active module/page context	inside dos-workspace-header	Tag, breadcrumb text
6	Account menu	Profile, tenant profile, language, theme, logout	dos-account-menu or header slot	HeaderAction, Popover/Menu, Button
7	Language switch	EN/AR toggle	inside account/header	Button, Tag
8	Theme switch	Light/dark mode	inside account/header	Toggle, Button
9	Notification entry	Bell/inbox access	dos-inbox-center	HeaderAction, Tag, Notification, Toast
10	Command search	Global Cmd/Ctrl+K launcher	dos-command-search	Search, Modal, Button
11	Quick create	Global create action	dos-quick-create	Button, Menu, Modal
12	Desktop sidebar	Main module/page navigation	dos-workspace-sidebar	SideNav, SideNavMenu, SideNavItem
13	Sidebar group labels	Registry/i18n-driven groups	inside dos-workspace-sidebar	SideNavMenu
14	Sidebar item labels	Unique nav item labels, no Title placeholders	inside dos-workspace-sidebar	SideNavItem
15	Sidebar collapse/rail	Compact desktop mode	dos-workspace-sidebar	SideNav
16	Sidebar search/filter	Filter navigation labels	inside dos-workspace-sidebar	Search
17	Mobile drawer	Mobile navigation drawer	dos-mobile-drawer	SideNav, HeaderAction
18	Mobile bottom nav	High-priority mobile nav	dos-mobile-bottom-nav	Button, Tag
19	Breadcrumb strip	Route/page hierarchy	shell breadcrumb container	Breadcrumb
20	Workspace status bar	Tenant/session/system health strip	dos-workspace-status-bar	Tag, InlineNotification, ProgressBar
21	Action queue entry	Global tasks/approvals queue	dos-action-queue	Tile, Tag, Button
22	Agent activity strip	Recent AI/agent work summary	dos-agent-activity-strip	Tag, ProgressBar, SkeletonText
23	Context panel	Right-side contextual info/help	dos-context-panel	Panel/Layer, StructuredList, Button
24	Global loading frame	Shell-level loading state	shell loading wrapper	SkeletonText, SkeletonPlaceholder
25	Global error frame	401/403/404/maintenance shell messages	shell error wrapper	InlineNotification, Button
26	Content slot	Where pages/modules render	<router-outlet /> / dynamic outlet	Content, Grid, Column, Layer
27	Permission-aware nav	Hide/disable nav by permissions	nav adapter + sidebar	SideNavItem, Tag
28	Tenant-aware state	Current tenant/workspace/session context	shell state service	no visual primitive required
29	RTL/LTR layout	Arabic/English direction support	host + wrappers	logical CSS
30	Responsive shell	390/430/768/1440 support	shell CSS/wrappers	Grid, SideNav, Layer
31	Safe-area support	iOS/browser chrome spacing	shell CSS	CSS env safe-area vars
32	Toast outlet	Global toast notifications	shell toast outlet	Toast
33	Help/support entry	Docs/help/contact support	header/context panel	HeaderAction, Modal, Link
34	Session expiry warning	User warning before logout	status/header alert	InlineNotification, Modal
35	Impersonation/admin banner	Safe notice if support/admin context	status bar	InlineNotification, Tag
36	Trial/subscription banner	Workspace-level product state	status bar	InlineNotification, Tag
37	Offline/reconnect banner	Network/SSE/WebSocket state	status bar	InlineNotification
38	Accessibility landmarks	Header/nav/main semantics	shell wrappers	semantic HTML + Carbon
39	Keyboard shortcuts	Cmd/Ctrl+K, nav close, escape	command/search/drawer	Angular handlers
40	Correlation/request ID display	Debug/proof for errors	error panel/context	StructuredList, CodeSnippet if available
Must-have selectors for Workspace Host Kit
dos-app-shell
dos-workspace-header
dos-workspace-sidebar
dos-mobile-drawer
dos-mobile-bottom-nav
dos-command-search
dos-inbox-center
dos-workspace-status-bar
dos-action-queue
dos-agent-activity-strip
dos-context-panel
dos-quick-create
Do not put these in Workspace Host
Foundation KPI cards
Risk heatmap
Finance dashboard
Module tables
Module forms
Module business API calls
Module-specific cards
Hardcoded module metadata maps
Route migration logic
DB seed logic
Customer records
Priority order
Priority	Implement first
P0	Header, sidebar, content slot, account menu, nav label fix
P1	Mobile drawer/bottom nav, command search, notifications
P2	Status bar, quick create, action queue
P3	Agent activity strip, context panel, help/support
P4	Session expiry, offline/reconnect, correlation ID, admin banners