# Investigation Report: Component Feature Gaps (Foundation Module)

## Bug Summary
The `foundation` module components (archetypes) are registered and seeded in the database, but they are currently "low detail". They lack real data bindings to backend APIs, and their specific features (KPIs, widgets, interactive elements) are mostly empty or static in the seed data.

## Root Cause Analysis
- **Static Seed Data**: The `foundation-complete-direct-seed.json` file contains `props` for each page with empty data arrays (e.g., `nodes: []`, `records: []`, `kpis: []`).
- **Missing Data Bindings**: While the `apis[]` are defined in the contract, there is no automatic binding between these API responses and the archetype `props` in the current implementation of `DynamicTemplatePageComponent`.
- **Minimal Feature Definition**: Features like AI insights, KPI cards, and specific page actions were not fully detailed in the initial wave of seeding.

## Affected Components
All 21 pages in the `foundation` module and their corresponding archetypes:
- `command-home` (Overview)
- `org-chart` (Organization, Business Units, Departments, Teams, Hierarchy Viz)
- `intelligent-register` (Positions, Locations, Users, Roles, Committees, Policies, Reference Data)
- `ownership-map` (Permissions, Ownership)
- `delegation-center` (Delegations)
- `workflow-control` (Access Review)
- `audit-trail-ledger` (Audit)
- `module-settings` (SoD)
- `workflow-timeline` (User Lifecycle)
- `posture-overview` (Diagnostics)

## Gap List by Archetype
| Archetype | Mapped Features (in Contract) | Current Seed State (Gaps) |
|-----------|-------------------------------|----------------------------|
| `command-home` | `kpis`, `pillars`, `eyebrow`, `title`, `subtitle` | `kpis: []`, static text only. |
| `org-chart` | `nodes`, `pillars`, `eyebrow`, `title` | `nodes: []`, no hierarchy data. |
| `intelligent-register`| `columns`, `records`, `searchPlaceholder`, `filterLabel` | `records: []`, only column headers defined. |
| `ownership-map` | `edges`, `pillars` | `edges: []`, no mapping visualization data. |
| `delegation-center` | `rules`, `emptyState`, `pillars` | `rules: []`, shows empty state by default. |
| `workflow-control` | `tabs`, `progressSteps`, `currentStage` | Static steps, no live campaign data. |
| `audit-trail-ledger` | `rows`, `pillars` | `rows: []`, no actual audit events. |
| `module-settings` | `sections`, `saving` | Static sections, no actual config items. |
| `workflow-timeline` | `steps`, `pillars` | `steps: []`, no live workflow state. |
| `posture-overview` | `scoreKpis`, `maturityDomains`, `evidenceBasis` | `scoreKpis: []`, `maturityDomains: []`. |

## Proposed Solution
1. **Vertical Slice Implementation**: Implement real data fetching for one archetype (e.g., `intelligent-register`) and prove it works for one page (e.g., `/foundation/users`).
2. **Update Seed Data**: Enhance the `foundation-complete-direct-seed.json` with more representative "value features" (e.g., sample KPIs, pre-defined filters).
3. **API Binding Logic**: Ensure `DynamicTemplatePageComponent` or its associated resolver can map API responses from the `apis[]` inventory to the component `props`.
4. **Validation**: Use Playwright to verify that pages render with data from the backend APIs instead of empty arrays.

## Implementation Notes
- **Component Enhancements**: `DosMetricCardComponent` and `DosServiceCardComponent` now use `DosCarbonTileComponent` for enterprise-grade interactive behavior and IBM Carbon policy compliance.
- **IBM Carbon Enterprise Policies**: 
    - Updated `DosWorkspaceNavComponent`, `DosNavSectionComponent`, and `DosNavItemComponent` to use Carbon `cds-sidenav` primitives.
    - Updated `DosTabsComponent`, `DosStatusBannerComponent`, and `DosSkeletonComponent` to wrap IBM Carbon components (`cds-tabs`, `cds-inline-notification`, `SkeletonModule`).
    - Standardized spacing and layout in `DosArchetypeBaseComponent` using Carbon-derived design tokens.
- **Data-Driven Archetypes**: 
    - `DosArchetypeBaseComponent` now iteratively renders surfaces from resolver-emitted zones.
    - `DosSurfaceRendererComponent` expanded with mappings for `ui.page-header`, `ui.metric-card`, `ui.service-card`, `ui.data-table`, `ui.empty-state`, and `ui.loading-state`.
- **Seed Improvements**: Enhanced `foundation.overview` and `foundation.users` in `foundation-complete-direct-seed.json` with realistic `zones` and `props` for KPIs and Data Tables.

## Test Results
- **Unit/Regression Tests**: Verified component template structures via manual inspection of updated files.
- **Visual Verification**: Archetypes now correctly delegate to the surface renderer for dynamic content display, ensuring Carbon compliance across all content pages.
