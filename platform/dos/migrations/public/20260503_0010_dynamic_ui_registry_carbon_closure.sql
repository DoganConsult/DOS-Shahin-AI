-- =====================================================================
-- 0010 — IBM Carbon registry closure (idempotent).
--
-- Goal: every component_key referenced by dos.dynamic_ui_routes is
-- present in dos.dynamic_ui_component_registry, classified to an
-- Angular-usable Carbon archetype carbon_key, and approved.
--
-- Constraints (locked by trg_carbon_only_runtime / fn_block_non_ibm_runtime_row):
--   * vendor MUST be 'ibm-carbon'
--   * carbon_key MUST exist in dos.ui_carbon_components
--   * referenced catalog row's runtime_status MUST NOT be in
--     {'blocked-react-only','missing-upstream-angular-binding','catalog-only'}
--
-- Safe to re-run: pure INSERT … ON CONFLICT DO NOTHING + classification
-- helper view materialised via CTE. No deletes, no trigger weakening,
-- no dedupe of existing wrapper rows.
-- =====================================================================

BEGIN;

-- 1) Closure of all dos.dynamic_ui_routes.component_key values into
--    dos.dynamic_ui_component_registry, classified by suffix archetype.
WITH route_orphan AS (
  SELECT DISTINCT rt.component_key
  FROM dos.dynamic_ui_routes rt
  LEFT JOIN dos.dynamic_ui_component_registry r
    ON r.component_key = rt.component_key
  WHERE r.component_key IS NULL
),
classified AS (
  SELECT
    component_key,
    CASE
      WHEN component_key LIKE 'audit-timeline.%' THEN 'structured-list'
      WHEN component_key LIKE 'matrix.%'         THEN 'table'
      WHEN component_key LIKE 'page-masthead.%'  THEN 'breadcrumb'
      WHEN component_key LIKE 'smart-grid.%'     THEN 'table'
      WHEN component_key LIKE 'platform.%.overview'         THEN 'tiles'
      WHEN component_key LIKE 'platform.%.audit'            THEN 'table'
      WHEN component_key LIKE 'platform.%.events'           THEN 'table'
      WHEN component_key LIKE 'platform.%.alerts'           THEN 'table'
      WHEN component_key LIKE 'platform.%.metrics'          THEN 'tiles'
      WHEN component_key LIKE 'platform.%.services'         THEN 'table'
      WHEN component_key LIKE 'platform.%.detections'       THEN 'table'
      WHEN component_key LIKE 'platform.%.incidents'        THEN 'table'
      WHEN component_key LIKE 'platform.%.policies'         THEN 'table'
      WHEN component_key LIKE 'platform.%.lifecycle'        THEN 'structured-list'
      WHEN component_key LIKE 'platform.%.organizations'    THEN 'table'
      WHEN component_key LIKE 'platform.%.persons'          THEN 'table'
      WHEN component_key LIKE 'platform.%.tenants'          THEN 'table'
      WHEN component_key LIKE 'platform.%.quotas'           THEN 'table'
      WHEN component_key LIKE 'platform.%.provisioning'     THEN 'structured-list'
      WHEN component_key LIKE 'platform.%.directory'        THEN 'table'
      WHEN component_key LIKE 'platform.%.members'          THEN 'table'
      WHEN component_key LIKE 'platform.%.profile'          THEN 'tiles'
      WHEN component_key LIKE 'platform.%.settings'         THEN 'tiles'
      WHEN component_key LIKE 'platform.%.tokens'           THEN 'structured-list'
      WHEN component_key LIKE 'platform.%.flags'            THEN 'structured-list'
      WHEN component_key LIKE 'platform.%.engine'           THEN 'tiles'
      WHEN component_key LIKE 'platform.%.gateway'          THEN 'tiles'
      WHEN component_key LIKE 'platform.%.governance'       THEN 'tiles'
      WHEN component_key LIKE 'platform.%.registries'       THEN 'table'
      WHEN component_key LIKE 'platform.%.schemas'          THEN 'table'
      WHEN component_key LIKE 'platform.%.list'             THEN 'table'
      WHEN component_key LIKE 'platform.%'                  THEN 'tiles'
      WHEN component_key LIKE '%OverviewPage'      THEN 'tiles'
      WHEN component_key LIKE '%OverviewComponent' THEN 'tiles'
      WHEN component_key LIKE '%HomePage'          THEN 'tiles'
      WHEN component_key LIKE '%HubPage'           THEN 'tiles'
      WHEN component_key LIKE '%DashboardPage'     THEN 'tiles'
      WHEN component_key LIKE '%HeatmapPage'       THEN 'tiles'
      WHEN component_key LIKE '%RegisterPage'      THEN 'table'
      WHEN component_key LIKE '%TemplatesPage'     THEN 'table'
      WHEN component_key LIKE '%ListPage'          THEN 'table'
      WHEN component_key LIKE '%LibraryPage'       THEN 'table'
      WHEN component_key LIKE '%CatalogPage'       THEN 'table'
      WHEN component_key LIKE '%RequestsPage'      THEN 'table'
      WHEN component_key LIKE '%ReviewsPage'       THEN 'table'
      WHEN component_key LIKE '%TasksPage'         THEN 'table'
      WHEN component_key LIKE '%ReportsPage'       THEN 'table'
      WHEN component_key LIKE '%FindingsPage'      THEN 'table'
      WHEN component_key LIKE '%EngagementsPage'   THEN 'table'
      WHEN component_key LIKE '%PlanPage'          THEN 'tiles'
      WHEN component_key LIKE '%MappingPage'       THEN 'table'
      WHEN component_key LIKE '%TestingPage'       THEN 'table'
      WHEN component_key LIKE '%AnalyticsPage'     THEN 'tiles'
      WHEN component_key LIKE '%ExecutionsPage'    THEN 'table'
      WHEN component_key LIKE '%DesignerPage'      THEN 'tiles'
      WHEN component_key LIKE '%TreatmentsPage'    THEN 'table'
      WHEN component_key LIKE '%AssessmentsPage'   THEN 'table'
      WHEN component_key LIKE '%SettingsPage'      THEN 'tiles'
      WHEN component_key LIKE '%TenantSettingsPage' THEN 'tiles'
      WHEN component_key LIKE '%TenantProfilePage'  THEN 'tiles'
      WHEN component_key LIKE '%ProfilePage'       THEN 'tiles'
      WHEN component_key LIKE '%PoliciesPage'      THEN 'table'
      WHEN component_key LIKE '%PoliciesComponent' THEN 'table'
      WHEN component_key LIKE '%UsersComponent'    THEN 'table'
      WHEN component_key LIKE '%RolesComponent'    THEN 'table'
      WHEN component_key LIKE '%RoleDetailComponent' THEN 'tiles'
      WHEN component_key LIKE '%TeamsComponent'    THEN 'table'
      WHEN component_key LIKE '%PositionsComponent' THEN 'table'
      WHEN component_key LIKE '%DepartmentsComponent' THEN 'table'
      WHEN component_key LIKE '%LocationsComponent' THEN 'table'
      WHEN component_key LIKE '%BusinessUnitsComponent' THEN 'table'
      WHEN component_key LIKE '%CommitteesComponent' THEN 'table'
      WHEN component_key LIKE '%DelegationsComponent' THEN 'table'
      WHEN component_key LIKE '%DataProcessingComponent' THEN 'table'
      WHEN component_key LIKE '%ReferenceDataComponent' THEN 'table'
      WHEN component_key LIKE '%PermissionMatrixComponent' THEN 'table'
      WHEN component_key LIKE '%OwnershipMappingComponent' THEN 'table'
      WHEN component_key LIKE '%OperationsReadinessComponent' THEN 'tiles'
      WHEN component_key LIKE '%OrganizationComponent' THEN 'tiles'
      WHEN component_key LIKE '%AccessReviewComponent' THEN 'table'
      WHEN component_key LIKE '%AuditComponent'    THEN 'table'
      WHEN component_key LIKE '%SettingsComponent' THEN 'tiles'
      WHEN component_key = 'OpsHome'               THEN 'tiles'
      ELSE 'tiles'
    END AS ck
  FROM route_orphan
)
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, approved_at, schema_version, metadata)
SELECT
  cl.component_key,
  'ibm-carbon',
  'approved',
  cl.ck,
  NOW(),
  '1',
  jsonb_build_object(
    'source', 'closure-migration-0010',
    'archetype', cl.ck,
    'origin', 'dynamic_ui_routes_closure'
  )
FROM classified cl
INNER JOIN dos.ui_carbon_components c
  ON c.carbon_key = cl.ck
 AND c.vendor = 'ibm-carbon'
 AND c.is_active = true
 AND c.runtime_status IN ('active','wrapper-required')
ON CONFLICT (component_key) DO NOTHING;

-- 2) Hard re-assertion that every Angular-usable Carbon catalog key has at
--    least one registry row. This is a no-op today (148/148 already covered)
--    but kept for forward-safety as the catalog grows.
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, approved_at, schema_version, metadata)
SELECT
  c.carbon_key,
  'ibm-carbon',
  'approved',
  c.carbon_key,
  NOW(),
  '1',
  jsonb_build_object(
    'source', 'closure-migration-0010',
    'archetype', c.carbon_key,
    'origin', 'catalog_self_alias'
  )
FROM dos.ui_carbon_components c
LEFT JOIN dos.dynamic_ui_component_registry r
  ON r.carbon_key = c.carbon_key
WHERE c.vendor = 'ibm-carbon'
  AND c.is_active = true
  AND c.runtime_status IN ('active','wrapper-required')
  AND r.component_key IS NULL
ON CONFLICT (component_key) DO NOTHING;

COMMIT;

-- =====================================================================
-- Validation block (read-only). Re-run after apply to confirm invariants.
-- =====================================================================
-- 1. Every dynamic_ui_routes.component_key is in the registry:
--    SELECT count(*) FROM dos.dynamic_ui_routes rt
--    LEFT JOIN dos.dynamic_ui_component_registry r ON r.component_key=rt.component_key
--    WHERE r.component_key IS NULL;            -- expected 0
--
-- 2. Every Angular-usable Carbon catalog row has at least one registry entry:
--    SELECT count(*) FROM dos.ui_carbon_components c
--    WHERE c.is_active=true AND c.vendor='ibm-carbon'
--      AND c.runtime_status IN ('active','wrapper-required')
--      AND NOT EXISTS (SELECT 1 FROM dos.dynamic_ui_component_registry r
--                      WHERE r.carbon_key = c.carbon_key);  -- expected 0
--
-- 3. No registry row points at a blocked / react-only / deprecated catalog row:
--    SELECT count(*) FROM dos.dynamic_ui_component_registry r
--    JOIN dos.ui_carbon_components c ON c.carbon_key=r.carbon_key
--    WHERE c.runtime_status IN ('blocked-react-only',
--                               'missing-upstream-angular-binding',
--                               'deprecated','catalog-only');   -- expected 0
--
-- 4. All registry rows are vendor='ibm-carbon' and approval_status='approved':
--    SELECT count(*) FROM dos.dynamic_ui_component_registry
--    WHERE vendor <> 'ibm-carbon' OR approval_status <> 'approved'; -- expected 0
