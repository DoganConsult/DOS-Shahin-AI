export interface DashboardLayoutWidgetInput {
  widgetKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
}

export interface SaveDashboardLayoutDto {
  appliesToRole?: string | null;
  nameEn?: string | null;
  nameAr?: string | null;
  route?: string | null;
  widgets: DashboardLayoutWidgetInput[];
}

export interface DashboardWidgetRegistryItemDto {
  widget_key: string;
  label_en: string;
  label_ar: string;
  module_code: string | null;
  component_key: string;
  default_width: number;
  default_height: number;
  default_config: Record<string, unknown> | null;
}
