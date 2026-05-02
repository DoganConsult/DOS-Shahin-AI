// Dynamic UI / @dos/ui-system contracts.
// Implementations live in the platform (dynamic-ui-service + @dos/dynamic-ui-client + @dos/ui-system).
// Profile-pluggable: every UI row carries a `profileCode`; `DynamicUiClient` resolves the
// active profile from the tenant via `ProfileResolver`.

export type ScopeLevel = 'org' | 'business_unit' | 'department' | 'team' | 'position' | 'own';
export type ViewKind   = 'list' | 'detail' | 'form' | 'dashboard' | 'report' | 'settings' | 'workflow' | 'inbox';
export type ActionKind = 'toolbar' | 'row' | 'bulk' | 'header' | 'sidebar';
export type WidgetKind = 'kpi' | 'chart' | 'list' | 'progress' | 'heatmap';

// ============================================================
// Profile envelope
// ============================================================
export interface Profile {
  code: string;                 // 'grc' | 'iso27001' | 'dora' | ...
  name: string;
  description?: string;
  version: string;
  defaultLocale: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
}

export interface TenantProfileBinding {
  tenantId: string;
  profileCode: string;
  activatedAt: string;
}

// ============================================================
// UI rows (every one carries profileCode)
// ============================================================
export interface UiModule {
  profileCode: string;
  code: string;
  name: string;
  cardPosition: number;
  isBusinessCard: boolean;
  icon?: string;
  colorToken?: string;
  description?: string;
  enabled: boolean;
  version: string;
}

export interface UiRoute {
  id: string;
  profileCode: string;
  moduleCode: string;
  path: string;
  viewKind: ViewKind;
  layout: string;
  requiredPermission?: string;
  metadata: Record<string, unknown>;
}

export interface UiView {
  id: string;
  profileCode: string;
  moduleCode: string;
  viewCode: string;
  kind: ViewKind;
  titleToken: string;
  dataSource: string;
  spec: Record<string, unknown>;
  requiredPermission?: string;
  columns?: UiColumn[];
  filters?: UiFilter[];
  actions?: UiAction[];
}

export interface UiColumn {
  profileCode: string;
  field: string;
  headerToken: string;
  width?: string;
  sortable: boolean;
  filterable: boolean;
  position: number;
  cellRenderer?: string;
  requiredPermission?: string;
}

export interface UiFilter {
  profileCode: string;
  field: string;
  operator: 'eq' | 'in' | 'between' | 'lt' | 'gt' | 'contains' | 'starts_with';
  control: 'text' | 'select' | 'date' | 'range' | 'tags';
  optionsSource?: string;
  defaultValue?: unknown;
  position: number;
}

export interface UiAction {
  profileCode: string;
  code: string;
  labelToken: string;
  kind: ActionKind;
  requiredPermission?: string;
  workflowEvent?: string;
  confirm: boolean;
}

export interface UiForm {
  profileCode: string;
  moduleCode: string;
  formCode: string;
  schema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
  requiredPermission?: string;
}

export interface UiNavigationNode {
  id: string;
  profileCode: string;
  moduleCode: string;
  parentId?: string;
  labelToken: string;
  icon?: string;
  routePath?: string;
  position: number;
  requiredPermission?: string;
  children?: UiNavigationNode[];
}

export interface UiWidget {
  profileCode: string;
  moduleCode: string;
  widgetCode: string;
  kind: WidgetKind;
  titleToken: string;
  dataSource: string;
  config: Record<string, unknown>;
  defaultSize: 'small' | 'medium' | 'large';
}

// ============================================================
// Resolver context
// ============================================================
export interface UiResolverContext {
  tenantId: string;
  userId: string;
  profileCode: string;          // resolved from tenant_profile via ProfileResolver
  roles: string[];
  permissions: string[];
  scope: { level: ScopeLevel; id?: string };
  locale: string;
  rtl: boolean;
}

// ============================================================
// Resolvers / loaders
// ============================================================
export interface ProfileResolver {
  /** Return the active profile for the given tenant (default fallback: 'grc'). */
  resolveProfileForTenant(tenantId: string): Promise<Profile>;
  listProfiles(): Promise<Profile[]>;
}

export interface DynamicUiClient {
  resolveModule(code: string, ctx: UiResolverContext): Promise<UiModule>;
  resolveRoute(moduleCode: string, path: string, ctx: UiResolverContext): Promise<UiRoute>;
  resolveView(moduleCode: string, viewCode: string, ctx: UiResolverContext): Promise<UiView>;
  resolveForm(moduleCode: string, formCode: string, ctx: UiResolverContext): Promise<UiForm>;
  resolveNavigation(moduleCode: string, ctx: UiResolverContext): Promise<UiNavigationNode[]>;
  resolveWidgets(moduleCode: string, ctx: UiResolverContext): Promise<UiWidget[]>;
  resolveCards(ctx: UiResolverContext): Promise<UiModule[]>;
}

// Permission guard helper
export function canAccess(required: string | undefined, ctx: UiResolverContext): boolean {
  if (!required) return true;
  return ctx.permissions.includes(required);
}

// Profile bundle on disk — what scaffold-new-profile.sh emits.
export interface ProfileBundle {
  profile: Profile;
  manifests: Record<string, unknown>[];          // grc-module.profile.json files
  permissions: { code: string; module: string; verb: string }[];
  roles: { code: string; module: string; roleTemplate: string }[];
  workflows: Record<string, unknown>[];          // <module>.<hook>.workflow.json
  uiSeeds: { table: string; rows: Record<string, unknown>[] }[];
  migrations: { filename: string; sql: string }[];
}
