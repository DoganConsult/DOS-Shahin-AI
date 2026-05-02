/**
 * Types for dashboard layout grid and user preferences.
 * Used by LayoutPreferencesService and dashboard component.
 */

export interface GridWidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridWidget {
  id: string;
  position: GridWidgetPosition;
  visible: boolean;
}

export interface LayoutPreferences {
  widgets: GridWidget[];
  displayMode: 'compact' | 'expanded';
  version: number;
}

export type GridPosition = GridWidgetPosition;

export interface DisplayModeStyles {
  widgetPadding: number;
  fontSize: number;
  gap: number;
  headerHeight: number;
}

export type WidgetCategory = 'risk' | 'compliance' | 'ai' | 'evidence' | string;

export interface RefreshConfig {
  widgetId: string;
  intervalSeconds: number;
  jitterSeconds: number;
}
