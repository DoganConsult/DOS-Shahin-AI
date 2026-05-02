import { WidgetDataEnvelope } from '@dos/types';
export declare function invalidateCache(tenantId: string): void;
export declare function queryWidgetData(tenantId: string, widgetId: string, filters?: Record<string, unknown>): Promise<WidgetDataEnvelope>;
export declare function queryBatchWidgetData(tenantId: string, widgetIds: string[], filters?: Record<string, unknown>): Promise<Record<string, WidgetDataEnvelope>>;
