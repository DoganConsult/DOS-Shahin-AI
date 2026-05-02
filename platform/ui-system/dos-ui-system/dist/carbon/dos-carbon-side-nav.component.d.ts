import { EventEmitter } from '@angular/core';
export interface DosCarbonSideNavItem {
    id: string;
    label: string;
    icon?: string | null;
    route?: string | null;
    /** Permission key — when present, host must wrap with *dosCanRender. */
    permission?: string | null;
    children?: DosCarbonSideNavItem[];
}
/**
 * Carbon UI-Shell SideNav wrapper. Permission-gating per item is the host's
 * responsibility (use *dosCanRender on the consuming `<dos-carbon-side-nav>`
 * usage when filtering nav from AccessStore).
 */
export declare class DosCarbonSideNavComponent {
    items: DosCarbonSideNavItem[];
    expanded: boolean;
    ariaLabel: string;
    itemSelected: EventEmitter<DosCarbonSideNavItem>;
}
/**
 * Sidenav menu group wrapper — exposes `cds-sidenav-menu` for content
 * projection scenarios (e.g. routed nav items with routerLink/Active).
 */
export declare class DosCarbonSideNavMenuComponent {
    title: string;
    expanded: boolean;
}
/**
 * Sidenav item wrapper. For Angular Router integration, the consumer
 * applies `routerLink` / `routerLinkActive` on this host element
 * (Angular's RouterLink directive selector matches it transparently).
 */
export declare class DosCarbonSideNavItemComponent {
    selected: EventEmitter<void>;
}
