export type WidgetActionType = 'drilldown' | 'export' | 'refresh' | 'configure' | 'remove';

export interface WidgetAction {
  type: WidgetActionType;
  widgetId: string;
  instanceId?: string;
  payload?: Record<string, unknown>;
}
