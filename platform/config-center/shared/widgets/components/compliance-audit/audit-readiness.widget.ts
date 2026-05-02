import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';

interface AuditPlansResponse {
  plans?: unknown[];
}

interface AuditFindingsResponse {
  findings?: unknown[];
}

interface AuditEvidenceResponse {
  evidence?: unknown[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-audit-readiness',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="readiness">
      <div class="meter">
        <div class="meter-bar" [style.width.%]="readiness" [style.background]="readiness >= 70 ? 'var(--success)' : readiness >= 40 ? '#eab308' : 'var(--error)'"></div>
      </div>
      <div class="meter-label">{{ readiness }}% {{ i18n.translate('audit.title') }}</div>
      <div class="stats-row">
        <div class="mini-stat"><span class="num">{{ plans }}</span><span class="lbl">{{ i18n.translate('audit.plans') }}</span></div>
        <div class="mini-stat"><span class="num">{{ findings }}</span><span class="lbl">{{ i18n.translate('audit.findings') }}</span></div>
        <div class="mini-stat"><span class="num">{{ evidenceCount }}</span><span class="lbl">{{ i18n.translate('audit.evidence') }}</span></div>
      </div>
    </div>
  `,
  styles: [`
    .meter {
      height: 12px; border-radius: var(--radius-sm); overflow: hidden; margin-bottom: 8px;
      background: var(--glass-icon-bg, rgba(14,165,233,0.06));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.12));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .meter-bar { height: 100%; border-radius: var(--radius-sm); transition: width 600ms; box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
    .meter-label { font-size: var(--font-size-base); font-weight: var(--font-black, 800); text-align: center; margin-bottom: 14px; color: var(--text-heading); }
    .stats-row { display: flex; justify-content: space-around; }
    .mini-stat {
      text-align: center; padding: 10px 14px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .num { display: block; font-size: var(--font-size-2xl); font-weight: var(--font-black, 800); color: var(--text-heading); letter-spacing: -0.02em; }
    .lbl { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
  `],
})
export class AuditReadinessWidget implements OnInit {
  readiness = 0; plans = 0; findings = 0; evidenceCount = 0;

  constructor(public i18n: I18nService, private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void {
    this.complianceSvc.getAuditPlans().subscribe({
      next: (r: AuditPlansResponse) => { this.plans = (r.plans ?? []).length; },
      error: (e: unknown) => devError("[API]", e)
    });
    this.complianceSvc.getAuditFindings().subscribe({
      next: (r: AuditFindingsResponse) => { this.findings = (r.findings ?? []).length; },
      error: (e: unknown) => devError("[API]", e)
    });
    this.complianceSvc.getEvidence().subscribe({
      next: (r: AuditEvidenceResponse) => {
        this.evidenceCount = (r.evidence ?? []).length;
        this.readiness = Math.min(100, this.plans * 20 + this.evidenceCount * 5);
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }
}
