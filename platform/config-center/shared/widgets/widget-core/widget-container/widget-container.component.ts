import { Component, Input, Output, EventEmitter, ViewChild, ViewContainerRef, OnInit, OnDestroy, Type, HostListener, ComponentRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { WidgetDataService } from '../widget-infra/widget-data.service';
import { WidgetContextService } from '../../features/drill-through/widget-context.service';
import { PulseIndicatorComponent } from '../../presentation/pulse-refresh/pulse-indicator.component';
import { Subscription } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-widget-container',
    imports: [CommonModule, PulseIndicatorComponent],
    templateUrl: './widget-container.component.html',
    styleUrls: ['./widget-container.component.scss']
})
export class WidgetContainerComponent implements OnInit, OnDestroy {
  @Input() widgetComponent!: Type<any> | (() => Promise<Type<any>>);
  @Input() widgetId = '';
  @Input() icon = '';
  @Input() nameAr = '';
  @Input() nameEn = '';
  @Input() width = 1;
  @Input() height = 1;
  @Input() loading = false;
  @Input() error = false;

  // v2 inputs
  @Input() refreshInterval = 0;
  @Input() displayMode: 'compact' | 'expanded' = 'expanded';
  @Input() showResizeHandle = false;
  @Input() lastUpdated: Date | null = null;
  @Input() dataUpdated = false;

  @Output() retry = new EventEmitter<void>();

  // v2 outputs
  /** Emits when drill button is clicked; optional payload when widget triggers drill with context (e.g. row click). */
  @Output() drillDown = new EventEmitter<Record<string, any> | void>();
  @Output() refreshComplete = new EventEmitter<Date>();
  @Output() resizeEnd = new EventEmitter<{ width: number; height: number }>();

  @ViewChild('outlet', { read: ViewContainerRef, static: true }) outlet!: ViewContainerRef;

  private dataSub?: Subscription;
  private componentRef?: ComponentRef<any>;

  /** Resize interaction state */
  isResizing = false;
  resizeColSpan = 1;
  resizeRowSpan = 1;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartWidth = 0;
  private resizeStartHeight = 0;
  /** Approximate grid cell size in px for dimension calculation */
  private readonly gridCellSize = 200;

  constructor(
    public i18n: I18nService,
    private widgetDataSvc: WidgetDataService,
    private widgetContext: WidgetContextService,
  ) {}

  /** Skeleton main block height scales with widget height for a better loading preview. */
  get skeletonMainHeight(): string {
    return `${Math.max(40, this.height * 50)}px`;
  }

  /** Begin resize interaction — show overlay with dimension indicators. */
  onResizeStart(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const point = event instanceof MouseEvent ? event : event.touches[0];
    this.resizeStartX = point.clientX;
    this.resizeStartY = point.clientY;
    this.resizeStartWidth = this.width;
    this.resizeStartHeight = this.height;
    this.resizeColSpan = this.width;
    this.resizeRowSpan = this.height;
    this.isResizing = true;
  }

  /** Track resize movement and update dimension indicators. */
  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onResizeMove(event: MouseEvent | TouchEvent): void {
    if (!this.isResizing) return;
    const point = event instanceof MouseEvent ? event : event.touches[0];
    const dx = point.clientX - this.resizeStartX;
    const dy = point.clientY - this.resizeStartY;
    this.resizeColSpan = Math.max(1, this.resizeStartWidth + Math.round(dx / this.gridCellSize));
    this.resizeRowSpan = Math.max(1, this.resizeStartHeight + Math.round(dy / this.gridCellSize));
  }

  /** End resize interaction — emit final dimensions and hide overlay. */
  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onResizeStop(): void {
    if (!this.isResizing) return;
    this.isResizing = false;
    if (this.resizeColSpan !== this.resizeStartWidth || this.resizeRowSpan !== this.resizeStartHeight) {
      this.resizeEnd.emit({ width: this.resizeColSpan, height: this.resizeRowSpan });
    }
  }

  ngOnInit(): void {
    if (this.widgetComponent && !this.loading && !this.error) {
      this.resolveAndRender();
    }
  }

  private async resolveAndRender(): Promise<void> {
    let componentType: Type<any>;
    if (typeof this.widgetComponent === 'function' && !('ɵcmp' in this.widgetComponent)) {
      componentType = await (this.widgetComponent as () => Promise<Type<any>>)();
    } else {
      componentType = this.widgetComponent as Type<any>;
    }

    this.outlet.clear();
    if (this.widgetId) {
      this.widgetContext.setWidgetId(this.widgetId);
    }
    this.componentRef = this.outlet.createComponent(componentType);

    // Auto-fetch data for widgets that accept @Input() data (EChart/D3/Plotly)
    if (this.widgetId && this.componentRef.instance && 'data' in this.componentRef.instance) {
      this.loading = true;
      this.dataSub = this.widgetDataSvc.fetchWidgetData(this.widgetId).subscribe({
        next: (payload) => {
          this.loading = false;
          if (payload !== null && this.componentRef) {
            this.componentRef.instance.data = payload;
            // Trigger OnChanges if the component implements it
            if (typeof this.componentRef.instance.ngOnChanges === 'function') {
              this.componentRef.instance.ngOnChanges({
                data: { currentValue: payload, previousValue: undefined, firstChange: false, isFirstChange: () => false },
              });
            }
            this.componentRef.changeDetectorRef.markForCheck();
            this.dataUpdated = true;
            setTimeout(() => { this.dataUpdated = false; }, 700);
          } else if (payload === null) {
            this.error = true;
          }
        },
        error: () => {
          this.loading = false;
          this.error = true;
        },
      });
    }
  }

  ngOnDestroy(): void {
    this.dataSub?.unsubscribe();
  }
}
