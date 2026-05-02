export type ShellLayoutType =
  | 'hub'
  | 'workspace'
  | 'list-detail'
  | 'board'
  | 'cockpit'
  | 'admin-console'
  | 'reviewer-workspace';

export type ShellSlotId =
  | 'masthead'
  | 'kpi-strip'
  | 'action-bar'
  | 'main-content'
  | 'context-rail'
  | 'workflow-ribbon'
  | 'sticky-footer'
  | 'filter-panel'
  | 'detail-drawer'
  | 'preview-panel'
  | 'left-nav-tree'
  | 'editor-canvas'
  | 'validation-panel'
  | 'priority-queue'
  | 'trend-row'
  | 'ai-recommendations';

export interface ShellSlotConfig {
  slotId: ShellSlotId;
  visible: boolean;
  collapsed?: boolean;
  order?: number;
  widgetIds?: string[];
  cssClass?: string;
}

export interface ShellTabConfig {
  id: string;
  label: { en: string; ar: string };
  icon?: string;
  route?: string;
  default?: boolean;
  visible: boolean;
  order: number;
}

export interface ShellPanelConfig {
  id: string;
  position: 'left' | 'right' | 'bottom' | 'top';
  width?: string;
  collapsible: boolean;
  defaultCollapsed: boolean;
  visible: boolean;
}

export interface ShellWidgetZone {
  zoneId: string;
  label: { en: string; ar: string };
  maxWidgets: number;
  widgetIds: string[];
  layout: 'grid' | 'stack' | 'carousel';
  columns?: number;
}

export interface ShellActionBarConfig {
  slots: Array<{
    position: 'primary-create' | 'import' | 'bulk' | 'filters' | 'view-switch' | 'export' | 'ai-assist';
    actionId: string;
    label: { en: string; ar: string };
    icon: string;
    visible: boolean;
    disabled?: boolean;
  }>;
  showSearch: boolean;
  viewModes: Array<'table' | 'cards' | 'kanban' | 'timeline' | 'map'>;
  activeView: string;
}

export interface ShellDetailDrawerConfig {
  enabled: boolean;
  position: 'right' | 'bottom';
  width: string;
  sections: Array<{
    id: string;
    label: { en: string; ar: string };
    order: number;
    visible: boolean;
  }>;
}

export interface ResolvedShellConfig {
  moduleCode: string;
  productCode: string;
  tenantId: string;
  userId: string;
  layoutType: ShellLayoutType;
  lang: 'en' | 'ar';
  dir: 'ltr' | 'rtl';

  masthead: {
    moduleIcon: string;
    moduleName: { en: string; ar: string };
    purposeLine: { en: string; ar: string };
    accentToken: string;
    healthLevel: 'healthy' | 'warning' | 'critical' | 'unknown';
    dataFreshness: string | null;
    primaryAiAction: { id: string; label: { en: string; ar: string }; icon: string } | null;
    breadcrumbs: Array<{ label: { en: string; ar: string }; route?: string }>;
    contextTags: Array<{ label: string; color: string }>;
  };

  kpiStrip: {
    cards: Array<{
      id: string;
      label: { en: string; ar: string };
      icon: string;
      color: string;
      bg: string;
      route?: string;
      urgency?: boolean;
      workflow?: boolean;
      health?: boolean;
    }>;
    maxVisible: number;
  };

  actionBar: ShellActionBarConfig;
  slots: ShellSlotConfig[];
  tabs: ShellTabConfig[];
  panels: ShellPanelConfig[];
  widgetZones: ShellWidgetZone[];
  detailDrawer: ShellDetailDrawerConfig;

  workflow: {
    enabled: boolean;
    currentState?: string;
    completedStates?: string[];
    transitions?: string[];
    owner?: string;
    slaDueDate?: string;
    approvalsRequired?: number;
  };

  footer: {
    enabled: boolean;
    showSelectionCount: boolean;
    showSyncState: boolean;
    showSaveStatus: boolean;
  };

  statePreset?: 'loading' | 'skeleton' | 'empty-first-use' | 'empty-filtered' | 'no-permission' | 'error-recoverable' | 'error-blocking' | 'archived' | 'syncing';

  meta: {
    resolvedAt: string;
    sources: ShellConfigSource[];
    tier: 'full' | 'domain' | 'platform';
    automationLevel: 'full' | 'semi' | 'manual' | null;
    slaDefaultHours: number | null;
  };
}

export type ShellConfigSource = 'platform-default' | 'product-default' | 'tenant-override' | 'role-override' | 'user-preference';

export interface ShellOverride {
  source: ShellConfigSource;
  priority: number;
  layoutType?: ShellLayoutType;
  visibleSlots?: Partial<Record<ShellSlotId, boolean>>;
  slotOrder?: Partial<Record<ShellSlotId, number>>;
  kpiCardIds?: string[];
  kpiMaxVisible?: number;
  actionBarVisibility?: Partial<Record<string, boolean>>;
  viewModes?: Array<'table' | 'cards' | 'kanban' | 'timeline' | 'map'>;
  defaultView?: string;
  panelWidths?: Partial<Record<string, string>>;
  panelDefaults?: Partial<Record<string, { collapsed: boolean; visible: boolean }>>;
  tabVisibility?: Partial<Record<string, boolean>>;
  tabOrder?: Partial<Record<string, number>>;
  widgetZoneOverrides?: Partial<Record<string, { widgetIds: string[]; layout?: 'grid' | 'stack' | 'carousel' }>>;
  detailDrawerEnabled?: boolean;
  detailDrawerPosition?: 'right' | 'bottom';
  footerEnabled?: boolean;
}

export interface ShellResolverInput {
  productCode: string;
  tenantId: string;
  userId: string;
  roleCode: string;
  moduleCode: string;
  context?: Record<string, unknown>;
}

export interface ModuleContentProviderContract {
  moduleCode: string;
  widgets: ModuleWidgetRegistration[];
  forms: ModuleFormRegistration[];
  views: ModuleViewRegistration[];
  actions: ModuleActionRegistration[];
  detailComponents: ModuleDetailRegistration[];
}

export interface ModuleWidgetRegistration {
  widgetId: string;
  label: { en: string; ar: string };
  component: string;
  defaultZone: string;
  minWidth?: number;
  minHeight?: number;
  refreshInterval?: number;
}

export interface ModuleFormRegistration {
  formId: string;
  label: { en: string; ar: string };
  component: string;
  entityType: string;
  mode: 'create' | 'edit' | 'view' | 'clone';
}

export interface ModuleViewRegistration {
  viewId: string;
  label: { en: string; ar: string };
  component: string;
  viewType: 'table' | 'cards' | 'kanban' | 'timeline' | 'map' | 'chart';
  default?: boolean;
}

export interface ModuleActionRegistration {
  actionId: string;
  label: { en: string; ar: string };
  icon: string;
  position: 'primary-create' | 'import' | 'bulk' | 'export' | 'ai-assist' | 'toolbar' | 'context-menu';
  handler: string;
  permission?: string;
  confirmRequired?: boolean;
}

export interface ModuleDetailRegistration {
  detailId: string;
  label: { en: string; ar: string };
  component: string;
  entityType: string;
  sections: Array<{ id: string; label: { en: string; ar: string }; order: number }>;
}
