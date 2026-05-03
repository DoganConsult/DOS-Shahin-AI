import { EventEmitter } from '@angular/core';
/**
 * Carbon Tile / ClickableTile wrapper.
 *
 * NOTE: emits plain `cds--tile` markup so we sidestep
 * `cds-clickable-tile`'s internal `[routerLink]` binding which crashes when
 * `route` is null and triggers the recursive `template` ContentChildren
 * resolution loop observed at runtime. Carbon CSS (`@carbon/styles`) styles
 * `.cds--tile` and `.cds--tile--clickable` directly.
 *
 * - `clickable=false` renders `<div class="cds--tile">`.
 * - `clickable=true`  renders `<a class="cds--tile cds--tile--clickable">`.
 */
export declare class DosCarbonTileComponent {
    clickable: boolean;
    route: string | null;
    activated: EventEmitter<MouseEvent>;
    onActivate(ev: MouseEvent): void;
}
