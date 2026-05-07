import { EventEmitter } from '@angular/core';
import { DosCarbonTabItem } from '../carbon/dos-carbon-tabs.component';
/**
 * DosTabs — tabbed navigation.
 * Refined to use Carbon Tabs policies.
 */
export declare class DosTabsComponent {
    items: DosCarbonTabItem[];
    selectedId: string;
    selectedIdChange: EventEmitter<string>;
    select(id: string): void;
}
