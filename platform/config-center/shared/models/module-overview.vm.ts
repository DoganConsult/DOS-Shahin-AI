export interface KpiCardVM {
  id: string;
  labelEn: string;
  labelAr: string;
  value: number | string;
  icon: string;
  color: string;
  bg: string;
  route: string;
  queryParams?: Record<string, string>;
  trend?: number;
  unit?: string;
  severity?: 'default' | 'danger' | 'warning' | 'success';
  /** Raw numeric values for inline sparkline rendering (newest last) */
  sparklinePoints?: number[];
}

export interface HealthAlertVM {
  id: string;
  labelEn: string;
  labelAr: string;
  count: number;
  icon: string;
  color: string;
  severity: 'danger' | 'warning' | 'info';
  route: string;
  queryParams?: Record<string, string>;
}

export interface NextActionVM {
  id: string;
  labelEn: string;
  labelAr: string;
  route: string;
  done: boolean;
  priority: number;
}

export interface ActivityRowVM {
  id: string;
  timestamp: string;
  actorLabel: string;
  action: string;
  entityType: string;
  entityLabel?: string;
  route?: string;
}

export interface ModuleTabVM {
  id: string;
  labelEn: string;
  labelAr: string;
  route: string;
  icon?: string;
  badgeCount?: number;
  /** Parent tab id — marks this tab as a sub-tab of a primary tab */
  parent?: string;
}

export interface ModuleOverviewVM {
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  icon: string;
  breadcrumbsEn: string[];
  breadcrumbsAr: string[];
  kpis: KpiCardVM[];
  healthAlerts: HealthAlertVM[];
  nextActions: NextActionVM[];
  recentActivity: ActivityRowVM[];
  tabs?: ModuleTabVM[];
}
