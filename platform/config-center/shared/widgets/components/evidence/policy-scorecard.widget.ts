import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';

interface PolicyScorecardPolicy {
  status?: string;
  approval_status?: string;
}

interface PolicyScorecardResponse {
  policies?: PolicyScorecardPolicy[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-policy-scorecard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scorecard">
      <div class="stat" *ngFor="let s of stats">
        <span class="stat-count" [style.color]="s.color">{{ s.count }}</span>
        <span class="stat-label">{{ i18n.translate(s.labelKey) }}</span>
      </div>
    </div>
  `,
  styles: [`
    .scorecard { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .stat {
      text-align: center; padding: 14px; border-radius: var(--radius, 12px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      transition: all 200ms;
    }
    .stat:hover { border-color: var(--glass-icon-border, rgba(14,165,233,0.20)); }
    .stat-count { display: block; font-size: var(--font-size-2xl); font-weight: var(--font-black, 800); letter-spacing: -0.02em; }
    .stat-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
  `],
})
export class PolicyScorecardWidget implements OnInit {
  stats: { labelKey: string; count: number; color: string }[] = [];

  constructor(public i18n: I18nService, private governanceSvc: GrcGovernanceService) {}

  ngOnInit(): void {
    this.governanceSvc.getGovernancePolicies().subscribe({
      next: (r: PolicyScorecardResponse) => {
        const policies = r.policies ?? [];
        const draft = policies.filter((p) => p.status === 'draft').length;
        const approved = policies.filter((p) => p.approval_status === 'approved').length;
        const pending = policies.filter((p) => p.approval_status === 'pending').length;
        this.stats = [
          { labelKey: 'dashboard.totalPolicies', count: policies.length, color: '#3b82f6' },
          { labelKey: 'policy.approved', count: approved, color: '#22c55e' },
          { labelKey: 'policy.draft', count: draft, color: '#94a3b8' },
          { labelKey: 'governance.approval', count: pending, color: '#eab308' },
        ];
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }

}
