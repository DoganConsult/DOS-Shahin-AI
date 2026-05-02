import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { WidgetShellComponent } from '@app/dashboard';
import { NgxEchartsDirective } from 'ngx-echarts';
import { buildEvidenceDonutOptions } from '../../../../../../shared/charts/echarts/evidence/evidence-donut.options';
import type { EvidenceSlice } from '../../../../../../shared/charts/echarts/evidence/evidence-donut.options';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-evidence-donut-widget',
    imports: [WidgetShellComponent, NgxEchartsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-widget-shell title="Evidence Operations" subtitle="Fresh vs Stale vs Missing" [state]="state" [canRefresh]="canRefresh" (refresh)="onRefresh()">
      @if (options) {
        <div class="h-64 w-full">
          <div echarts [options]="options" class="h-full w-full"></div>
        </div>
      } @else {
        <div class="h-64 w-full flex items-center justify-center text-[var(--text-1)] text-sm">Loading…</div>
      }
    </app-widget-shell>
  `
})
export class EvidenceDonutWidgetComponent implements OnInit, OnChanges {
  @Input() slices: EvidenceSlice[] = [];
  @Input() centreLabel?: string;
  @Input() loading?: boolean;
  @Input() canRefresh = true;
  @Output() refresh = new EventEmitter<void>();

  options: EChartsOption | null = null;
  state: 'ready' | 'loading' | 'empty' | 'error' = 'ready';

  ngOnInit(): void {
    this.buildOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slices'] || changes['centreLabel'] || changes['loading']) {
      this.buildOptions();
    }
  }

  private buildOptions(): void {
    if (this.loading === true) {
      this.state = 'loading';
      this.options = null;
      return;
    }
    const data = this.slices.length ? this.slices : this.placeholder();
    this.options = buildEvidenceDonutOptions(data, this.centreLabel ?? 'Evidence');
    this.state = data.length ? 'ready' : 'empty';
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  private placeholder(): EvidenceSlice[] {
    return [
      { name: 'Fresh',   value: 124, accent: 'success' },
      { name: 'Stale',   value: 38,  accent: 'warning' },
      { name: 'Missing', value: 17,  accent: 'danger'  },
      { name: 'Pending', value: 9,   accent: 'info'    },
    ];
  }
}
