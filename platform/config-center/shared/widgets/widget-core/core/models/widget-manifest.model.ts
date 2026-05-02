import { Type } from '@angular/core';

export type WidgetCategory =
  | 'executive'
  | 'governance'
  | 'risk'
  | 'compliance'
  | 'audit'
  | 'evidence'
  | 'incidents'
  | 'vendors'
  | 'bcp'
  | 'assets'
  | 'workflow'
  | 'reporting'
  | 'platform'
  | 'ai';

export type WidgetEngine = 'angular' | 'echarts' | 'd3' | 'plotly' | 'chartjs';

export interface WidgetManifest {
  /** Canonical ID in `category.name` format (e.g. `risk.heatmap`) */
  id: string;

  /** Backend key — snake_case identifier sent from dashboard_layouts / widget_registry tables */
  key: string;

  /** Display title (English) */
  title: string;

  /** Arabic display title */
  titleAr?: string;

  category: WidgetCategory;
  engine: WidgetEngine;

  /**
   * Either a direct component reference or a lazy-import factory.
   * Lazy form: `() => import('./path').then(m => m.Component)`
   */
  component: Type<any> | (() => Promise<Type<any>>);

  description?: string;
  icon?: string;
  nameEn?: string;
  nameAr?: string;
  tags?: string[];

  defaultSize: {
    cols: number;
    rows: number;
    minCols?: number;
    minRows?: number;
    maxCols?: number;
    maxRows?: number;
  };

  /** Roles allowed to see this widget. Empty/undefined = all roles. */
  roles?: string[];

  /** Fine-grained permissions required (e.g. `risk.read`). */
  permissions?: string[];

  /** Feature flag that must be active for this widget to render. */
  featureFlag?: string;

  /** Subscription plan codes that include this widget. */
  planCodes?: string[];

  /** Module codes that must be active (e.g. `risk`, `evidence`). */
  moduleCodes?: string[];

  /** Sector codes this widget applies to. Empty = all sectors. */
  sectors?: string[];

  /** Framework codes this widget applies to. Empty = all frameworks. */
  frameworks?: string[];

  supportsExport?: boolean;
  supportsDrilldown?: boolean;
  supportsRealtime?: boolean;
  cacheTtlSeconds?: number;

  /** Service key for data fetching (resolved by widget-data pipeline). */
  dataSource?: string;

  /** Adapter key for data transformation. */
  dataAdapter?: string;

  /** JSON Schema-like descriptor for widget-specific config props. */
  propsSchema?: Record<string, unknown>;

  /** JSON Schema-like descriptor for supported filter dimensions. */
  filterSchema?: Record<string, unknown>;

  /** Dashboard builder metadata for no-code composition. */
  builder?: import('./widget-builder.model').WidgetBuilderMeta;

  schemaVersion: number;
}
