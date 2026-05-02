import { EventEmitter } from '@angular/core';
export interface DosCarbonHeaderAction {
    id: string;
    label: string;
    icon?: string | null;
    permission?: string | null;
}
/**
 * Carbon UI-Shell wrapper. Renders a `cds-header` with brand, side-nav
 * trigger, and a slot for global actions. Permission-gated rendering
 * for individual actions is delegated to *dosCanRender on the consumer.
 */
export declare class DosCarbonHeaderShellComponent {
    brand: string;
    brandShort: string;
    ariaLabel: string;
    showHamburger: boolean;
    showHeaderNav: boolean;
    sideNavOpen: boolean;
    sideNavToggled: EventEmitter<boolean>;
}
