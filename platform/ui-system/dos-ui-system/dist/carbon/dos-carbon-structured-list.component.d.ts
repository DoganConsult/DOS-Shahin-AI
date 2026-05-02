export interface DosCarbonStructuredListRow {
    key: string;
    label: string;
    value?: string | null;
    chips?: string[];
}
/**
 * Carbon StructuredList wrapper used for label/value detail panes.
 * Pass either pre-built `rows` for simple key/value rendering, or use the
 * `customRow` slot for fully custom row content.
 */
export declare class DosCarbonStructuredListComponent {
    rows: DosCarbonStructuredListRow[];
}
