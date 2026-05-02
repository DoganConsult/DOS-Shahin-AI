import {
  Component, ChangeDetectionStrategy, Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';

export interface BottleneckEntry {
  stage: string;
  stageAr: string;
  count: number;
  avgDaysStuck: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-lifecycle-bottleneck',
  standalone: true,
  imports: [CommonModule, TagModule],
  template: `
    <div class="wlb-widget" [attr.dir]="dir">
      <h4 class="wlb-title">{{ dir === 'rtl' ? 'اختناقات دورة الحياة' : 'Lifecycle Bottlenecks' }}</h4>
      @if (!entries?.length) {
        <p class="wlb-empty">{{ dir === 'rtl' ? 'لا توجد اختناقات' : 'No bottlenecks detected' }}</p>
      } @else {
        <ul class="wlb-list">
          @for (e of entries; track e.stage) {
            <li class="wlb-item">
              <span class="wlb-stage">{{ dir === 'rtl' ? e.stageAr : e.stage }}</span>
              <span class="wlb-count">{{ e.count }} {{ dir === 'rtl' ? 'عنصر' : 'items' }}</span>
              <span class="wlb-days">{{ e.avgDaysStuck }}{{ dir === 'rtl' ? ' يوم' : 'd avg' }}</span>
              <p-tag [value]="e.severity" [severity]="severityMap[e.severity]" />
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .wlb-widget { padding: 1rem; }
    .wlb-title { color: var(--text-body); margin: 0 0 0.75rem; font-size: var(--font-size-body-sm); }
    .wlb-empty { color: var(--text-muted); font-style: italic; font-size: var(--font-size-tag); }
    .wlb-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .wlb-item { display: flex; align-items: center; gap: 0.75rem; font-size: var(--font-size-tag); }
    .wlb-stage { flex: 1; color: var(--text-body); }
    .wlb-count { color: var(--text-muted); }
    .wlb-days { color: var(--text-muted); min-width: 50px; text-align: right; }
  `],
})
export class LifecycleBottleneckWidget {
  @Input() entries: BottleneckEntry[] = [];
  @Input() dir: 'ltr' | 'rtl' = 'ltr';

  severityMap: Record<string, string> = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
}
