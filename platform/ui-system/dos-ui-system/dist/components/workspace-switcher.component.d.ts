import { EventEmitter } from '@angular/core';
/**
 * DosWorkspaceSwitcher — platform-tier UI primitive.
 *
 * Renders the active workspace + dropdown to switch when the user belongs
 * to multiple workspaces. Inputs only — no SessionService, no
 * StorageService, no BootstrapStore. The host product wraps this with
 * its own state (typically AccessStore + tenant-service /workspaces).
 *
 * Lifted from `platform/config-center/shared/layout/scope-filters/workspace-switcher.component.ts`
 * (which had GRC-specific TYPE_META, primeng/dropdown, and StorageService
 * embedded). The platform-tier version stays product-neutral; the type
 * meta map is supplied as input so each product can theme its workspace
 * categories without forking the component.
 *
 * A11y: dropdown closes on outside click, Escape, or selection. Active
 * descendant pattern; full keyboard nav (arrow up/down, Home/End, Enter).
 */
export interface DosWorkspaceEntry {
    id: string;
    name: string;
    /** Sub-label rendered next to name (e.g. tenant code). */
    subtitle?: string;
    /** Optional category key (looks up `typeMeta[category]` for icon/label/color). */
    category?: string;
    /** Optional explicit colour (overrides typeMeta). */
    color?: string;
    /** Optional explicit icon class (overrides typeMeta). */
    icon?: string;
    disabled?: boolean;
}
export interface DosWorkspaceTypeMeta {
    icon?: string;
    labelEn: string;
    labelAr?: string;
    color?: string;
}
export declare class DosWorkspaceSwitcherComponent {
    private readonly host;
    workspaces: ReadonlyArray<DosWorkspaceEntry>;
    activeId: string | null;
    typeMeta: Readonly<Record<string, DosWorkspaceTypeMeta>>;
    locale: string;
    ariaLabel: string;
    emptyLabel: string;
    placeholder: string;
    localize: ((en: string, ar?: string) => string) | null;
    select: EventEmitter<DosWorkspaceEntry>;
    readonly open: import("@angular/core").WritableSignal<boolean>;
    readonly focusIndex: import("@angular/core").WritableSignal<number>;
    readonly currentEntry: import("@angular/core").Signal<DosWorkspaceEntry>;
    readonly currentMeta: import("@angular/core").Signal<DosWorkspaceTypeMeta>;
    metaFor(ws: DosWorkspaceEntry): DosWorkspaceTypeMeta | null;
    metaLabel(meta: DosWorkspaceTypeMeta): string;
    toggle(): void;
    onSelect(ws: DosWorkspaceEntry): void;
    onTriggerKey(ev: KeyboardEvent): void;
    onDocKey(ev: KeyboardEvent): void;
    onDocClick(ev: MouseEvent): void;
}
