import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed file uploader (single + multi). Accepts a list of
 * already-uploaded files via [files] and emits added/removed events.
 */
export declare class DosCarbonFileUploaderComponent {
    title: string;
    description: string;
    buttonText: string;
    accept: string[];
    multiple: boolean;
    files: Set<File>;
    size: 'sm' | 'md' | 'lg';
    theme: 'light' | 'dark';
    disabled: boolean;
    skeleton: boolean;
    filesChange: EventEmitter<Set<File>>;
}
