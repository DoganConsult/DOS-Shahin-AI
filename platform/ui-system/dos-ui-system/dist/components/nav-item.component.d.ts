import { EventEmitter } from '@angular/core';
import type { DosNavItem } from '@dos/ui-contracts';
/**
 * DosNavItem — single workspace nav row.
 * Refined to use Carbon SideNav item policies.
 */
export declare class DosNavItemComponent {
    item: DosNavItem;
    active: boolean;
    select: EventEmitter<DosNavItem>;
    onClick(): void;
    disabledTitle(): string;
}
