export type WidgetLoadState = 'idle' | 'loading' | 'ok' | 'empty' | 'error';

export interface WidgetDataResult<T = unknown> {
  state: WidgetLoadState;
  data?: T;
  error?: string;
  meta?: {
    source?: string;
    refreshedAt?: string;
    cached?: boolean;
    latencyMs?: number;
  };
}
