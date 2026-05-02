import { EventEmitter } from '@angular/core';
/**
 * Carbon Tile / ClickableTile wrapper.
 * - `clickable=false` renders `cds-tile`.
 * - `clickable=true` renders `cds-clickable-tile` with optional `route`.
 */
export declare class DosCarbonTileComponent {
    clickable: boolean;
    route: string | null;
    activated: EventEmitter<MouseEvent>;
}
