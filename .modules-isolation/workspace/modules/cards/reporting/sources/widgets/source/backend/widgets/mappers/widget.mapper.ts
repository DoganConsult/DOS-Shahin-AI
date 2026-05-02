import type { GenericRow } from '@dos/types';
import type { WidgetDefinition, WidgetBundle } from '../types/widget.types';

export function toWidgetDefinition(row: GenericRow): WidgetDefinition {
  return {
    widgetId: row.widget_id ?? row.id,
    widgetKey: row.widget_key,
    nameEn: row.name_en,
    nameAr: row.name_ar ?? '',
    descriptionEn: row.description_en ?? '',
    descriptionAr: row.description_ar ?? '',
    category: row.category,
    size: row.size ?? 'medium',
    icon: row.icon ?? '',
    status: row.status,
    version: row.version ?? '1.0.0',
    dataSources: Array.isArray(row.data_sources) ? row.data_sources : [],
    requiredPermissions: Array.isArray(row.required_permissions) ? row.required_permissions : [],
    scopeRule: row.scope_rule ?? 'org',
    config: typeof row.config === 'string' ? JSON.parse(row.config) : (row.config ?? {}),
    createdBy: row.created_by ?? 'system',
    updatedBy: row.updated_by ?? '',
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export function toWidgetDefinitionList(rows: GenericRow[]): WidgetDefinition[] { return rows.map(toWidgetDefinition); }

export function toWidgetBundle(row: GenericRow): WidgetBundle {
  return {
    bundleId: row.bundle_id ?? row.id,
    nameEn: row.name_en,
    nameAr: row.name_ar ?? '',
    descriptionEn: row.description_en ?? '',
    descriptionAr: row.description_ar ?? '',
    widgetIds: Array.isArray(row.widget_ids) ? row.widget_ids : [],
    layout: typeof row.layout === 'string' ? JSON.parse(row.layout) : (row.layout ?? []),
    status: row.status,
    targetAudience: row.target_audience ?? 'all',
    createdBy: row.created_by ?? 'system',
    updatedBy: row.updated_by ?? '',
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export function toWidgetApiResponse(entity: WidgetDefinition): Record<string, unknown> { return { ...entity }; }
