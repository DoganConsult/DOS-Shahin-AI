/**
 * Model for advanced dynamic drill-through UI.
 * Supports multi-level drill with breadcrumbs and payload-driven content.
 */

export interface DrillThroughContext {
  /** Unique level id for this step in the stack */
  levelId: string;
  /** Widget or segment identifier (e.g. workflow.sla_by_role) */
  widgetId: string;
  /** Display title for this level (e.g. "SLA by Role", "Compliance Manager") */
  title: string;
  /** Optional title in Arabic */
  titleAr?: string;
  /** Payload for this level (filters, segment, entity id, etc.) */
  payload?: Record<string, unknown>;
  /** Route to open when "View full page" is used (with query params from payload) */
  route?: string;
  /** View type for in-panel content: 'summary' | 'list' | 'detail' | 'route_only' */
  viewType?: 'summary' | 'list' | 'detail' | 'route_only';
}

export interface DrillTargetDef {
  widgetId: string;
  /** Resolve title from payload (e.g. payload.role) */
  titleKey?: string;
  titleEn: string;
  titleAr?: string;
  /** Base route for "View full page" (e.g. /process-tasks) */
  route?: string;
  /** Build query params from payload (e.g. { role: x } => assigneeRole=x) */
  routeParamsFromPayload?: (p: any) => Record<string, string>;
  viewType?: DrillThroughContext['viewType'];
}
