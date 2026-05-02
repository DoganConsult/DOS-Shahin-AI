export type ArchetypeCode = 'standard' | 'regulated' | 'government' | string;

export type DenialCategory =
  | 'permission'
  | 'module'
  | 'tier'
  | 'feature'
  | 'onboarding'
  | 'workflow'
  | 'other';

export interface DenialReason {
  category: DenialCategory;
  code: string;
  messageEn: string;
  messageAr: string;
}

export interface PageAccessResult {
  allowed: boolean;
  reasons: DenialReason[];
  requiredPermissions: string[];
  missingPermissions: string[];
}

export interface UiRenderContext {
  tenantId: string;
  userId: string;
  roleCode: string;
  lang: 'ar' | 'en' | string;
  rtl: boolean;
  permissions: Set<string>;
  functionalRoles: string[];
  accessProfiles: string[];
  activeModules: string[];
  featureFlags: string[];
  tier: string;
  operationMode: string;
  sectorCode?: string;
  frameworkCodes?: string[];
  orgSize?: string;
  enforcementMode?: string;
  globalFilters: Record<string, unknown>;
}

export interface EffectiveNavItem {
  navKey: string;
  parentNavKey: string | null;
  labelEn: string;
  labelAr: string;
  route: string | null;
  icon: string | null;
  moduleCode: string | null;
  sortOrder: number;
  visible: boolean;
  disabled: boolean;
  denialReasons: DenialReason[];
  children: EffectiveNavItem[];
}

export interface EffectiveModuleView {
  moduleCode: string;
  visible: boolean;
  reason?: string;
}

export type AiMode = 'hidden' | 'blocked' | 'observe' | 'assist' | 'autonomous' | string;

export interface AiModuleCapability {
  moduleCode: string;
  mode: AiMode;
}

export interface EffectiveActionState {
  actionCode: string;
  visible: boolean;
  enabled: boolean;
  mode: 'normal' | 'ai-recommend-only' | string;
  reason?: string;
}

export interface EffectivePageView {
  pageCode: string;
  route: string;
  allowed: boolean;
  disabledReason?: string;
}

export interface EffectiveUiState {
  navigation: EffectiveNavItem[];
  modules: EffectiveModuleView[];
  pages: EffectivePageView[];
  actions: Record<string, EffectiveActionState>;
  featureFlags: Set<string>;
  aiCapabilities: AiModuleCapability[];
  landingPage: string;
  archetypeCode: ArchetypeCode;
}

