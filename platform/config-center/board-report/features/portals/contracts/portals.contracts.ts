export type PortalStatus = 'draft' | 'published' | 'suspended' | 'archived';
export type PortalType = 'vendor' | 'stakeholder' | 'regulator' | 'employee' | 'custom';

export interface PortalContract {
  portalId: string; tenantId: string; code: string; nameEn: string; nameAr: string | null;
  portalType: PortalType; status: PortalStatus; description: string;
  accessUrl: string | null; ownerId: string;
  allowedModules: string[]; registeredUsers: number;
  publishedAt: string | null; createdAt: string; updatedAt: string;
}

export interface PortalAccessContract {
  accessId: string; portalId: string; userId: string; role: 'viewer' | 'contributor' | 'admin';
  grantedAt: string; expiresAt: string | null; isActive: boolean;
}

export interface PortalsDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalPortals: number; publishedCount: number;
  suspendedCount: number; noOwnerCount: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface PortalsDashboardContract {
  totalPortals: number; byType: Record<string, number>; byStatus: Record<string, number>;
  totalRegisteredUsers: number; activePortals: number; suspendedCount: number;
}
