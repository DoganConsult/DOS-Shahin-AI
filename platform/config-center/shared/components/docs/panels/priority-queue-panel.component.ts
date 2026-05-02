import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

export interface PriorityQueueItem {
  id: string;
  title: string;
  titleAr?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  moduleCode: string;
  status: string;
  dueDate?: string;
  owner?: string;
  aiRecommended?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-priority-queue-panel',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule],
  template: `
    <section class="priority-queue-panel">
      <div class="pqp-header">
        <h3 class="pqp-title">{{ isAr ? 'المهام ذات الأولوية' : 'Priority Tasks' }}</h3>
        <p-tag [value]="items.length + ''" severity="danger" *ngIf="items.length > 0" />
      </div>
      <div class="pqp-list" *ngIf="items.length > 0; else emptyState">
        <div *ngFor="let item of items; trackBy: trackById" class="pqp-item"
             [class]="'pqp-item--' + item.severity" (click)="itemClick.emit(item)">
          <div class="pqp-item-left">
            <span class="pqp-severity-dot" [class]="'pqp-dot--' + item.severity"></span>
            <div class="pqp-item-content">
              <span class="pqp-item-title">{{ isAr && item.titleAr ? item.titleAr : item.title }}</span>
              <span class="pqp-item-meta">
                {{ item.moduleCode | uppercase }}
                <span *ngIf="item.dueDate"> · {{ item.dueDate }}</span>
                <span *ngIf="item.owner"> · {{ item.owner }}</span>
              </span>
            </div>
          </div>
          <div class="pqp-item-right">
            <i *ngIf="item.aiRecommended" class="pi pi-sparkles pqp-ai-badge" title="AI Recommended"></i>
            <p-tag [value]="item.status" [severity]="severityMap(item.severity)" />
          </div>
        </div>
      </div>
      <ng-template #emptyState>
        <div class="pqp-empty">
          <i class="pi pi-check-circle"></i>
          <span>{{ isAr ? 'لا توجد مهام عاجلة' : 'No urgent tasks' }}</span>
        </div>
      </ng-template>
    </section>
  `,
  styles: [`
    .priority-queue-panel { background: var(--surface-card, #fff); border-radius: var(--radius); border: 1px solid var(--surface-border, #e5e7eb); }
    .pqp-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--surface-border, #e5e7eb); }
    .pqp-title { margin: 0; font-size: var(--font-size-base); font-weight: 700; }
    .pqp-list { max-height: 320px; overflow-y: auto; }
    .pqp-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid var(--surface-50, #f9fafb); cursor: pointer; transition: background 0.15s; }
    .pqp-item:hover { background: var(--surface-hover, #f5f5f5); }
    .pqp-item-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .pqp-severity-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .pqp-dot--critical { background: var(--red-500, #ef4444); }
    .pqp-dot--high { background: var(--orange-500, #f97316); }
    .pqp-dot--medium { background: var(--amber-500, #f59e0b); }
    .pqp-dot--low { background: var(--blue-500, #3b82f6); }
    .pqp-item-content { display: flex; flex-direction: column; min-width: 0; }
    .pqp-item-title { font-size: var(--font-size-xs-plus); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pqp-item-meta { font-size: var(--font-size-2xs); color: var(--text-muted); }
    .pqp-item-right { display: flex; align-items: center; gap: 8px; }
    .pqp-ai-badge { color: var(--primary-color, #0f62fe); font-size: var(--font-size-sm); }
    .pqp-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 16px; color: var(--text-muted); }
    .pqp-empty i { font-size: var(--font-size-2xl); color: var(--green-500, #22c55e); }
  `],
})
export class PriorityQueuePanelComponent {
  private i18n = inject(I18nService);

  @Input() items: PriorityQueueItem[] = [];
  @Output() itemClick = new EventEmitter<PriorityQueueItem>();

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  trackById(_: number, item: PriorityQueueItem): string { return item.id; }

  severityMap(s: string): 'danger' | 'warning' | 'info' | 'success' {
    const m: Record<string, 'danger' | 'warning' | 'info' | 'success'> = {
      critical: 'danger', high: 'warning', medium: 'info', low: 'success',
    };
    return m[s] ?? 'info';
  }
}
