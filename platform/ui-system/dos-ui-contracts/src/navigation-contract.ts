import type { ShellAction } from './shell-action.contract.js';
import type { ResponsiveContract } from './responsive-contract.js';

export interface NavigationItemContract {
  id: string;
  i18nKey: string;
  icon?: string;
  action: ShellAction;
  /** Module entitlement required for visibility. */
  moduleCode?: string;
  /** Permission codes required for visibility. Dot-style only. */
  permissions?: string[];
  children?: NavigationItemContract[];
}

export interface NavigationContract extends ResponsiveContract {
  /** Top-level nav items. */
  items: NavigationItemContract[];
}
