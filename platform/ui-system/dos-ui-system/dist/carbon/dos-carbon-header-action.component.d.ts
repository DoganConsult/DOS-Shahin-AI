import { EventEmitter } from '@angular/core';
/**
 * Carbon UIShell `cds-header-action` wrapper. Renders a single header action
 * slot. Use this inside `<dos-carbon-header-shell>` or directly inside a
 * `cds-header-global` slot via `headerGlobal` projection.
 */
export declare class DosCarbonHeaderActionComponent {
    description: string;
    active: boolean;
    selected: EventEmitter<void>;
}
