import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface AuditDejavuPair {
  prevYear: number;
  prevText: string;
  currYear: number;
  currText: string;
  similarity: number;
}

interface AuditDejavuResponse {
  pairs?: AuditDejavuPair[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-audit-dejavu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dejavu">
      <div *ngFor="let pair of pairs" class="dv-pair">
        <div class="dv-row prev"><span class="dv-yr">{{ pair.prevYear }}</span><span class="dv-txt">{{ pair.prevText }}</span></div>
        <div class="dv-arrow">↕</div>
        <div class="dv-row curr"><span class="dv-yr">{{ pair.currYear }}</span><span class="dv-txt">{{ pair.currText }}</span></div>
        <span class="dv-sim">{{ pair.similarity }}% {{ i18n.translate('widgets.auditDejavu.similar') }}</span>
      </div>
      <p class="dv-insight" *ngIf="insight">{{ insight }}</p>
      <p *ngIf="pairs.length === 0" class="dv-empty">{{ i18n.translate('widgets.auditDejavu.empty') }}</p>
    </div>
  `,
  styles: [`
    .dejavu { display: flex; flex-direction: column; gap: 10px; }
    .dv-pair {
      background: var(--glass-icon-bg, rgba(14,165,233,0.04)); border-radius: var(--radius, 12px); padding: 12px; position: relative;
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .dv-row { display: flex; gap: 8px; align-items: center; font-size: var(--font-size-sm); }
    .dv-row.prev { color: var(--text-muted); }
    .dv-row.curr { color: var(--text-body); font-weight: 600; }
    .dv-yr { font-weight: var(--font-black, 800); min-width: 36px; }
    .dv-txt { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dv-arrow { text-align: center; font-size: var(--font-size-xs); color: var(--text-muted); }
    .dv-sim {
      position: absolute; top: 8px; inset-inline-end: 10px; font-size: var(--font-size-xs); font-weight: 700;
      color: var(--error); background: rgba(254,226,226,0.7); padding: 2px 8px; border-radius: var(--radius-pill, 99px);
      border: 1px solid rgba(239,68,68,0.18); backdrop-filter: blur(4px);
    }
    .dv-insight { font-size: var(--font-size-sm); font-weight: 600; color: #b91c1c; text-align: center; margin: 0; }
    .dv-empty { font-size: var(--font-size-sm); color: var(--text-muted); text-align: center; margin: 0; }
  `],
})
export class AuditDejavuWidget implements OnInit {
  pairs: { prevYear: number; prevText: string; currYear: number; currText: string; similarity: number }[] = [];
  insight = '';

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit(): void {
    this.apiclientSvc.get<AuditDejavuResponse>('/widgets/audit-dejavu').subscribe({
      next: (d) => {
        this.pairs = (d.pairs ?? []).slice(0, 3);
        this.insight = d.insight ?? '';
      },
      error: () => {
        this.insight = this.i18n.translate('widgets.auditDejavu.fallbackInsight');
      },
    });
  }

}
