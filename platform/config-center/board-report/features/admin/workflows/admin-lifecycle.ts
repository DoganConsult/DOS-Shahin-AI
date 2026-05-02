import type { AdminSectionStatus } from '../contracts/admin.contracts';
export const ADMIN_SECTION_STATES: readonly AdminSectionStatus[] = ['active', 'maintenance', 'disabled'] as const;
export const ADMIN_SECTION_TRANSITIONS: Record<AdminSectionStatus, AdminSectionStatus[]> = {
  active: ['maintenance', 'disabled'], maintenance: ['active', 'disabled'], disabled: ['active'],
};
export function isValidAdminTransition(from: AdminSectionStatus, to: AdminSectionStatus): boolean { return ADMIN_SECTION_TRANSITIONS[from]?.includes(to) ?? false; }
