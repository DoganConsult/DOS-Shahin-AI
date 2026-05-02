/**
 * Canonical module codes — must match backend canonical-modules.ts (25 codes).
 * UI-only refs (maturity, knowledge, workspace, dashboard, home, settings, profile) are NOT included.
 */
export type CanonicalModuleCode =
  | 'risk' | 'compliance' | 'policy' | 'evidence' | 'audit'
  | 'incident' | 'exception' | 'governance' | 'vendor' | 'bcp'
  | 'asset' | 'remediation' | 'action' | 'training' | 'qiyas'
  | 'ai-governance' | 'foundation' | 'reporting' | 'ai' | 'integrations'
  | 'admin' | 'workflow' | 'notification' | 'analytics' | 'team'
  | 'controls' | 'inbox' | 'dora' | 'issues' | 'journey'
  | 'portals' | 'privacy' | 'records'
  | 'local-knowledge' | 'config-center';

export type ProductOwner = 'platform' | 'shahin';

export interface NavItem {
  id: string;
  navKey?: string;
  labelEn: string;
  labelAr: string;
  route?: string;
  icon?: string;
  module?: CanonicalModuleCode;
  productOwner?: ProductOwner;
  children?: NavItem[];
  hidden?: boolean;
  exact?: boolean;
}

export interface QuickActionItem {
  id: string;
  labelEn: string;
  labelAr: string;
  route: string;
  icon?: string;
  module?: CanonicalModuleCode;
}

export interface NavigationViewModel {
  primary: NavItem[];
  secondary: NavItem[];
  quickActions: QuickActionItem[];
}
