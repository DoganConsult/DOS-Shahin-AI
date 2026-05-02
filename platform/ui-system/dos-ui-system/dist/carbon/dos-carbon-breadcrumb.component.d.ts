import { EventEmitter } from '@angular/core';
export interface DosCarbonBreadcrumbItem {
    label: string;
    href?: string;
    current?: boolean;
}
/**
 * Carbon-backed breadcrumb trail.
 */
export declare class DosCarbonBreadcrumbComponent {
    items: DosCarbonBreadcrumbItem[];
    noTrailingSlash: boolean;
    skeleton: boolean;
    itemClick: EventEmitter<DosCarbonBreadcrumbItem>;
}
