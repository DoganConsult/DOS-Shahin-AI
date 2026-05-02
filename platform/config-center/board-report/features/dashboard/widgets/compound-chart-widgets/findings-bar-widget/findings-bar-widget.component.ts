import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { WidgetShellComponent } from '@app/dashboard';
import { NgxEchartsDirective } from 'ngx-echarts';
import { buildFindingsBarOptions } from '../../../charts/findings-bar.options';
import type { FindingCategory } from '../../../charts/findings-bar.options';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-findings-bar-widget',
    imports: [WidgetShellComponent, NgxEchartsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-widget-shell title="Audit & Findings" subtitle="Open findings by severity" [state]="state" [canRefresh]="canRefresh" (refresh)="onRefresh()">
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
export class FindingsBarWidgetComponent implements OnInit, OnChanges {
  @Input() findings: FindingCategory[] = [];
  @Input() loading?: boolean;
  @Input() canRefresh = true;
  @Output() refresh = new EventEmitter<void>();

  options: EChartsOption | null = null;
  state: 'ready' | 'loading' | 'empty' | 'error' = 'ready';

  ngOnInit(): void {
    this.buildOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['findings'] || changes['loading']) {
      this.buildOptions();
    }
  }

  private buildOptions(): void {
    if (this.loading === true) {
      this.state = 'loading';
      this.options = null;
      return;
    }
    if (!this.findings || this.findings.length === 0) {
      this.state = 'empty';
      this.options = null;
      return;
    }
    this.options = buildFindingsBarOptions(this.findings);
    this.state = 'ready';
  }

  onRefresh(): void {
    this.refresh.emit();
  }
}
