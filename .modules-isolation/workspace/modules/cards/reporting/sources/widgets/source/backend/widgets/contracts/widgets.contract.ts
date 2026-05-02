import type {
  WidgetDefinition, WidgetBundle as _WidgetBundle, WidgetResponseDto,
  WidgetStatus, WidgetCategory, WidgetSize,
} from '../types/widget.types';

export interface WidgetsListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: WidgetStatus;
  category?: WidgetCategory;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WidgetsListResponse {
  success: boolean;
  data: WidgetDefinition[];
  total: number;
  page: number;
  limit: number;
}

export interface WidgetsDetailResponse {
  success: boolean;
  data: WidgetDefinition;
}

export interface WidgetsMutationResponse {
  success: boolean;
  id: string;
  message?: string;
}

export interface WidgetRenderContract {
  widgetKey: string;
  tenantId: string;
  userId: string;
  response: WidgetResponseDto;
}

export interface WidgetBundleContract {
  bundleId: string;
  widgets: WidgetDefinition[];
  layout: { widgetId: string; position: number; colSpan: number; rowSpan: number }[];
}

export interface WidgetDiagnosticsContract {
  moduleCode: 'widgets';
  healthy: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

export interface WidgetRegistryCatalogContract {
  widgets: WidgetDefinition[];
  categories: WidgetCategory[];
  sizes: WidgetSize[];
}
