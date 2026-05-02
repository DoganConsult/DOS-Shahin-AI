import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed pagination control. Use with smart-grid surfaces.
 */
export declare class DosCarbonPaginationComponent {
    currentPage: number;
    pageLength: number;
    totalDataLength: number;
    pageInputDisabled: boolean;
    pagesUnknown: boolean;
    skeleton: boolean;
    size: 'sm' | 'md' | 'lg';
    pageOptions: number[];
    pageChange: EventEmitter<number>;
}
