import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import type { RedTeamRunDto } from '@app/core/services/platform-api-types';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcOperationsService } from '@app/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-red-team',
  standalone: true,
  imports: [CommonModule, AppDatePipe],
  template: `
    <div class="red-team">
      <div class="summary-row">
        <div class="sum-stat"><span class="num">{{ totalRuns }}</span><span class="lbl">Runs</span></div>
        <div class="sum-stat"><span class="num" style="color:var(--error)">{{ vulns }}</span><span class="lbl">Vulnerabilities</span></div>
      </div>
      <div *ngFor="let run of runs" class="run-item">
        <span class="badge" [ngClass]="run.status==='completed'?'badge-green':'badge-yellow'">{{ run.status }}</span>
        <span class="run-date">{{ run.startedAt | appDate:'short' }}</span>
        <span class="run-vulns">{{ run.findings || 0 }} found</span>
      </div>
      <div *ngIf="runs.length===0" style="text-align:center;color:var(--text-muted);font-size: var(--font-size-sm)">{{ i18n.translate('common.noData') }}</div>
    </div>
  `,
  styles: [`
    .summary-row {
      display: flex; justify-content: space-around; margin-bottom: 14px; padding-bottom: 14px;
      border-bottom: 1px solid var(--border-subtle, var(--border-subtle));
    }
    .sum-stat {
      text-align: center; padding: 10px 14px; border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.04));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.10));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .num { display: block; font-size: var(--font-size-2xl); font-weight: var(--font-black, 800); color: var(--text-heading); letter-spacing: -0.02em; }
    .lbl { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
    .run-item {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin-bottom: 4px;
      border-radius: var(--radius-sm, 8px); font-size: var(--font-size-sm);
      background: var(--glass-icon-bg, rgba(14,165,233,0.03));
      border: 1px solid var(--border-subtle, var(--border-subtle));
      transition: all 200ms;
    }
    .run-item:hover { border-color: var(--glass-icon-border, rgba(14,165,233,0.18)); }
    .run-date { flex: 1; color: var(--text-muted); }
    .run-vulns { font-weight: 700; color: var(--text-body); }
    .badge-green { background: rgba(220,252,231,0.7); color: #166534; padding: 2px 8px; border-radius: var(--radius-pill, 99px); font-size: var(--font-size-xs); font-weight: 700; border: 1px solid rgba(34,197,94,0.18); }
    .badge-yellow { background: rgba(254,249,195,0.7); color: #854d0e; padding: 2px 8px; border-radius: var(--radius-pill, 99px); font-size: var(--font-size-xs); font-weight: 700; border: 1px solid rgba(234,179,8,0.18); }
  `],
})
export class RedTeamBoardWidget implements OnInit {
  totalRuns = 0;
  vulns = 0;
  runs: RedTeamRunDto[] = [];

  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  ngOnInit(): void {
    this.operationsSvc.getRedTeamRuns().subscribe({
      next: (runs: RedTeamRunDto[]) => {
        this.runs = runs.slice(0, 5);
        this.totalRuns = runs.length;
        this.vulns = runs.reduce((sum, run) => sum + (run.findings ?? 0), 0);
      },
      error: (e: unknown) => devError('[API]', e),
    });
  }
}

