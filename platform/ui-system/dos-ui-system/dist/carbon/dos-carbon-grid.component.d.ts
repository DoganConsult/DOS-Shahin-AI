/**
 * Carbon Grid system primitives. The Carbon Grid is a 16-column
 * responsive layout with five breakpoints (sm/md/lg/xl/max). All
 * column widths and offsets are declared via the `columnNumbers` /
 * `offsets` Records, e.g. `{ sm: 4, md: 8, lg: 12 }`.
 *
 * Subgrid lets a column inherit its parent grid's tracks — useful for
 * nested layouts that should align to the same gutter rhythm.
 */
export declare class DosCarbonGridComponent {
    condensed: boolean;
    narrow: boolean;
    fullWidth: boolean;
}
export declare class DosCarbonRowComponent {
    condensed: boolean;
    narrow: boolean;
}
/**
 * Carbon `cdsCol` wrapper. Both `columnNumbers` and `offsets` accept
 * breakpoint records. Example:
 *   <dos-carbon-col [columnNumbers]="{ sm: 4, md: 8, lg: 12 }"
 *                   [offsets]="{ md: 0, lg: 2 }">
 */
export declare class DosCarbonColComponent {
    columnNumbers: Record<string, number>;
    offsets: Record<string, number>;
}
/**
 * Subgrid wrapper — a Carbon Grid that inherits column tracks from its
 * parent grid context. Carbon's class is `cds--subgrid`. Used for
 * nested layouts that should respect the outer gutter.
 */
export declare class DosCarbonSubgridComponent {
    wide: boolean;
    narrow: boolean;
    condensed: boolean;
}
