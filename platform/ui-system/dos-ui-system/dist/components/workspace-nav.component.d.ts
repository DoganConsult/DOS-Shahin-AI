import { EventEmitter } from '@angular/core';
import type { DosNavItem, DosNavGroup, DosShellNavConfig } from '@dos/ui-contracts';
/**
 * DosWorkspaceNav — top-level workspace navigation.
 * Refined to use Carbon SideNav policies.
 */
export declare class DosWorkspaceNavComponent {
    set config(value: DosShellNavConfig);
    activeRoute: string | null;
    select: EventEmitter<DosNavItem>;
    private readonly _config;
    readonly orderedGroups: import("@angular/core").Signal<readonly DosNavGroup[]>;
}
