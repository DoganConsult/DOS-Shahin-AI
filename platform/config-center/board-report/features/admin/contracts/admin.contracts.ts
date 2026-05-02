export type AdminSectionStatus = 'active' | 'maintenance' | 'disabled';
export type AdminCategory = 'platform' | 'tenant' | 'security' | 'module' | 'integration' | 'diagnostics';

export interface AdminSectionContract {
  sectionId: string; tenantId: string; code: string; nameEn: string; nameAr: string | null;
  category: AdminCategory; status: AdminSectionStatus;
  description: string; routePath: string; iconCode: string | null;
  requiredAuthority: string | null; displayOrder: number;
  lastAccessedAt: string | null; createdAt: string; updatedAt: string;
}

export interface AdminConfigEntryContract {
  configKey: string; tenantId: string; section: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  currentValue: string; defaultValue: string;
  label: string; description: string | null;
  isProtected: boolean; lastModifiedById: string | null; lastModifiedAt: string | null;
}

export interface AdminDiagnosticsContract {
  moduleCode: string; healthy: boolean;
  totalSections: number; disabledSections: number; protectedConfigs: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface AdminDashboardContract {
  totalSections: number; byCategory: Record<string, number>; byStatus: Record<string, number>;
  recentActivity: Array<{ sectionCode: string; action: string; actorId: string; timestamp: string }>;
  systemHealth: { healthy: number; degraded: number; down: number };
}
