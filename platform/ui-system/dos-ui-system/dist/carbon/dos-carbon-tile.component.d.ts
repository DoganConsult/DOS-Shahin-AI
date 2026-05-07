import { EventEmitter } from '@angular/core';
/**
 * Carbon Tile / ClickableTile wrapper.
 *
 * Composes the real Carbon Angular primitives (`cds-tile` /
 * `cds-clickable-tile`) so wrappers benefit from Carbon's built-in
 * keyboard/focus/hover semantics and theming. The previous hand-rolled
 * `<a class="cds--tile">` markup is removed — it skipped Carbon's
 * controller and emitted a flat anchor with no Carbon DOM.
 *
 * - `clickable=false` → `<cds-tile>`.
 * - `clickable=true`  → `<cds-clickable-tile>` with click navigation
 *   delegated to Angular Router (we deliberately do NOT bind
 *   `[route]` because Carbon's directive crashes when route is null).
 */
export declare class DosCarbonTileComponent {
    private readonly router;
    clickable: boolean;
    route: string | null;
    activated: EventEmitter<MouseEvent>;
    onActivate(ev: MouseEvent): void;
}
