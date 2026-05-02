import { EventEmitter, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
/**
 * DosDesktopDialog
 * ----------------
 * Canonical desktop modal — overlay + focus trap + ESC-to-close + sized
 * container. Filed by Roadmap Wave H to unblock the FoundationOrgDialog /
 * FoundationUsersDialogs migrations (P1 #1 / #2). Intentionally minimal:
 * the surface is a content-projecting shell, not a form library. Form
 * fields stay domain-owned; this primitive supplies the chrome.
 *
 * Companion primitive: DosBottomSheet covers the mobile equivalent.
 * Domain pages compose both behind a responsive choice (see the
 * FoundationOrgDialog migration for the canonical pattern).
 *
 * Inputs
 *   open       — boolean, two-way friendly via [open] + (closed)
 *   title      — header label; rendered inside the dialog header
 *   width      — 'sm' | 'md' | 'lg' | 'xl' | string CSS length;
 *                'md' (560px) is the safe default for forms
 *   dismissOn  — 'esc-and-overlay' | 'esc' | 'none'; default 'esc-and-overlay'
 *
 * Outputs
 *   closed     — emitted on header X / ESC / overlay click (subject to dismissOn)
 *
 * Slots
 *   default    — body content
 *   [dialogFooter] — trailing button row; rendered inside a tokenised footer
 *
 * Accessibility
 *   - role="dialog" aria-modal="true"
 *   - title bound to aria-labelledby
 *   - focus moves to the dialog container on open
 *   - ESC closes (when dismissOn permits)
 *   - background scroll is intentionally NOT locked at this primitive level;
 *     hosts that need scroll-lock can apply it via their own service.
 */
export declare class DosDesktopDialogComponent implements AfterViewInit, OnChanges {
    open: boolean;
    title: string;
    width: 'sm' | 'md' | 'lg' | 'xl' | string;
    dismissOn: 'esc-and-overlay' | 'esc' | 'none';
    closed: EventEmitter<void>;
    private container?;
    readonly titleId: string;
    private static readonly WIDTH_MAP;
    resolvedWidth(): string;
    ngAfterViewInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    onEscape(): void;
    onOverlayClick(_event: MouseEvent): void;
    private maybeFocusContainer;
}
