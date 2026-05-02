/**
 * DosSkeleton — animated bone loader matching DOS surface tokens.
 *
 * Use whenever a section is waiting on data and you want to preserve
 * layout (so cards don't pop in). Renders one or more rows. Automatic
 * shimmer animation; respects `prefers-reduced-motion`.
 *
 * Inputs:
 *   shape   — 'line' (default) | 'circle' | 'square' | 'tile'
 *   rows    — number of lines (line shape only). default 3
 *   width   — CSS length, optional
 *   height  — CSS length, optional
 *   inline  — render inline-block (for inline metric placeholders)
 */
export declare class DosSkeletonComponent {
    shape: 'line' | 'circle' | 'square' | 'tile';
    rows: number;
    width?: string;
    height?: string;
    inline: boolean;
    ariaLabel: string;
    get rowsArr(): number[];
    lineWidth(i: number): string;
}
