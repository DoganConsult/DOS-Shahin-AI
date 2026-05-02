import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { ApiClientService } from "@app/core/services/api-client.service";

interface AuditPackItem {
  assessmentName: string;
  progressPercent: number;
  outstandingItems: unknown[];
}

interface AuditPackStatusResponse {
  packs?: AuditPackItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-audit-pack-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="audit-pack-widget">
      <div *ngIf="packs.length === 0" class="empty">{{ i18n.translate('widgets.auditPackStatus.empty') }}</div>
      <div *ngFor="let pack of packs" class="pack-item">
        <div class="pack-header">
          <span class="name">{{ pack.assessmentName }}</span>
          <span class="pct">{{ pack.progressPercent }}%</span>
        </div>
        <div class="progress-bar">
          <div class="fill" [style.width.%]="pack.progressPercent"></div>
        </div>
        <div class="outstanding" *ngIf="pack.outstandingItems.length > 0">
          <span class="count">{{ pack.outstandingItems.length }} {{ i18n.translate('widgets.auditPackStatus.outstanding') }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pack-item { margin-bottom: 14px; }
    .pack-header { display: flex; justify-content: space-between; font-size: var(--font-size-sm); margin-bottom: 6px; }
    .name { font-weight: 700; color: var(--text-heading); }
    .pct { font-weight: var(--font-black, 800); color: var(--primary, var(--primary)); }
    .progress-bar {
      height: 10px; border-radius: var(--radius-sm); overflow: hidden;
      background: var(--glass-icon-bg, rgba(14,165,233,0.06));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.12));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .fill { height: 100%; background: linear-gradient(90deg, var(--primary, var(--primary)), var(--primary-light, #38bdf8)); border-radius: var(--radius-sm); transition: width 400ms; box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
    .outstanding {
      font-size: var(--font-size-xs); color: var(--warning, var(--warning)); margin-top: 4px; font-weight: 600;
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
export class AuditPackStatusWidget implements OnInit {
  packs: AuditPackItem[] = [];
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.apiclientSvc.get<AuditPackStatusResponse>('/dashboard/audit-pack').subscribe({
      next: (d) => { this.packs = d.packs ?? []; },
      error: (e: unknown) => devError("[API]", e)
    });
  }

}
