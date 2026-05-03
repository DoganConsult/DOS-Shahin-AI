/**
 * AppShell — universal page chrome.
 *
 * Resolves to MobileShell (≤480px) or DesktopShell (≥1025px) at the
 * consumer; this component renders the canonical CSS grid wrapper and
 * exposes `<ng-content>` projection slots `shellHeader`, `shellSidebar`,
 * default = `main`, and `shellBottomNav`. RTL-safe — uses logical inset/grid.
 *
 * Desktop layout:
 *   ┌────────────────── header ──────────────────┐
 *   │ sidebar │           main                   │
 *   └─────────┴──────────────────────────────────┘
 * Mobile layout:
 *   ┌────────── header ──────────┐
 *   │           main             │
 *   ├──────── bottomNav ─────────┤
 */
export declare class DosAppShellComponent {
    set mobile(value: boolean | null | undefined);
    private _mobile;
    readonly isMobile: import("@angular/core").Signal<boolean>;
}
