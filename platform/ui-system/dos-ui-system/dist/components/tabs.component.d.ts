import { EventEmitter } from '@angular/core';
export interface DosTabItem {
    id: string;
    label: string;
}
export declare class DosTabsComponent {
    items: DosTabItem[];
    selectedId: string;
    selectedIdChange: EventEmitter<string>;
    select(t: DosTabItem): void;
}
