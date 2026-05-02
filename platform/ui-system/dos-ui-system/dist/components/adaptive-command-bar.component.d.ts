import { EventEmitter } from '@angular/core';
import type { ActionContract } from '@dos/ui-contracts';
export declare class DosAdaptiveCommandBarComponent {
    private _actions;
    private _mobile;
    overflowOpen: import("@angular/core").WritableSignal<boolean>;
    set actions(v: ActionContract[] | null | undefined);
    set mobile(v: boolean | null | undefined);
    invoke: EventEmitter<ActionContract>;
    primaryActions(): ActionContract[];
    overflowActions(): ActionContract[];
    toggleOverflow(): void;
}
