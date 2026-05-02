import type { DosShellNavConfig, ShellAccountMenuEntry } from '@dos/ui-contracts';
export declare class WorkspaceNavigationAdapter {
    private readonly access;
    private readonly readiness;
    private readonly l1;
    private readonly l2;
    private readonly l3;
    private readonly l4;
    private readonly l5;
    private readonly l6;
    private readonly _config;
    readonly navConfig: import("@angular/core").Signal<DosShellNavConfig>;
    private readonly _account;
    readonly accountMenuConfig: import("@angular/core").Signal<readonly ShellAccountMenuEntry[]>;
    /** Resolve and publish nav config. Idempotent; safe to call from multiple consumers. */
    refresh(): Promise<void>;
    private titleCase;
}
