import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuditApiService } from '../../services/audit-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-committee-dashboard',
    imports: [CommonModule, FormsModule, PageShellComponent,
        ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule,
        DropdownModule, CalendarModule, TagModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="building"
      [title]="i18n.translate('audit.auditCommitteeDashboard')"
      [subtitle]="i18n.translate('audit.executiveSummaryAndKpisForAuditCommitteeAndBoard')"
      [loading]="loading()">
      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('audit.print')" icon="pi pi-print" severity="secondary" (onClick)="print()" />
        </ng-template>
      </p-toolbar>

      <!-- Executive Summary KPI Cards -->
      <h3 style="margin:0 0 12px">{{ i18n.translate('audit.executiveSummary') }}</h3>
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-value">{{ execSummary()?.total_audits || 0 }}</span>
          <span class="kpi-label">{{ i18n.translate('audit.totalAudits') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value kpi-warning">{{ execSummary()?.open_findings || 0 }}</span>
          <span class="kpi-label">{{ i18n.translate('audit.openFindings') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value kpi-danger">{{ execSummary()?.critical_findings || 0 }}</span>
          <span class="kpi-label">{{ i18n.translate('audit.criticalFindings') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value kpi-warning">{{ execSummary()?.capa_open || 0 }}</span>
          <span class="kpi-label">{{ i18n.translate('audit.capaOpen') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value kpi-success">{{ execSummary()?.closure_rate_pct || 0 }}%</span>
          <span class="kpi-label">{{ i18n.translate('audit.closureRate') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value" [class.kpi-success]="(execSummary()?.sla_compliance_pct || 0) >= 80" [class.kpi-danger]="(execSummary()?.sla_compliance_pct || 0) < 80">
            {{ execSummary()?.sla_compliance_pct || 0 }}%
          </span>
          <span class="kpi-label">{{ i18n.translate('audit.slaCompliance') }}</span>
        </div>
      </div>

      <!-- Board Dashboard — Risk Level Indicators -->
      <h3 style="margin:24px 0 12px">{{ i18n.translate('audit.boardDashboard') }}</h3>
      <div class="risk-indicators" *ngIf="boardData()?.risk_levels?.length">
        <div *ngFor="let r of boardData().risk_levels" class="risk-indicator"
          [style.borderLeftColor]="r.level === 'critical' ? 'var(--error)' : r.level === 'high' ? '#ea580c' : r.level === 'medium' ? '#ca8a04' : '#16a34a'">
          <span class="risk-level-label">{{ r.level | uppercase }}</span>
          <span class="risk-level-count">{{ r.count }}</span>
          <span class="risk-level-desc">{{ r.description || '' }}</span>
        </div>
      </div>
      <div *ngIf="!boardData()?.risk_levels?.length" class="text-center p-4" style="color:var(--text-muted)">
        <i class="pi pi-inbox" style="font-size:2rem"></i>
        <p style="margin-top:8px">{{ i18n.translate('audit.noRiskDataAvailable') }}</p>
      </div>

      <!-- Committee Metrics — Quarterly Trends -->
      <h3 style="margin:24px 0 12px">{{ i18n.translate('audit.committeeMetrics') }}</h3>
      <p-table aria-label="Data table" [value]="metrics()" [paginator]="true" [rows]="12" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="quarter">{{ i18n.translate('audit.quarter') }} <p-sortIcon field="quarter" /></th>
            <th>{{ i18n.translate('audit.auditsCompleted') }}</th>
            <th>{{ i18n.translate('audit.newFindings') }}</th>
            <th>{{ i18n.translate('audit.closedFindings') }}</th>
            <th>{{ i18n.translate('audit.overdue') }}</th>
            <th>{{ i18n.translate('audit.closureRate') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-m>
          <tr>
            <td class="font-semibold">{{ m.quarter }}</td>
            <td>{{ m.audits_completed || 0 }}</td>
            <td>{{ m.new_findings || 0 }}</td>
            <td>{{ m.closed_findings || 0 }}</td>
            <td><p-tag [value]="'' + (m.overdue || 0)" [severity]="m.overdue > 0 ? 'danger' : 'success'" /></td>
            <td>{{ m.closure_rate || 0 }}%</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noMetricsDataYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Cross-Module GRC Posture -->
      <h3 style="margin:24px 0 12px">{{ i18n.translate('audit.grcPosture') || 'GRC Posture' }}</h3>
      <div class="grc-posture-grid" *ngIf="boardData()?.grcPosture">
        <div class="posture-card" tabindex="0" role="button" (keyup.enter)="router.navigate(['/risk/register'])" (click)="router.navigate(['/risk/register'])">
          <div class="posture-header"><i class="pi pi-shield" style="color:#d97706"></i> {{ i18n.translate('audit.riskPosture') || 'Risk Posture' }}</div>
          <div class="posture-row"><span class="posture-label">{{ i18n.translate('audit.openRisks') || 'Open Risks' }}</span><span class="posture-val">{{ boardData()?.grcPosture?.risk?.openRisks || 0 }}</span></div>
          <div class="posture-row"><span class="posture-label">{{ i18n.translate('audit.highRisks') || 'High/Critical' }}</span><span class="posture-val kpi-danger">{{ boardData()?.grcPosture?.risk?.highRisks || 0 }}</span></div>
          <div class="posture-row"><span class="posture-label">{{ i18n.translate('audit.avgRiskScore') || 'Avg Risk Score' }}</span><span class="posture-val">{{ boardData()?.grcPosture?.risk?.avgRiskScore || 0 }}</span></div>
          <div class="posture-row"><span class="posture-label">{{ i18n.translate('audit.findingsLinkedToRisks') || 'Audit→Risk Links' }}</span><span class="posture-val">{{ boardData()?.grcPosture?.risk?.findingsLinkedToRisks || 0 }}</span></div>
        </div>
        <div class="posture-card" tabindex="0" role="button" (keyup.enter)="router.navigate(['/compliance/overview'])" (click)="router.navigate(['/compliance/overview'])">
          <div class="posture-header"><i class="pi pi-verified" style="color:#7c3aed"></i> {{ i18n.translate('audit.compliancePosture') || 'Compliance Posture' }}</div>
          <div class="posture-row"><span class="posture-label">{{ i18n.translate('audit.totalControls') || 'Total Controls' }}</span><span class="posture-val">{{ boardData()?.grcPosture?.compliance?.totalControls || 0 }}</span></div>
          <div class="posture-row"><span class="posture-label">{{ i18n.translate('audit.implemented') || 'Implemented' }}</span><span class="posture-val kpi-success">{{ boardData()?.grcPosture?.compliance?.implementedControls || 0 }}</span></div>
          <div class="posture-row"><span class="posture-label">{{ i18n.translate('audit.controlGaps') || 'Control Gaps' }}</span><span class="posture-val kpi-danger">{{ boardData()?.grcPosture?.compliance?.controlGaps || 0 }}</span></div>
          <div class="posture-row"><span class="posture-label">{{ i18n.translate('audit.compliancePct') || 'Compliance %' }}</span><span class="posture-val kpi-success">{{ boardData()?.grcPosture?.compliance?.compliancePct || 0 }}%</span></div>
        </div>
      </div>

      <!-- Cross-Module Links -->
      <div class="cross-links" style="margin-top:24px">
        <button class="cross-link-btn" (click)="router.navigate(['/audit/findings'])"><i class="pi pi-search"></i> {{ i18n.translate('audit.allFindings') || 'All Findings' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/engagements'])"><i class="pi pi-briefcase"></i> {{ i18n.translate('audit.engagements') || 'Engagements' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/risk/register'])"><i class="pi pi-shield"></i> {{ i18n.translate('audit.riskRegister') || 'Risk Register' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/compliance/overview'])"><i class="pi pi-check-square"></i> {{ i18n.translate('audit.compliance') || 'Compliance' }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/governance/overview'])"><i class="pi pi-building"></i> {{ i18n.translate('audit.governance') || 'Governance' }}</button>
      </div>
    </app-page-shell>
  `,
    styles: [`
    .font-semibold { font-weight: 600; }
    .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 16px; }
    .kpi-card { background: var(--surface-card); border-radius: var(--radius-lg); padding: 20px; text-align: center; display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--surface-border); }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; }
    .kpi-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    .kpi-success { color: var(--success); }
    .kpi-warning { color: #ca8a04; }
    .kpi-danger { color: var(--error); }
    .risk-indicators { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .risk-indicator { background: var(--surface-card); border-radius: var(--radius); padding: 16px; border-inline-start: 4px solid; display: flex; flex-direction: column; gap: 4px; }
    .risk-level-label { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
    .risk-level-count { font-size: var(--font-size-2xl); font-weight: 700; }
    .risk-level-desc { font-size: var(--font-size-sm); color: var(--text-muted); }
    @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
    .grc-posture-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .posture-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-lg); padding: 16px; cursor: pointer; transition: all .15s; }
    .posture-card:hover { box-shadow: var(--shadow-sm); transform: translateY(-2px); }
    .posture-header { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: var(--font-size-sm); margin-bottom: 12px; text-transform: uppercase; color: var(--text-heading); }
    .posture-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--surface-50, #f8fafc); }
    .posture-label { font-size: var(--font-size-sm); color: var(--text-muted); }
    .posture-val { font-weight: 700; font-size: var(--font-size-sm); }
    @media (max-width: 600px) { .grc-posture-grid { grid-template-columns: 1fr; } }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class AuditCommitteeDashboardComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);

  loading = signal(true);
  execSummary = signal<GrcRecord>({});
  boardData = signal<GrcRecord>({});
  metrics = signal<GrcRecord[]>([]);

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);

    this.api.getExecutiveSummary().subscribe({
      next: r => this.execSummary.set(r),
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadExecutiveSummary') })
    });

    this.api.getBoardDashboard().subscribe({
      next: r => this.boardData.set(r),
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadBoardDashboard') })
    });

    this.api.getCommitteeMetrics().subscribe({
      next: r => { this.metrics.set(Array.isArray((r as any)?.quarters) ? (r as any).quarters : Array.isArray(r) ? r : []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadMetrics') }); }
    });
  }

  print() { window.print(); }

}
