/**
 * A concrete widget placement on a dashboard.
 * Manifest is catalog-level; instance is dashboard-level.
 */
export interface DashboardWidgetInstance {
  instanceId: string;
  widgetId: string;
  title?: string;
  cols: number;
  rows: number;
  order: number;
  props?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  visible?: boolean;
}
