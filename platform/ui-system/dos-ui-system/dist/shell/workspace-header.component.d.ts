/**
 * Phase WS-2 + Carbon-Wiring — workspace.header wrapper.
 * Selector: dos-workspace-header
 * Carbon primitive: ui-shell (UIShellModule → cds-header + cds-hamburger + cds-header-global)
 * Runtime: componentKey=workspace.header (carbon=ui-shell) — DB schema reference removed (resolved by UI-OS service).
 *
 * Token stack:
 *   --cds-*           (Carbon role tokens — @carbon/styles)
 *   --shell-*         (structural aliases — carbon-shell-tokens.scss)
 *   --brand-accent    (product accent token — design-tokens.css)
 *   breathing-glow    (premium animation — design-tokens.css)
 */
import { EventEmitter } from '@angular/core';
import type { WorkspaceHeaderContext, WorkspaceHeaderAction } from './workspace-shell.contracts';
export declare class DosWorkspaceHeaderComponent {
    /** Full WorkspaceHeaderContext — optional; individual @Inputs also accepted */
    set context(v: WorkspaceHeaderContext | null | undefined);
    /** Primary chrome brand line (resolver / tenant / i18n); empty when unknown — no product literals. */
    title: string;
    tenantName: string;
    logoUri: string | null;
    logoHref: string;
    userDisplayName: string;
    userAvatarUri: string | null;
    ariaLabel: string | null;
    sideNavOpen: boolean;
    showCommandSearch: boolean;
    showInbox: boolean;
    inboxCount: number;
    commandSearchLabel: string;
    inboxLabel: string;
    trailingActions: WorkspaceHeaderAction[];
    sideNavToggled: EventEmitter<boolean>;
    commandSearchOpen: EventEmitter<void>;
    inboxOpen: EventEmitter<void>;
    avatarClick: EventEmitter<void>;
    actionClick: EventEmitter<WorkspaceHeaderAction>;
    get resolvedBrand(): string;
    /** Carbon `cds-header` [brand] slot — short label only; empty hides fake acronyms. */
    get resolvedBrandShort(): string;
    get initials(): string;
}
