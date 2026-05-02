import {
  ChangeDetectionStrategy, Component, Input, Injector, OnChanges, SimpleChanges, Type, inject
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { WidgetManifest } from '../models/widget-manifest.model';
import { DashboardWidgetInstance } from '../models/widget-instance.model';
import { WidgetRenderContext } from '../models/widget-context.model';
import { WidgetLoaderService } from '../services/widget-loader.service';
import { WidgetTelemetryService } from '../services/widget-telemetry.service';
import { WIDGET_CONTEXT, WIDGET_INSTANCE, WIDGET_MANIFEST } from '../tokens/widget.tokens';

@Component({
  selector: 'app-widget-outlet',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `
    @if (componentType) {
      <ng-container *ngComponentOutlet="componentType; injector: widgetInjector"></ng-container>
    } @else if (loading) {
      <div class="widget-outlet-loading">
        <div class="animate-pulse bg-surface-200 dark:bg-surface-700 rounded h-full w-full"></div>
      </div>
    } @else if (error) {
      <div class="widget-outlet-error text-red-500 p-4 text-sm">
        Failed to load widget: {{ manifest?.id }}
      </div>
    }
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .widget-outlet-loading { height: 100%; min-height: 80px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WidgetOutletComponent implements OnChanges {
  @Input({ required: true }) manifest!: WidgetManifest;
  @Input({ required: true }) instance!: DashboardWidgetInstance;
  @Input({ required: true }) context!: WidgetRenderContext;

  componentType: Type<any> | null = null;
  widgetInjector: Injector | null = null;
  loading = false;
  error = false;

  private readonly injector = inject(Injector);
  private readonly loader = inject(WidgetLoaderService);
  private readonly telemetry = inject(WidgetTelemetryService);

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['manifest'] || changes['instance'] || changes['context']) {
      await this.loadComponent();
    }
  }

  private async loadComponent(): Promise<void> {
    this.loading = true;
    this.error = false;
    const start = performance.now();

    try {
      this.componentType = await this.loader.resolveComponent(this.manifest);

      this.widgetInjector = Injector.create({
        parent: this.injector,
        providers: [
          { provide: WIDGET_MANIFEST, useValue: this.manifest },
          { provide: WIDGET_INSTANCE, useValue: this.instance },
          { provide: WIDGET_CONTEXT, useValue: this.context },
        ],
      });

      this.telemetry.recordLoad(this.manifest.id, performance.now() - start);
    } catch (err) {
      this.error = true;
      this.telemetry.recordError(
        this.manifest.id,
        err instanceof Error ? err.message : 'Unknown error'
      );
    } finally {
      this.loading = false;
    }
  }
}
