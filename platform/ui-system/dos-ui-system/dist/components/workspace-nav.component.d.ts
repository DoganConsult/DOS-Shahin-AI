import { EventEmitter } from '@angular/core';
import type { DosNavItem, DosNavGroup, DosShellNavConfig } from '@dos/ui-contracts';
/**
 * DosWorkspaceNav — top-level workspace navigation.
 *
 * Composes `<dos-nav-section>` rows from a `DosShellNavConfig` produced
 * by a product navigation adapter (e.g. Shahin's WorkspaceNavigationAdapter).
 * Sorts groups by `order` ascending; falls back to declaration order.
 * Re-emits child select events. Stateless: parent owns activeRoute.
 */
export declare class DosWorkspaceNavComponent {
    set config(value: DosShellNavConfig);
    activeRoute: string | null;
    select: EventEmitter<DosNavItem>;
    private readonly _config;
    readonly orderedGroups: import("@angular/core").Signal<readonly DosNavGroup[]>;
}
