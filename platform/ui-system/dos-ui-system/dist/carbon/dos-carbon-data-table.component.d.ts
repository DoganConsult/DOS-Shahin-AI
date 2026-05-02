import { EventEmitter } from '@angular/core';
export interface DosCarbonTableColumn {
    key: string;
    header: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
}
export type DosCarbonTableSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
/**
 * Carbon-backed data table wrapper. Use grid wrappers from
 * @dos/ui-system over this for app-level grids — this component is the
 * single primitive that owns Carbon's `cdsTable` markup and styles.
 */
export declare class DosCarbonDataTableComponent {
    columns: DosCarbonTableColumn[];
    rows: Array<Record<string, unknown>>;
    size: DosCarbonTableSize;
    striped: boolean;
    stickyHeader: boolean;
    emptyText: string;
    rowClick: EventEmitter<Record<string, unknown>>;
}
