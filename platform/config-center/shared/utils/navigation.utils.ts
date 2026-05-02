import { hasPermission } from './rbac.utils';
import type { NavItem } from '../types/navigation.types';

export type { NavItem } from '../types/navigation.types';

export function getVisibleNavItems(
  role: string,
  allItems: NavItem[],
  checker?: (perm: string) => boolean
): NavItem[] {
  const check = checker || ((p: string) => hasPermission(role, p));
  return allItems.filter(item => check(item.requiredPermission));
}
