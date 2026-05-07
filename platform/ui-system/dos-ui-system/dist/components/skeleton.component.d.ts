/**
 * DosSkeleton — loading placeholder.
 * Refined to use Carbon Skeleton policies.
 */
export declare class DosSkeletonComponent {
    shape: 'line' | 'circle' | 'square' | 'tile';
    rows: number;
    width?: string;
    height?: string;
    inline: boolean;
    ariaLabel: string;
    mapShape(s: string): 'text' | 'placeholder';
}
