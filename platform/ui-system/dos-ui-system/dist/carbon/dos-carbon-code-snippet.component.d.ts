import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed code snippet. Three display modes:
 *   • inline    — short keyword
 *   • single    — single-line code with copy button
 *   • multi     — multi-line code with show-more / copy
 */
export declare class DosCarbonCodeSnippetComponent {
    code: string;
    display: 'single' | 'multi' | 'inline';
    theme: 'light' | 'dark';
    skeleton: boolean;
    hideCopyButton: boolean;
    feedback: string;
    feedbackTimeout: number;
    wrapText: boolean;
    copied: EventEmitter<string>;
}
