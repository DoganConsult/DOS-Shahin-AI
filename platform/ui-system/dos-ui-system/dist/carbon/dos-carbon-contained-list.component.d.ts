import { EventEmitter } from '@angular/core';
export interface DosCarbonContainedListItem {
    id?: string;
    content: string;
    disabled?: boolean;
}
/**
 * Carbon-backed contained list. Three kinds (on-page / disclosed / pageable).
 */
export declare class DosCarbonContainedListComponent {
    label: string;
    items: DosCarbonContainedListItem[];
    kind: 'on-page' | 'disclosed';
    size: 'sm' | 'md' | 'lg' | 'xl';
    action: 'expand' | 'select' | null;
    isInset: boolean;
    itemClick: EventEmitter<DosCarbonContainedListItem>;
}
