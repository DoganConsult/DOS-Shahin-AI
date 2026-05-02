import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { WidgetContainerComponent } from '@app/shared/widgets/widget-container.component';
import { DisplayModeToggleComponent } from '@app/shared/widgets/presentation/display-mode/display-mode-toggle.component';

/** Compat shape for template bindings that still use WidgetDef field names. */
export interface WidgetDefCompat {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  component: any;
  defaultWidth: number;
  defaultHeight: number;
}

/**
 * Dumb component: renders the widget section header (title + display mode toggle)
 * and the widget grid. Emits drill-down events back to the parent.
 */
@Component({
  selector: 'app-dashboard-widget-catalog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WidgetContainerComponent, DisplayModeToggleComponent],
  template: `
    <div class="widget-section-header" *ngIf="activeWidgets.length">
      <div class="section-title"><i class="pi pi-th-large"></i> {{ i18n.translate('dashboard.dashboardWidgets') }}</div>
      <app-display-mode-toggle
        [currentMode]="displayMode"
        (modeChanged)="modeChanged.emit($event)">
      </app-display-mode-toggle>
    </div>
    <div class="widget-grid">
      <app-widget-container *ngFor="let w of activeWidgets; let idx = index"
        [widgetComponent]="w.component"
        [icon]="w.icon"
        [nameAr]="w.nameAr"
        [nameEn]="w.nameEn"
        [width]="w.defaultWidth"
        [height]="w.defaultHeight"
        [displayMode]="displayMode"
        [widgetId]="w.id"
        (drillDown)="drillDown.emit({ widgetId: w.id, payload: $event })" />
    </div>
  `,
  styles: [`
    /* Section Title */
    .section-title {
      font-size: var(--font-size-lg); font-weight: var(--font-black); color: var(--text-heading);
      margin-bottom: var(--space-md); display: flex; align-items: center; gap: var(--space-sm);
      letter-spacing: -0.01em;
    }
    .section-title .pi {
      color: var(--primary); font-size: var(--font-size-lg); width: 36px; height: 36px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md); background: var(--glass-icon-bg);
      backdrop-filter: blur(var(--glass-icon-blur)); -webkit-backdrop-filter: blur(var(--glass-icon-blur));
      border: 1px solid var(--glass-icon-border); box-shadow: var(--glass-icon-shadow);
    }

    /* Widget Section Header */
    .widget-section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: var(--space-md);
    }
    .widget-section-header .section-title { margin-bottom: 0; }

    /* Widget Grid */
    .widget-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-md); margin-bottom: 28px;
    }
  `],
})
export class DashboardWidgetCatalogComponent {
  readonly i18n = inject(I18nService);

  @Input() activeWidgets: WidgetDefCompat[] = [];
  @Input() displayMode: 'compact' | 'expanded' = 'expanded';

  @Output() modeChanged = new EventEmitter<'compact' | 'expanded'>();
  @Output() drillDown = new EventEmitter<{ widgetId: string; payload?: Record<string, any> }>();
}
