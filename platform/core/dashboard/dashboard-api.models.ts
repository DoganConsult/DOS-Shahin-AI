export interface DashboardWidgetInstanceDto {
  widgetKey: string;
  componentKey: string;
  labelEn: string;
  labelAr: string;
  moduleCode: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  config: Record<string, unknown>;
}

export interface DashboardResolvedDto {
  dashboardCode: string;
  nameEn: string;
  nameAr: string;
  route: string | null;
  moduleCode: string | null;
  widgets: DashboardWidgetInstanceDto[];
  defaultFilters: Record<string, unknown>;
}

export interface DashboardResolveResponseDto {
  dashboardCode: string;
  route: string | null;
}
