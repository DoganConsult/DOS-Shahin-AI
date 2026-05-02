import { EventEmitter } from '@angular/core';
export interface DosAccountMenuItem {
    id: string;
    label: string;
    icon?: string;
    destructive?: boolean;
}
export declare class DosAccountMenuComponent {
    userName: string;
    userEmail: string;
    items: DosAccountMenuItem[];
    action: EventEmitter<DosAccountMenuItem>;
}
