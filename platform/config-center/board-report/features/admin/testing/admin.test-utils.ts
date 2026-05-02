import type { AdminSectionContract, AdminConfigEntryContract, AdminDiagnosticsContract } from '../contracts/admin.contracts';
export function mockAdminSection(overrides?: Partial<AdminSectionContract>): AdminSectionContract {
  return { sectionId: 'adm-001', tenantId: 'tenant-001', code: 'security-settings', nameEn: 'Security Settings', nameAr: null,
    category: 'security', status: 'active', description: 'Security configuration and policy settings', routePath: '/admin/security',
    iconCode: 'shield', requiredAuthority: 'admin.security.manage', displayOrder: 1,
    lastAccessedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockAdminConfig(overrides?: Partial<AdminConfigEntryContract>): AdminConfigEntryContract {
  return { configKey: 'session.timeout.minutes', tenantId: 'tenant-001', section: 'security', valueType: 'number',
    currentValue: '30', defaultValue: '15', label: 'Session Timeout', description: 'Idle session timeout in minutes',
    isProtected: true, lastModifiedById: 'user-001', lastModifiedAt: new Date().toISOString(), ...overrides };
}
export function mockAdminDiagnostics(overrides?: Partial<AdminDiagnosticsContract>): AdminDiagnosticsContract {
  return { moduleCode: 'admin', healthy: true, totalSections: 12, disabledSections: 1, protectedConfigs: 8,
    checks: [{ name: 'admin-access', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
