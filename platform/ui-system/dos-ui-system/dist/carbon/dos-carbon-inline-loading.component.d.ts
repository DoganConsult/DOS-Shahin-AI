import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed inline loading. Used for save/submit buttons and
 * form-level progress (active → finished/error transitions).
 */
export declare class DosCarbonInlineLoadingComponent {
    state: 'inactive' | 'active' | 'finished' | 'error';
    loadingText: string;
    successText: string;
    errorText: string;
    finished: EventEmitter<void>;
}
