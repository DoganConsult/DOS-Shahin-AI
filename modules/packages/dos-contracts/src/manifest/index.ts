import type { ModuleManifest, ModulePermission, ModuleRole, ModuleAction, ApprovalRule, OwnershipRule, SoDRule } from '@dos/types';

export interface ProductManifest {
  productCode: string;
  displayName: string;
  status: 'active' | 'draft' | 'deprecated';
  ownerTeam: string;
  platformDependencies: string[];
  enabledByDefault: boolean;
  moduleCodes: string[];
  seedProviders: string[];
  tenantDefaults: string[];
  requiredReferenceData: string[];
  version: string;
}

export interface ModuleRegistrationContract {
  manifest: ModuleManifest;
  healthCheck?: () => Promise<{ healthy: boolean; details?: Record<string, unknown> }>;
  onEnable?: (tenantId: string) => Promise<void>;
  onDisable?: (tenantId: string) => Promise<void>;
  onUpgrade?: (tenantId: string, fromVersion: string, toVersion: string) => Promise<void>;
}

export type { ModuleManifest, ModulePermission, ModuleRole, ModuleAction, ApprovalRule, OwnershipRule, SoDRule };
