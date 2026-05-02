import { Injectable, signal, computed } from '@angular/core';

/**
 * Provides the current widget id to dynamically loaded widget components
 * so they can trigger drill-down with context (e.g. row click → drill with role).
 */
@Injectable({ providedIn: 'root' })
export class WidgetContextService {
  private readonly widgetIdSignal = signal<string>('');

  readonly widgetId = this.widgetIdSignal.asReadonly();
  readonly hasWidget = computed(() => !!this.widgetIdSignal().length);

  setWidgetId(id: string): void {
    this.widgetIdSignal.set(id ?? '');
  }

  clearWidgetId(): void {
    this.widgetIdSignal.set('');
  }
}
