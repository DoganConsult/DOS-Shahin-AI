import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from "@app/core/services/api-client.service";

interface OrgAmnesiaDecision {
  date: string;
  decision: string;
  forgotten: boolean;
}

interface OrgAmnesiaResponse {
  decisions?: OrgAmnesiaDecision[];
  insight?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-org-amnesia',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="amnesia">
      <div *ngFor="let d of decisions" class="am-card">
        <div class="am-date">{{ d.date }}</div>
        <div class="am-text">{{ d.decision }}</div>
        <div class="am-status forgotten" *ngIf="d.forgotten">{{ i18n.translate('widgets.orgAmnesia.forgotten') }}</div>
      </div>
      <p class="am-insight" *ngIf="insight">{{ insight }}</p>
      <p *ngIf="decisions.length === 0" class="am-empty">{{ i18n.translate('widgets.orgAmnesia.empty') }}</p>
    </div>
  `,
  styles: [`
    .amnesia { display: flex; flex-direction: column; gap: 6px; }
    .am-card {
      padding: 10px 12px; border-radius: var(--radius-sm, 8px); position: relative;
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.08));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .am-date { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-muted); }
    .am-text { font-size: var(--font-size-sm); color: var(--text-body); margin-top: 2px; }
    .am-status.forgotten {
      position: absolute; top: 6px; inset-inline-end: 8px; font-size: var(--font-size-xs); font-weight: var(--font-black, 800);
      color: #7c3aed; background: rgba(237,233,254,0.7); padding: 2px 8px; border-radius: var(--radius-pill, 99px);
      border: 1px solid rgba(221,214,254,0.5); backdrop-filter: blur(4px);
    }
    .am-insight { font-size: var(--font-size-sm); font-weight: 600; color: #7c3aed; text-align: center; margin: 6px 0 0; }
    .am-empty { font-size: var(--font-size-sm); color: var(--text-muted); text-align: center; margin: 0; }
  `],
})
export class OrgAmnesiaWidget implements OnInit {
  decisions: OrgAmnesiaDecision[] = [];
  insight = '';
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit(): void {
    this.apiclientSvc.get<OrgAmnesiaResponse>('/widgets/org-amnesia').subscribe({
      next: (d) => { this.decisions = (d.decisions ?? []).slice(0, 4); this.insight = d.insight ?? ''; },
      error: () => { this.insight = this.i18n.translate('widgets.orgAmnesia.fallbackInsight'); },
    });
  }

}
