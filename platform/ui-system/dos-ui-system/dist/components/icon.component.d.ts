export declare class DosIconComponent {
    /** Icon name. Unknown names fall back to a single dot. */
    name: string;
    /** Pixel size; default 18. Use 16 for inline, 20 for nav, 24 for hero. */
    size: number | string;
    /** Stroke width override; default per icon (mostly 2). */
    stroke: number | string | null;
    /** Sets aria-label + role=img. Omit (default) for purely decorative icons. */
    ariaLabel: string | null;
    readonly resolvedContent: import("@angular/core").Signal<string>;
    readonly resolvedStrokeWidth: import("@angular/core").Signal<string | number>;
}
