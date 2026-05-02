import type { VendorStatus } from '../contracts/vendor.contracts';

export const VENDOR_STATES: readonly VendorStatus[] = [
  'prospect', 'onboarding', 'active', 'under_review', 'suspended', 'offboarding', 'terminated', 'archived',
] as const;

export const VENDOR_TRANSITIONS: Record<VendorStatus, VendorStatus[]> = {
  prospect: ['onboarding', 'archived'],
  onboarding: ['active', 'prospect', 'archived'],
  active: ['under_review', 'suspended', 'offboarding'],
  under_review: ['active', 'suspended', 'offboarding'],
  suspended: ['active', 'offboarding', 'terminated'],
  offboarding: ['terminated'],
  terminated: ['archived'],
  archived: [],
};

export const VENDOR_TERMINAL_STATES: readonly VendorStatus[] = ['archived'];

export function isValidVendorTransition(from: VendorStatus, to: VendorStatus): boolean {
  return VENDOR_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isVendorTerminal(state: VendorStatus): boolean {
  return VENDOR_TERMINAL_STATES.includes(state);
}
