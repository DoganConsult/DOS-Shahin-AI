import { EventEmitter } from '@angular/core';
import type { DosNavGroup, DosNavItem } from '@dos/ui-contracts';
/**
 * DosNavSection — labelled group of nav items.
 *
 * Renders the group label (uppercase, muted) and a vertical list of
 * `<dos-nav-item>`. Re-emits child select events upward unchanged.
 *
 * Consumers: DosWorkspaceNav.
 */
export declare class DosNavSectionComponent {
    group: DosNavGroup;
    activeRoute: string | null;
    select: EventEmitter<DosNavItem>;
    isActive(item: DosNavItem): boolean;
}
