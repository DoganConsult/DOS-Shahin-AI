export interface WidgetBuilderMeta {
  /** Whether users can add this widget from the builder palette. */
  selectable: boolean;

  /** Props the builder UI exposes for configuration. */
  configurableProps?: string[];

  /** Allowed grid sizes in `colsxrows` format. */
  allowedSizes?: Array<'3x1' | '3x2' | '4x2' | '6x2' | '6x3' | '12x3' | '12x4'>;

  /** Thumbnail image path for builder palette. */
  previewImage?: string;

  /** Grouping label within the builder palette. */
  group?: string;

  /** Sort order within the group. */
  sortOrder?: number;
}
