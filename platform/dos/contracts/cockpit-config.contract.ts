import { InjectionToken } from '@angular/core';

export interface CockpitRoleSectionConfig {
  executiveSnapshot: boolean;
  actionCenter: boolean;
  programHealth: boolean;
  analytics: boolean;
  activity: boolean;
  nextSteps: boolean;
  widgetPriority: string[];
}

export interface CockpitKpiModuleMapping {
  kpiId: string;
  requiredModule: string;
}

export interface IgniteModuleMeta {
  labelEn: string;
  labelAr: string;
  icon: string;
  route: string;
}

export interface CockpitConfigContract {
  getRoleSections(): Record<string, CockpitRoleSectionConfig>;
  getRoleAliases(): Record<string, string>;
  getKpiModuleMap(): CockpitKpiModuleMapping[];
  getDefaultRoleSection(): CockpitRoleSectionConfig;
  getIgniteModuleOrder(): string[];
  getIgniteModuleMeta(): Record<string, IgniteModuleMeta>;
}

export const COCKPIT_CONFIG = new InjectionToken<CockpitConfigContract>('COCKPIT_CONFIG');
