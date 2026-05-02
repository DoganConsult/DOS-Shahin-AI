import { EventEmitter } from '@angular/core';
import type { DosNavItem } from '@dos/ui-contracts';
/**
 * DosNavItem — single workspace nav row.
 *
 * Pure presentational primitive. Renders a button (NOT an anchor) so the
 * host owns route-binding and active-state. Token-only styling. LTR/RTL
 * safe via padding-inline / margin-inline. Disabled rows expose
 * aria-disabled + a tooltip explaining why (driven by DosNavDisabledReason).
 *
 * Consumers: DosNavSection / DosWorkspaceNav.
 * Adapters MUST output `DosNavItem` shapes (see @dos/ui-contracts).
 */
export declare class DosNavItemComponent {
    item: DosNavItem;
    active: boolean;
    select: EventEmitter<DosNavItem>;
    onClick(): void;
    disabledTitle(): string;
}
