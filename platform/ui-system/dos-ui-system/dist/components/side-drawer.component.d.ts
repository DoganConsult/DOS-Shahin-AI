import { EventEmitter, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
/**
 * DosSideDrawer
 * -------------
 * Right- (or left-) edge sliding side panel. Filed as Wave H-2 to
 * unblock detail-drawer migrations that the original PrimeNG estate
 * shipped as <p-dialog position="right"> or <p-sidebar position="right">
 * or custom `.drawer { height:100vh; box-shadow:-4px 0 24px... }`.
 *
 * Distinct from:
 *   - DosDesktopDialog (centered modal)
 *   - DosBottomSheet   (mobile bottom edge)
 *   - DosMobileDrawer  (mobile bottom-sheet alias used by app shell)
 *
 * API
 *   open       — boolean, two-way friendly via [open] + (closed)
 *   title      — header label (aria-labelledby bound)
 *   position   — 'left' | 'right' (default 'right')
 *   width      — 'sm' | 'md' | 'lg' | 'xl' | css length string
 *                'md' (560px) is the safe default for detail panels
 *   dismissOn  — 'esc-and-overlay' | 'esc' | 'none'; default 'esc-and-overlay'
 *
 * Slots
 *   default          — body content (scrollable)
 *   [drawerFooter]   — sticky-bottom action row, auto-hidden when empty
 *
 * Accessibility
 *   - role="dialog" aria-modal="true"
 *   - title bound to aria-labelledby
 *   - focus moves to the panel container on open
 *   - ESC closes (when dismissOn permits)
 *   - body scroll-lock is intentionally NOT applied at primitive level;
 *     hosts apply it via their own service if needed.
 */
export declare class DosSideDrawerComponent implements AfterViewInit, OnChanges {
    open: boolean;
    title: string;
    position: 'left' | 'right';
    width: 'sm' | 'md' | 'lg' | 'xl' | string;
    dismissOn: 'esc-and-overlay' | 'esc' | 'none';
    closed: EventEmitter<void>;
    private panel?;
    readonly titleId: string;
    private static readonly WIDTH_MAP;
    resolvedWidth(): string;
    ngAfterViewInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    onEscape(): void;
    onOverlayClick(_event: MouseEvent): void;
    private maybeFocusPanel;
}
