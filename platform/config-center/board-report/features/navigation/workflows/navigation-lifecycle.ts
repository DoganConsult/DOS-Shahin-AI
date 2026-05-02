import type { NavItemStatus } from '../contracts/navigation.contracts';

export const NAV_ITEM_STATES: readonly NavItemStatus[] = [
  'active', 'hidden', 'disabled', 'deprecated',
] as const;

export const NAV_ITEM_TRANSITIONS: Record<NavItemStatus, NavItemStatus[]> = {
  active: ['hidden', 'disabled', 'deprecated'],
  hidden: ['active', 'disabled', 'deprecated'],
  disabled: ['active', 'hidden', 'deprecated'],
  deprecated: ['hidden'],
};

export function isValidNavTransition(from: NavItemStatus, to: NavItemStatus): boolean {
  return NAV_ITEM_TRANSITIONS[from]?.includes(to) ?? false;
}
