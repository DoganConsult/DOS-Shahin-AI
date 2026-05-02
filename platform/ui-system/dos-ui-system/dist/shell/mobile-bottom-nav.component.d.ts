import { EventEmitter } from '@angular/core';
export interface DosBottomNavItem {
    id: string;
    label: string;
    icon?: string;
    route?: string;
    active?: boolean;
}
export declare class DosMobileBottomNavComponent {
    items: DosBottomNavItem[];
    select: EventEmitter<DosBottomNavItem>;
}
