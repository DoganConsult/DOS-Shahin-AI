/**
 * Phase WS-2 — workspace.mobile-nav wrapper.
 * Selector: dos-mobile-bottom-nav
 * Carbon primitive: side-nav (mobile, ≤480px); replaces dos-workspace-sidebar.
 */
import { EventEmitter } from '@angular/core';
export interface DosBottomNavItem {
    id: string;
    label: string;
    icon?: string;
    route?: string;
    active?: boolean;
    badgeCount?: number;
}
export declare class DosMobileBottomNavComponent {
    items: DosBottomNavItem[];
    dir: 'ltr' | 'rtl';
    ariaLabel: string | null;
    select: EventEmitter<DosBottomNavItem>;
}
