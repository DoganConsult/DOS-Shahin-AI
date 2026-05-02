import { EventEmitter } from '@angular/core';
export interface DosCarbonTabItem {
    id: string;
    label: string;
    disabled?: boolean;
}
export declare class DosCarbonTabsComponent {
    items: DosCarbonTabItem[];
    selectedId: string;
    selectedIdChange: EventEmitter<string>;
    onSelected(idx: number): void;
}
