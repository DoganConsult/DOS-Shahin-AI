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
    badgeCount?: number;
    active?: boolean;
}
export declare class DosMobileBottomNavComponent {
    items: DosBottomNavItem[];
    dir: 'ltr' | 'rtl';
    ariaLabel: string | null;
    maxItems: number;
    touchEnabled: boolean;
    touchTargetSize: number;
    iconSize: number;
    hapticFeedback: boolean;
    select: EventEmitter<DosBottomNavItem>;
    itemSwipe: EventEmitter<{
        itemId: string;
        direction: string;
    }>;
    handleSelect(item: DosBottomNavItem): void;
    private triggerHaptic;
}
