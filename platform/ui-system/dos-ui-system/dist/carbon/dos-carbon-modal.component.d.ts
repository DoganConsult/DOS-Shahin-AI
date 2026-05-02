import { EventEmitter } from '@angular/core';
export type DosCarbonModalSize = 'xs' | 'sm' | 'md' | 'lg';
export declare class DosCarbonModalComponent {
    open: boolean;
    title: string;
    subtitle: string | null;
    size: DosCarbonModalSize;
    hasScrollingContent: boolean;
    showFooter: boolean;
    closed: EventEmitter<void>;
}
