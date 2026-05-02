import { EventEmitter } from '@angular/core';
export interface DosCarbonAccordionItem {
    title: string;
    content?: string;
    open?: boolean;
    disabled?: boolean;
}
/**
 * Carbon-backed accordion. Pass `[items]` for simple text content; for
 * rich content, project per-panel templates inside the component.
 */
export declare class DosCarbonAccordionComponent {
    items: DosCarbonAccordionItem[];
    size: 'sm' | 'md' | 'lg';
    align: 'start' | 'end';
    skeleton: boolean;
    opened: EventEmitter<number>;
}
