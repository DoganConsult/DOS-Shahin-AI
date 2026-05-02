/**
 * Render context injected into every widget instance.
 * Provides tenant, user, locale, and filtering state.
 */
export interface WidgetRenderContext {
  tenantId: string;
  userId: string;
  roleCode: string;
  lang: 'ar' | 'en';
  rtl: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  globalFilters: Record<string, unknown>;
  featureFlags: string[];
  activeModules: string[];
  sectorCode?: string;
  frameworkCodes?: string[];
}
