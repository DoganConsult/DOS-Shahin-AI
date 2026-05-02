import { EventEmitter } from '@angular/core';
/**
 * AI Assistant FAB. There MUST be only one FAB per shell. Consumers
 * must not render their own page-local fixed-position buttons.
 */
export declare class DosAiAssistantFabComponent {
    label: string;
    open: EventEmitter<void>;
}
