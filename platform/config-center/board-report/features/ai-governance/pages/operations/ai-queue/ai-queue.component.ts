import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AnimatedBarChartComponent, BarItem, AnimatedDonutChartComponent, DonutSegment, ProgressRingChartComponent } from '@app/shared/widgets/d3-charts';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    selector: 'app-ai-queue',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule, TooltipModule,
        AnimatedBarChartComponent, AnimatedDonutChartComponent, ProgressRingChartComponent, AppDatePipe, AppNumberPipe,
    ],
    template: `
    <app-page-shell icon="list-check" [title]="i18n.translate('aiQueue.title')"
      [subtitle]="i18n.translate('aiQueue.subtitle')"
      [breadcrumbs]="['Dashboard', 'AI Queue']" [loading]="loading">

      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="i18n.translate('aiQueue.refresh')" severity="secondary" (onClick)="loadQueue()" />
      </div>

      <div class="queue-layout" *ngIf="!error">
        <div class="charts-row">
          <div class="chart-panel">
            <h3>{{ i18n.translate('aiQueue.executionsByAgent') }}</h3>
            <app-animated-bar-chart [items]="agentBars" [width]="380" [height]="200" [horizontal]="true" />
          </div>
          <div class="chart-panel">
            <h3>{{ i18n.translate('aiQueue.statusDistribution') }}</h3>
            <app-animated-donut-chart [segments]="statusDonut" [size]="180" [thickness]="28" centerLabel="Total" [centerValue]="'' + items.length" />
          </div>
          <div class="chart-panel kpi-panel">
            <div class="kpi-item">
              <app-progress-ring-chart [value]="pendingCount" [max]="items.length || 1" [size]="64" [color]="'#f59e0b'" label="" />
              <span class="kpi-text">{{ i18n.translate('aiQueue.pendingReview') }}</span>
            </div>
            <div class="kpi-item">
              <app-progress-ring-chart [value]="completedCount" [max]="items.length || 1" [size]="64" [color]="'#22c55e'" label="" />
              <span class="kpi-text">{{ i18n.translate('aiQueue.completed') }}</span>
            </div>
            <div class="kpi-item">
              <app-progress-ring-chart [value]="avgConfidence" [max]="100" [size]="64" [color]="'#6366f1'" label="" />
              <span class="kpi-text">{{ avgConfidence }}% {{ i18n.translate('aiQueue.confidence') }}</span>
            </div>
          </div>
        </div>

        <p-card>
          <p-table aria-label="Items table" [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm p-datatable-striped"
            [globalFilterFields]="['agentId', 'status', 'triggerReason']"
            [sortField]="'createdAt'" [sortOrder]="-1">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="agentId">{{ i18n.translate('aiQueue.agent') }} <p-sortIcon field="agentId" /></th>
                <th pSortableColumn="stepId">{{ i18n.translate('aiQueue.step') }} <p-sortIcon field="stepId" /></th>
                <th pSortableColumn="triggerReason">{{ i18n.translate('aiQueue.trigger') }} <p-sortIcon field="triggerReason" /></th>
                <th pSortableColumn="confidence">{{ i18n.translate('aiQueue.confidence') }} <p-sortIcon field="confidence" /></th>
                <th pSortableColumn="status">{{ i18n.translate('aiQueue.status') }} <p-sortIcon field="status" /></th>
                <th pSortableColumn="createdAt">{{ i18n.translate('aiQueue.date') }} <p-sortIcon field="createdAt" /></th>
                <th>{{ i18n.translate('aiQueue.action') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td><p-tag [value]="item.agentId" severity="info" [rounded]="true" /></td>
                <td class="step-cell" [pTooltip]="item.stepId">{{ (item.stepId || '') | slice:0:20 }}{{ (item.stepId || '').length > 20 ? '...' : '' }}</td>
                <td><p-tag [value]="triggerLabel(item.triggerReason)" [severity]="triggerSeverity(item.triggerReason)" /></td>
                <td>
                  <div class="confidence-bar">
                    <div class="confidence-fill" [style.width.%]="item.confidence * 100" [style.background]="confidenceColor(item.confidence)"></div>
                  </div>
                  <span class="confidence-text">{{ (item.confidence * 100) | appNumber:'decimal':'1.0-0' }}%</span>
                </td>
                <td><p-tag [value]="item.status" [severity]="statusSeverity(item.status)" /></td>
                <td>{{ item.createdAt | appDate:'short' }}</td>
                <td>
                  @if (!item.humanReviewed && item.status === 'pending_review') {
                    <div class="action-btns">
                      <p-button icon="pi pi-check" severity="success" [text]="true" [rounded]="true" pTooltip="Accept" (onClick)="review(item.executionId, 'accepted')" />
                      <p-button icon="pi pi-times" severity="danger" [text]="true" [rounded]="true" pTooltip="Reject" (onClick)="review(item.executionId, 'rejected')" />
                      <p-button icon="pi pi-pencil" severity="warning" [text]="true" [rounded]="true" pTooltip="Modify" (onClick)="review(item.executionId, 'modified')" />
                    </div>
                  } @else {
                    <p-tag [value]="item.reviewDecision || 'auto'" severity="secondary" [rounded]="true" />
                  }
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="7" class="text-center" style="padding:32px;color:var(--text-muted)">
                  <i class="pi pi-inbox" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.3"></i>
                  {{ i18n.translate('aiQueue.noItems') }}
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      </div>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <p-button [label]="i18n.translate('aiQueue.retry')" severity="secondary" (onClick)="retry()" />
      </div>
    </app-page-shell>
  `,
    styles: [`
    .queue-layout { display: flex; flex-direction: column; gap: 20px; }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .chart-panel { background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); }
    .chart-panel h3 { margin: 0 0 12px; font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading, var(--text-heading)); }
    .kpi-panel { display: flex; flex-direction: column; justify-content: center; gap: 16px; }
    .kpi-item { display: flex; align-items: center; gap: 12px; }
    .kpi-text { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted, var(--text-muted)); }
    .step-cell { font-family: monospace; font-size: var(--font-size-sm); max-width: 160px; }
    .confidence-bar { width: 60px; height: 6px; background: var(--surface-border, var(--border-subtle)); border-radius: var(--radius-xs); display: inline-block; vertical-align: middle; margin-inline-end: 6px; }
    .confidence-fill { height: 100%; border-radius: var(--radius-xs); transition: width 0.6s ease; }
    .confidence-text { font-size: var(--font-size-sm); font-weight: 700; }
    .action-btns { display: flex; gap: 2px; }
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
    @media (max-width: 768px) { .charts-row { grid-template-columns: 1fr; } }
  `]
})
export class AIQueueComponent implements OnInit {
  loading = false;
  error = '';
  items: Record<string, any>[] = [];
  agentBars: BarItem[] = [];
  statusDonut: DonutSegment[] = [];
  pendingCount = 0;
  completedCount = 0;
  avgConfidence = 0;

  private agentColors: Record<string, string> = {
    A01: '#6366f1', A02: '#8b5cf6', A03: '#ec4899', A04: '#f43f5e', A05: '#f97316',
    A06: '#eab308', A07: 'var(--success)', A08: '#14b8a6', A09: '#06b6d4', A10: '#3b82f6',
  };

  constructor(public i18n: I18nService, private cdr: ChangeDetectorRef, private apiclientSvc: ApiClientService) {}

  ngOnInit() { this.loadQueue(); }

  retry() {
    this.error = '';
    this.loadQueue();
  }

  loadQueue() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.apiclientSvc.get('/autonomous/workflows/ai-queue').subscribe({
      next: (data) => {
        this.items = (data?.items || []).map((item: Record<string, any>) => ({
          executionId: item.executionId || item.execution_id,
          agentId: item.agentId || item.agent_id,
          stepId: item.stepId || item.step_id || '',
          triggerReason: item.triggerReason || item.trigger_reason || 'manual',
          confidence: item.confidence ?? 0,
          status: item.status || 'pending_review',
          createdAt: item.createdAt || item.created_at,
          humanReviewed: item.humanReviewed ?? item.human_reviewed ?? false,
          reviewDecision: item.reviewDecision || item.review_decision,
        }));
        this.computeCharts();
        this.loading = false;
        this.error = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.items = [];
        this.computeCharts();
        this.loading = false;
        const msg = err?.error?.error || err?.message;
        this.error = msg?.includes('Tenant')
          ? this.i18n.translate('aiQueue.tenantMissing')
          : this.i18n.translate('aiQueue.loadFailed');
        this.cdr.markForCheck();
      },
    });
  }

  review(executionId: string, decision: string) {
    this.apiclientSvc.post(`/autonomous/workflows/ai-queue/${executionId}/review`, { decision }).subscribe({
      next: () => this.loadQueue(),
      error: (err) => {
        this.error = this.i18n.translate('aiQueue.reviewFailed');
        this.cdr.markForCheck();
      },
    });
  }

  triggerLabel(reason: string): string {
    if (reason === 'sla_timeout') return this.i18n.translate('aiQueue.slaTimeout');
    if (reason === 'user_absent') return this.i18n.translate('aiQueue.userAbsent');
    return this.i18n.translate('aiQueue.manual');
  }

  triggerSeverity(reason: string): 'warning' | 'danger' | 'info' {
    if (reason === 'sla_timeout') return 'danger';
    if (reason === 'user_absent') return 'warning';
    return 'info';
  }

  statusSeverity(s: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
    if (s === 'completed') return 'success';
    if (s === 'pending_review') return 'warning';
    if (s === 'failed') return 'danger';
    if (s === 'working') return 'info';
    return 'secondary';
  }

  confidenceColor(c: number): string {
    if (c >= 0.8) return '#22c55e';
    if (c >= 0.6) return '#f59e0b';
    return '#ef4444';
  }

  private computeCharts() {
    const agentCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    let totalConf = 0;

    for (const item of this.items) {
      agentCounts[item.agentId] = (agentCounts[item.agentId] || 0) + 1;
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      totalConf += item.confidence;
    }

    this.agentBars = Object.entries(agentCounts).map(([label, value]) => ({
      label, value, color: this.agentColors[label] || '#64748b',
    }));

    const statusColors: Record<string, string> = {
      completed: 'var(--success)', pending_review: 'var(--warning)', failed: 'var(--error)', working: '#3b82f6', pending: 'var(--text-muted)',
    };
    this.statusDonut = Object.entries(statusCounts).map(([label, value]) => ({
      label, value, color: statusColors[label] || '#94a3b8',
    }));

    this.pendingCount = statusCounts['pending_review'] || 0;
    this.completedCount = statusCounts['completed'] || 0;
    this.avgConfidence = this.items.length ? Math.round((totalConf / this.items.length) * 100) : 0;
  }
}
