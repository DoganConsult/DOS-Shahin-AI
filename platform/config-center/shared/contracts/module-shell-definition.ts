export type WorkspacePattern = 'command-center' | 'registry' | 'case-workspace' | 'studio';

export interface ModuleKpiDefinition {
  id: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  color: string;
  bg: string;
  route: string;
  urgency?: boolean;
  workflow?: boolean;
  health?: boolean;
}

export interface ModuleTabDefinition {
  id: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  route: string;
  default?: boolean;
}

export interface LifecycleStepDefinition {
  from: string;
  to: string;
  requiredPermission?: string;
  requiresApproval?: boolean;
  slaHours?: number;
}

export interface ModuleFilterDefinition {
  id: string;
  labelEn: string;
  labelAr: string;
  type: 'select' | 'multiselect' | 'date-range' | 'search' | 'toggle';
  options?: Array<{ value: string; labelEn: string; labelAr: string }>;
}

export interface ModuleTableViewDefinition {
  id: string;
  labelEn: string;
  labelAr: string;
  columns: Array<{ field: string; headerEn: string; headerAr: string; sortable?: boolean; width?: string }>;
  default?: boolean;
}

export interface ModuleFormFieldDefinition {
  id: string;
  labelEn: string;
  labelAr: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'number' | 'toggle' | 'rich-text';
  required?: boolean;
  options?: Array<{ value: string; labelEn: string; labelAr: string }>;
  span?: 1 | 2;
  placeholder?: string;
  placeholderAr?: string;
}

export interface ModuleReportDefinition {
  id: string;
  labelEn: string;
  labelAr: string;
  icon: string;
  type: 'chart' | 'table' | 'kpi-summary' | 'trend' | 'heatmap';
}

export interface ModuleShellDefinition {
  moduleCode: string;
  moduleName: { en: string; ar: string };
  moduleIcon: string;
  moduleAccentToken: string;
  purposeLine: { en: string; ar: string };
  primaryAiAction: {
    id: string;
    label: { en: string; ar: string };
    icon: string;
  };
  kpiDefinitions: ModuleKpiDefinition[];
  defaultWorkspacePattern: WorkspacePattern;
  allowedWorkspacePatterns: WorkspacePattern[];
  defaultRecordTabs: ModuleTabDefinition[];
  lifecycleDefinition: LifecycleStepDefinition[];
  relatedObjectTypes: string[];
  aiCapabilities: string[];
  filters: ModuleFilterDefinition[];
  tableViews: ModuleTableViewDefinition[];
  emptyStatePreset: string;
  tier: 'full' | 'domain' | 'platform';
  automationLevel: 'full' | 'semi' | 'manual' | null;
  slaDefaultHours: number | null;
  createFormFields?: ModuleFormFieldDefinition[];
  reportDefinitions?: ModuleReportDefinition[];
  agents: Array<{
    id: string;
    name: string;
    nameAr?: string;
    icon: string;
    color: string;
    domain: string;
    domainAr?: string;
    autonomyLevel?: 'hybrid' | 'shadow_agent' | 'full';
  }>;
}
