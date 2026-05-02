/**
 * AppShell — universal page chrome.
 *
 * Resolves to MobileShell (≤480px) or DesktopShell (≥1025px) at the
 * consumer; this component renders the canonical CSS grid wrapper and
 * exposes `<ng-content>` projection slots `header`, `sidebar`, `main`,
 * and `bottomNav`. RTL-safe: uses logical inset/grid only.
 */
export declare class DosAppShellComponent {
    set mobile(value: boolean | null | undefined);
    private _mobile;
    readonly isMobile: import("@angular/core").Signal<boolean>;
}
