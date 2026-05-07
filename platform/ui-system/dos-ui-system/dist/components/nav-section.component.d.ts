import { EventEmitter } from '@angular/core';
import type { DosNavGroup, DosNavItem } from '@dos/ui-contracts';
/**
 * DosNavSection — labelled group of nav items.
 * Refined to use Carbon SideNav menu policies.
 */
export declare class DosNavSectionComponent {
    group: DosNavGroup;
    activeRoute: string | null;
    select: EventEmitter<DosNavItem>;
    isGroupActive(): boolean;
    isActive(item: DosNavItem): boolean;
    private hasActiveChild;
}
