/**
 * Carbon-backed skeleton placeholder. Three shapes:
 *   - 'text'      → cds-skeleton-text (one or many lines)
 *   - 'placeholder' → cds-skeleton-placeholder (rectangle)
 *   - 'icon'      → cds-skeleton-placeholder small square
 *
 * For DOS-native skeleton (with shimmer + tone tokens) use
 * `<dos-skeleton>` from `@dos/ui-system`. This component is the
 * Carbon-compliant variant for surfaces inside Carbon contexts.
 */
export declare class DosCarbonSkeletonComponent {
    shape: 'text' | 'placeholder';
    paragraph: boolean;
    lineCount: number;
    width: string;
    heading: boolean;
}
