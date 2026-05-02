import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Subscription } from 'rxjs';
import { WebSocketService } from '@app/websocket';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { environment } from '@env/environment';
import { StorageService } from '@app/infrastructure';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-board-report',
  standalone: true,
  imports: [CommonModule, AppDatePipe, PageShellComponent, CardModule, TagModule, ButtonModule, SkeletonModule],
  template: `
    <app-page-shell
      icon="chart-bar"
      [title]="i18n.translate('boardReport.title')"
      [subtitle]="i18n.translate('boardReport.subtitle')"
      [breadcrumbs]="['Dashboard', 'Reports', 'Board Report']"
      [loading]="loading">

      <div class="board-report" *ngIf="data">
        <!-- Report Header -->
        <div class="br-header">
          <div class="br-header-left">
            <h2 class="br-title">GRC Executive Board Report</h2>
            <p class="br-date">Generated: {{ data.generatedAt | date:'fullDate' }} at {{ data.generatedAt | date:'shortTime' }}</p>
          </div>
          <button class="br-print-btn" (click)="printReport()">
            <i class="pi pi-print"></i> Print / Export PDF
          </button>
        </div>

        <!-- Executive Summary Cards -->
        <div class="br-section">
          <h3 class="br-section-title"><i class="pi pi-chart-line"></i> Executive Summary</h3>
          <div class="br-exec-grid">
            <div class="br-exec-card">
              <div class="br-exec-gauge" [class.gauge-good]="data.executiveSummary.overallCompliancePct >= 75"
                   [class.gauge-warn]="data.executiveSummary.overallCompliancePct >= 50 && data.executiveSummary.overallCompliancePct < 75"
                   [class.gauge-bad]="data.executiveSummary.overallCompliancePct < 50">
                <svg viewBox="0 0 36 36" class="br-ring">
                  <path class="br-ring-bg" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="br-ring-fill" [attr.stroke-dasharray]="data.executiveSummary.overallCompliancePct + ', 100'"
                        d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <text x="18" y="20.5" class="br-ring-text">{{ data.executiveSummary.overallCompliancePct }}%</text>
                </svg>
              </div>
              <div class="br-exec-label">Overall Compliance</div>
            </div>
            <div class="br-exec-card">
              <div class="br-exec-gauge" [class.gauge-good]="data.executiveSummary.controlEffectivenessPct >= 75"
                   [class.gauge-warn]="data.executiveSummary.controlEffectivenessPct >= 50 && data.executiveSummary.controlEffectivenessPct < 75"
                   [class.gauge-bad]="data.executiveSummary.controlEffectivenessPct < 50">
                <svg viewBox="0 0 36 36" class="br-ring">
                  <path class="br-ring-bg" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="br-ring-fill" [attr.stroke-dasharray]="data.executiveSummary.controlEffectivenessPct + ', 100'"
                        d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <text x="18" y="20.5" class="br-ring-text">{{ data.executiveSummary.controlEffectivenessPct }}%</text>
                </svg>
              </div>
              <div class="br-exec-label">Control Effectiveness</div>
            </div>
            <div class="br-exec-card">
              <div class="br-exec-gauge" [class.gauge-good]="data.executiveSummary.policyApprovalPct >= 80"
                   [class.gauge-warn]="data.executiveSummary.policyApprovalPct >= 50 && data.executiveSummary.policyApprovalPct < 80"
                   [class.gauge-bad]="data.executiveSummary.policyApprovalPct < 50">
                <svg viewBox="0 0 36 36" class="br-ring">
                  <path class="br-ring-bg" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="br-ring-fill" [attr.stroke-dasharray]="data.executiveSummary.policyApprovalPct + ', 100'"
                        d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <text x="18" y="20.5" class="br-ring-text">{{ data.executiveSummary.policyApprovalPct }}%</text>
                </svg>
              </div>
              <div class="br-exec-label">Policy Approval</div>
            </div>
            <div class="br-exec-card br-exec-kpi">
              <div class="br-kpi-value br-kpi-danger" *ngIf="data.executiveSummary.openRisks > 0">{{ data.executiveSummary.openRisks }}</div>
              <div class="br-kpi-value br-kpi-ok" *ngIf="data.executiveSummary.openRisks === 0">0</div>
              <div class="br-exec-label">Open Risks</div>
            </div>
            <div class="br-exec-card br-exec-kpi">
              <div class="br-kpi-value" [class.br-kpi-danger]="data.executiveSummary.criticalFindings > 0"
                   [class.br-kpi-ok]="data.executiveSummary.criticalFindings === 0">{{ data.executiveSummary.criticalFindings }}</div>
              <div class="br-exec-label">Critical Findings</div>
            </div>
            <div class="br-exec-card br-exec-kpi">
              <div class="br-kpi-value" [class.br-kpi-warn]="data.executiveSummary.openIncidents > 0"
                   [class.br-kpi-ok]="data.executiveSummary.openIncidents === 0">{{ data.executiveSummary.openIncidents }}</div>
              <div class="br-exec-label">Open Incidents</div>
            </div>
          </div>
        </div>

        <!-- Risk Posture -->
        <div class="br-section">
          <h3 class="br-section-title"><i class="pi pi-exclamation-triangle"></i> Risk Posture</h3>
          <div class="br-detail-grid">
            <div class="br-detail-card">
              <div class="br-detail-header">Risk Distribution</div>
              <div class="br-bar-chart">
                <div class="br-bar-row"><span class="br-bar-label">Critical</span><div class="br-bar-track"><div class="br-bar-fill br-bar-critical" [style.width.%]="barPct(data.risks.critical, data.risks.total)"></div></div><span class="br-bar-val">{{ data.risks.critical }}</span></div>
                <div class="br-bar-row"><span class="br-bar-label">High</span><div class="br-bar-track"><div class="br-bar-fill br-bar-high" [style.width.%]="barPct(data.risks.high, data.risks.total)"></div></div><span class="br-bar-val">{{ data.risks.high }}</span></div>
                <div class="br-bar-row"><span class="br-bar-label">Medium</span><div class="br-bar-track"><div class="br-bar-fill br-bar-medium" [style.width.%]="barPct(data.risks.medium, data.risks.total)"></div></div><span class="br-bar-val">{{ data.risks.medium }}</span></div>
                <div class="br-bar-row"><span class="br-bar-label">Low</span><div class="br-bar-track"><div class="br-bar-fill br-bar-low" [style.width.%]="barPct(data.risks.low, data.risks.total)"></div></div><span class="br-bar-val">{{ data.risks.low }}</span></div>
              </div>
              <div class="br-detail-footer">Total: {{ data.risks.total }} risks &middot; Avg Score: {{ data.risks.avgScore }}</div>
            </div>
            <div class="br-detail-card">
              <div class="br-detail-header">Control Status</div>
              <div class="br-bar-chart">
                <div class="br-bar-row"><span class="br-bar-label">Implemented</span><div class="br-bar-track"><div class="br-bar-fill br-bar-low" [style.width.%]="barPct(data.controls.implemented, data.controls.total)"></div></div><span class="br-bar-val">{{ data.controls.implemented }}</span></div>
                <div class="br-bar-row"><span class="br-bar-label">Tested OK</span><div class="br-bar-track"><div class="br-bar-fill br-bar-medium" [style.width.%]="barPct(data.controls.testedPassed, data.controls.total)"></div></div><span class="br-bar-val">{{ data.controls.testedPassed }}</span></div>
                <div class="br-bar-row"><span class="br-bar-label">Test Failed</span><div class="br-bar-track"><div class="br-bar-fill br-bar-critical" [style.width.%]="barPct(data.controls.testedFailed, data.controls.total)"></div></div><span class="br-bar-val">{{ data.controls.testedFailed }}</span></div>
              </div>
              <div class="br-detail-footer">Total: {{ data.controls.total }} controls &middot; {{ data.controls.effectivenessPct }}% effective</div>
            </div>
          </div>
        </div>

        <!-- Compliance & SOX -->
        <div class="br-section">
          <h3 class="br-section-title"><i class="pi pi-check-square"></i> Compliance & SOX</h3>
          <div class="br-detail-grid br-detail-grid-3">
            <div class="br-detail-card">
              <div class="br-detail-header">Framework Coverage</div>
              <div class="br-stat-row"><span>Active Frameworks</span><strong>{{ data.compliance.activeFrameworks }}</strong></div>
              <div class="br-stat-row"><span>Avg Compliance</span><strong>{{ data.compliance.avgCompliancePct }}%</strong></div>
            </div>
            <div class="br-detail-card">
              <div class="br-detail-header">SOX Controls</div>
              <div class="br-stat-row"><span>SOX-relevant</span><strong>{{ data.controls.soxTotal }}</strong></div>
              <div class="br-stat-row"><span>Certified</span><strong class="br-text-success">{{ data.controls.soxCertified }}</strong></div>
              <div class="br-stat-row"><span>Uncertified</span><strong class="br-text-danger">{{ data.controls.soxTotal - data.controls.soxCertified }}</strong></div>
            </div>
            <div class="br-detail-card">
              <div class="br-detail-header">Policies</div>
              <div class="br-stat-row"><span>Total</span><strong>{{ data.policies.total }}</strong></div>
              <div class="br-stat-row"><span>Approved</span><strong class="br-text-success">{{ data.policies.approved }}</strong></div>
              <div class="br-stat-row"><span>Pending</span><strong class="br-text-warn">{{ data.policies.pending }}</strong></div>
            </div>
          </div>
        </div>

        <!-- Findings & Incidents -->
        <div class="br-section">
          <h3 class="br-section-title"><i class="pi pi-flag"></i> Findings & Incidents</h3>
          <div class="br-detail-grid">
            <div class="br-detail-card">
              <div class="br-detail-header">Findings</div>
              <div class="br-stat-row"><span>Total</span><strong>{{ data.findings.total }}</strong></div>
              <div class="br-stat-row"><span>Open</span><strong class="br-text-danger">{{ data.findings.open }}</strong></div>
              <div class="br-stat-row"><span>Closed</span><strong class="br-text-success">{{ data.findings.closed }}</strong></div>
              <div class="br-stat-row"><span>Critical Open</span><strong class="br-text-danger">{{ data.findings.criticalOpen }}</strong></div>
              <div class="br-stat-row"><span>Avg Open Age</span><strong>{{ data.findings.avgOpenDays }}d</strong></div>
            </div>
            <div class="br-detail-card">
              <div class="br-detail-header">Vendors & Incidents</div>
              <div class="br-stat-row"><span>Active Vendors</span><strong>{{ data.vendors.total }}</strong></div>
              <div class="br-stat-row"><span>Critical Vendors</span><strong class="br-text-danger">{{ data.vendors.criticalVendors }}</strong></div>
              <div class="br-stat-row"><span>Expired Contracts</span><strong class="br-text-warn">{{ data.vendors.expiredContracts }}</strong></div>
              <div class="br-stat-row br-divider"></div>
              <div class="br-stat-row"><span>Total Incidents</span><strong>{{ data.incidents.total }}</strong></div>
              <div class="br-stat-row"><span>Open Incidents</span><strong class="br-text-danger">{{ data.incidents.openIncidents }}</strong></div>
            </div>
          </div>
        </div>

        <!-- Confidentiality Notice -->
        <div class="br-footer">
          <p><strong>CONFIDENTIAL</strong> — This report is intended for the Board of Directors and senior management only. Distribution is restricted.</p>
          <p>Generated by Shahin-AI GRC Platform &middot; {{ data.generatedAt | appDate:'medium' }}</p>
        </div>
      </div>

      <p-skeleton *ngIf="loading" width="100%" height="600px" />
    </app-page-shell>
  `,
  styles: [`
    .board-report { max-width: 900px; margin: 0 auto; }

    .br-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; background: linear-gradient(135deg, var(--text-heading), #334155);
      border-radius: var(--radius-lg); margin-bottom: 24px; color: white;
    }
    .br-title { font-size: var(--font-size-xl); font-weight: var(--font-black); margin: 0; }
    .br-date { font-size: var(--font-size-sm); opacity: 0.7; margin: 4px 0 0; }
    .br-print-btn {
      display: flex; align-items: center; gap: 6px; padding: 8px 16px;
      background: rgba(var(--color-white-rgb), 0.15); border: 1px solid rgba(var(--color-white-rgb), 0.3);
      border-radius: var(--radius-sm); color: white; cursor: pointer; font-size: var(--font-size-sm); font-weight: var(--font-medium);
      transition: all 150ms;
    }
    .br-print-btn:hover { background: rgba(var(--color-white-rgb), 0.25); }

    .br-section { margin-bottom: 28px; }
    .br-section-title {
      font-size: var(--font-size-base); font-weight: var(--font-bold); color: var(--text-heading);
      margin: 0 0 14px; display: flex; align-items: center; gap: 8px;
      border-bottom: 2px solid var(--border-subtle); padding-bottom: 8px;
    }
    .br-section-title .pi { color: var(--primary); }

    .br-exec-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
    .br-exec-card {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: 16px 8px; background: var(--surface); border-radius: var(--radius);
      border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);
    }
    .br-exec-label { font-size: var(--font-size-xs); font-weight: var(--font-medium); color: var(--text-muted); text-transform: uppercase; margin-top: 8px; }

    .br-exec-gauge { width: 72px; height: 72px; }
    .br-ring { width: 100%; height: 100%; }
    .br-ring-bg { fill: none; stroke: var(--border-subtle); stroke-width: 3.8; }
    .br-ring-fill { fill: none; stroke-width: 3.8; stroke-linecap: round; transition: stroke-dasharray 600ms; }
    .gauge-good .br-ring-fill { stroke: var(--success); }
    .gauge-warn .br-ring-fill { stroke: var(--warning); }
    .gauge-bad .br-ring-fill { stroke: var(--error); }
    .br-ring-text { fill: var(--text-heading); font-size: 8px; text-anchor: middle; font-weight: var(--font-bold); }

    .br-exec-kpi { justify-content: center; }
    .br-kpi-value { font-size: var(--font-size-3xl); font-weight: var(--font-black); line-height: 1; }
    .br-kpi-danger { color: var(--error); }
    .br-kpi-warn { color: var(--warning); }
    .br-kpi-ok { color: var(--success); }

    .br-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .br-detail-grid-3 { grid-template-columns: repeat(3, 1fr); }
    .br-detail-card {
      padding: 18px; background: var(--surface); border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
    }
    .br-detail-header { font-size: var(--font-size-sm); font-weight: var(--font-bold); color: var(--text-heading); margin-bottom: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px; }

    .br-bar-chart { display: flex; flex-direction: column; gap: 8px; }
    .br-bar-row { display: flex; align-items: center; gap: 8px; }
    .br-bar-label { font-size: var(--font-size-xs); font-weight: var(--font-medium); color: var(--text-muted); width: 80px; flex-shrink: 0; }
    .br-bar-track { flex: 1; height: 8px; background: var(--surface-sunken); border-radius: var(--radius-pill); overflow: hidden; }
    .br-bar-fill { height: 100%; border-radius: var(--radius-pill); transition: width 500ms; }
    .br-bar-critical { background: var(--error); }
    .br-bar-high { background: var(--warning); }
    .br-bar-medium { background: var(--primary); }
    .br-bar-low { background: var(--success); }
    .br-bar-val { font-size: var(--font-size-sm); font-weight: var(--font-bold); color: var(--text-heading); width: 30px; text-align: end; }
    .br-detail-footer { font-size: var(--font-size-xs); color: var(--text-caption); margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-subtle); }

    .br-stat-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: var(--font-size-sm); }
    .br-stat-row span { color: var(--text-muted); }
    .br-stat-row strong { color: var(--text-heading); }
    .br-text-success { color: var(--success); }
    .br-text-danger { color: var(--error); }
    .br-text-warn { color: var(--warning); }
    .br-divider { border-top: 1px solid var(--border-subtle); margin: 4px 0; }

    .br-footer {
      margin-top: 32px; padding: 16px 20px; background: var(--surface-sunken);
      border: 1px dashed var(--border-subtle); border-radius: var(--radius);
      text-align: center; font-size: var(--font-size-xs); color: var(--text-caption);
    }
    .br-footer p { margin: 4px 0; }

    @media print {
      .br-print-btn { display: none; }
      .board-report { max-width: 100%; }
    }
    @media (max-width: 1024px) { .br-exec-grid { grid-template-columns: repeat(3, 1fr); } .br-detail-grid-3 { grid-template-columns: 1fr; } }
    @media (max-width: 768px) { .br-exec-grid { grid-template-columns: repeat(2, 1fr); } .br-detail-grid { grid-template-columns: 1fr; } }
  `],
})
export class BoardReportComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private wsService = inject(WebSocketService);
  private _storage = inject(StorageService);
  private cdr = inject(ChangeDetectorRef);
  private wsSub?: Subscription;
  loading = true;
  data: Record<string, unknown> | null = null;
  private api = environment.apiUrl;

  constructor(public i18n: I18nService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadReport();
    this.wsSub = this.wsService.dataUpdates$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadReport());
  }

  ngOnDestroy(): void { this.wsSub?.unsubscribe(); }

  private loadReport(): void {
    this.loading = true;
    const workspaceId = this._storage.get('grc_active_workspace') || '';
    const url = workspaceId
      ? `${this.api}/report-center/board-report?workspaceId=${workspaceId}`
      : `${this.api}/report-center/board-report`;
    this.http.get<unknown>(url).subscribe({
      next: (d) => { this.data = d; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  barPct(value: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  printReport(): void {
    window.print();
  }
}
