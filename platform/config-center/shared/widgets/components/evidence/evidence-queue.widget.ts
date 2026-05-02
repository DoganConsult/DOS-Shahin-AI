import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { ApiClientService } from "@app/core/services/api-client.service";

interface EvidenceQueueItem {
  title?: string;
  isOverdue?: boolean;
  daysUntilDue?: number;
}

interface EvidenceQueueResponse {
  queue?: EvidenceQueueItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-evidence-queue',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="queue-widget">
      <div *ngIf="items.length === 0" class="empty">{{ i18n.translate('widgets.evidenceQueue.empty') }}</div>
      <div *ngFor="let item of items" class="queue-item" [class.overdue]="item.isOverdue">
        <div class="title">{{ item.title }}</div>
        <div class="due">
          <span *ngIf="item.isOverdue" class="overdue-badge">{{ i18n.translate('widgets.evidenceQueue.overdue') }}</span>
          <span>{{ item.daysUntilDue }}d</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .queue-item {
      display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; margin-bottom: 4px;
      border-radius: var(--radius-sm, 8px); font-size: var(--font-size-sm);
      background: var(--glass-icon-bg, rgba(14,165,233,0.03));
      border: 1px solid var(--border-subtle, var(--border-subtle));
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      transition: all 200ms;
    }
    .queue-item:hover { border-color: var(--glass-icon-border, rgba(14,165,233,0.18)); }
    .queue-item.overdue { background: rgba(254,242,242,0.5); border-color: rgba(254,202,202,0.5); }
    .title { flex: 1; font-weight: 500; color: var(--text-body); }
    .due { display: flex; gap: 6px; align-items: center; font-size: var(--font-size-xs); font-weight: 700; }
    .overdue-badge {
      background: rgba(239,68,68,0.85); color: white; padding: 2px 8px;
      border-radius: var(--radius-pill, 99px); font-size: var(--font-size-xs); font-weight: 700;
      backdrop-filter: blur(4px);
    }
    .empty {
      text-align: center; color: var(--text-muted, var(--text-muted)); padding: 20px;
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      border-radius: var(--radius, 12px);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
  `]
})
export class EvidenceQueueWidget implements OnInit {
  items: EvidenceQueueItem[] = [];
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.apiclientSvc.get<EvidenceQueueResponse>('/dashboard/evidence-queue').subscribe({ next: (d) => this.items = d.queue ?? [], error: (e: unknown) => devError("[API]", e) });
  }

}
