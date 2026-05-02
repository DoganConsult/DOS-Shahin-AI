import { EventEmitter } from '@angular/core';
export declare class DosChallengeCardComponent {
    category: string;
    title: string;
    description: string;
    acceptLabel: string;
    dismissLabel: string;
    accept: EventEmitter<void>;
    dismiss: EventEmitter<void>;
}
