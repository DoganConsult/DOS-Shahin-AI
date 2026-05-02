import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/select';
import { DonutSegment, ProgressRingChartComponent } from '@app/shared/widgets/d3-charts';
import { devError } from '../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  selector: 'app-hitl-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, PageShellComponent, CardModule, TableModule, TagModule,
    ButtonModule, TooltipModule, DropdownModule, ProgressRingChartComponent, AppDatePipe, AppNumberPipe,],
  template: `
    <app-page-shell icon="shield-check"
      [title]="i18n.translate('hitlCenter.title')"
      [subtitle]="i18n.translate('hitlCenter.subtitle')"
      [breadcrumbs]="['Dashboard', 'HITL Center']" [loading]="loading">

      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="i18n.translate('hitlCenter.refresh')" severity="secondary" (onClick)="loadData()" />
      </div>

      <!-- KPI Row -->
      <div class="hitl-layout">
        <div class="kpi-row">
          <div tabindex="0" role="button" (keyup.enter)="filterByState('ai_draft')" class="kpi-card" (click)="filterByState('ai_draft')">
            <app-progress-ring-chart [value]="dashboard.totalAiDrafts" [max]="totalItems || 1" [size]="56" [color]="'#8b5cf6'" label="" />
            <div class="kpi-meta">
              <span class="kpi-value">{{ dashboard.totalAiDrafts }}</span>
              <span class="kpi-label">{{ i18n.translate('hitlCenter.aiDrafts') }}</span>
            </div>
          </div>
          <div tabindex="0" role="button" (keyup.enter)="filterByState('pending_review')" class="kpi-card" (click)="filterByState('pending_review')">
            <app-progress-ring-chart [value]="dashboard.totalPendingReview" [max]="totalItems || 1" [size]="56" [color]="'#f59e0b'" label="" />
            <div class="kpi-meta">
              <span class="kpi-value">{{ dashboard.totalPendingReview }}</span>
              <span class="kpi-label">{{ i18n.translate('hitlCenter.pendingReview') }}</span>
            </div>
          </div>
          <div tabindex="0" role="button" (keyup.enter)="filterByState('approved')" class="kpi-card" (click)="filterByState('approved')">
            <app-progress-ring-chart [value]="dashboard.totalApproved" [max]="totalItems || 1" [size]="56" [color]="'#22c55e'" label="" />
            <div class="kpi-meta">
              <span class="kpi-value">{{ dashboard.totalApproved }}</span>
              <span class="kpi-label">{{ i18n.translate('hitlCenter.approved') }}</span>
            </div>
          </div>
          <div tabindex="0" role="button" (keyup.enter)="filterByState('rejected')" class="kpi-card" (click)="filterByState('rejected')">
            <app-progress-ring-chart [value]="dashboard.totalRejected" [max]="totalItems || 1" [size]="56" [color]="'#ef4444'" label="" />
            <div class="kpi-meta">
              <span class="kpi-value">{{ dashboard.totalRejected }}</span>
              <span class="kpi-label">{{ i18n.translate('hitlCenter.rejected') }}</span>
            </div>
          </div>
          <div tabindex="0" role="button" (keyup.enter)="filterByState('escalated')" class="kpi-card" (click)="filterByState('escalated')">
            <app-progress-ring-chart [value]="dashboard.totalEscalated" [max]="totalItems || 1" [size]="56" [color]="'#f97316'" label="" />
            <div class="kpi-meta">
              <span class="kpi-value">{{ dashboard.totalEscalated }}</span>
              <span class="kpi-label">{{ i18n.translate('hitlCenter.escalated') }}</span>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="filters-row">
          <p-dropdown [options]="stateOptions" [(ngModel)]="selectedState" (onChange)="loadData()"
            [placeholder]="i18n.translate('hitlCenter.allStates')" [showClear]="true" />
          <p-dropdown [options]="entityTypeOptions" [(ngModel)]="selectedEntityType" (onChange)="loadData()"
            [placeholder]="i18n.translate('hitlCenter.allEntityTypes')" [showClear]="true" />
        </div>

        <!-- Data Table -->
        <p-card>
          <p-table aria-label="Items table" [value]="items" [paginator]="true" [rows]="15" styleClass="p-datatable-sm p-datatable-striped"
            [sortField]="'updatedAt'" [sortOrder]="-1">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="entityType">{{ i18n.translate('hitlCenter.entityType') }} <p-sortIcon field="entityType" /></th>
                <th>{{ i18n.translate('hitlCenter.entityId') }}</th>
                <th pSortableColumn="hitlState">{{ i18n.translate('hitlCenter.hitlState') }} <p-sortIcon field="hitlState" /></th>
                <th pSortableColumn="aiAgentId">{{ i18n.translate('hitlCenter.agent') }} <p-sortIcon field="aiAgentId" /></th>
                <th pSortableColumn="confidence">{{ i18n.translate('hitlCenter.confidence') }} <p-sortIcon field="confidence" /></th>
                <th pSortableColumn="updatedAt">{{ i18n.translate('hitlCenter.lastUpdated') }} <p-sortIcon field="updatedAt" /></th>
                <th>{{ i18n.translate('hitlCenter.action') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td><p-tag [value]="item.entityType" severity="info" [rounded]="true" /></td>
                <td class="entity-id-cell" [pTooltip]="item.entityId">{{ item.entityId | slice:0:12 }}...</td>
                <td><p-tag [value]="stateLabel(item.hitlState)" [severity]="stateSeverity(item.hitlState)" /></td>
                <td>
                  @if (item.aiAgentId) {
                    <p-tag [value]="item.aiAgentId" [style]="{background: agentColors[item.aiAgentId] || 'var(--text-muted)'}" [rounded]="true" />
                  } @else {
                    <span class="text-muted">—</span>
                  }
                </td>
                <td>
                  @if (item.confidence != null) {
                    <div class="confidence-bar">
                      <div class="confidence-fill" [style.width.%]="item.confidence * 100" [style.background]="confidenceColor(item.confidence)"></div>
                    </div>
                    <span class="confidence-text">{{ (item.confidence * 100) | appNumber:'decimal':'1.0-0' }}%</span>
                  } @else {
                    <span class="text-muted">—</span>
                  }
                </td>
                <td>{{ item.updatedAt | appDate:'short' }}</td>
                <td>
                  @if (item.reviewRequired && ['ai_draft', 'pending_review', 'escalated'].includes(item.hitlState)) {
                    <div class="action-btns">
                      <p-button icon="pi pi-check" severity="success" [text]="true" [rounded]="true"
                        [pTooltip]="i18n.translate('hitlCenter.approve')"
                        (onClick)="reviewEntity(item.entityType, item.entityId, 'accepted')" />
                      <p-button icon="pi pi-times" severity="danger" [text]="true" [rounded]="true"
                        [pTooltip]="i18n.translate('hitlCenter.reject')"
                        (onClick)="reviewEntity(item.entityType, item.entityId, 'rejected')" />
                      <p-button icon="pi pi-arrow-up" severity="warning" [text]="true" [rounded]="true"
                        [pTooltip]="i18n.translate('hitlCenter.escalate')"
                        (onClick)="reviewEntity(item.entityType, item.entityId, 'accepted', 'escalated')" />
                    </div>
                  } @else if (item.reviewDecision) {
                    <p-tag [value]="item.reviewDecision" severity="secondary" [rounded]="true" />
                  } @else {
                    <span class="text-muted">—</span>
                  }
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="7" class="text-center" style="padding:32px;color:var(--text-muted)">
                  <i class="pi pi-inbox" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.3"></i>
                  {{ i18n.translate('hitlCenter.noItems') }}
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .hitl-layout { display: flex; flex-direction: column; gap: 20px; }
    .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
    .kpi-card {
      display: flex; align-items: center; gap: 12px; padding: 16px;
      background: var(--surface-card, #fff); border-radius: var(--radius);
      box-shadow: var(--shadow-sm); cursor: pointer; transition: box-shadow 0.2s;
    }
    .kpi-card:hover { box-shadow: var(--shadow-sm); }
    .kpi-meta { display: flex; flex-direction: column; }
    .kpi-value { font-size: var(--font-size-xl); font-weight: var(--font-bold); color: var(--text-heading, var(--text-heading)); }
    .kpi-label { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .filters-row { display: flex; gap: 12px; }
    .entity-id-cell { font-family: monospace; font-size: var(--font-size-sm); }
    .confidence-bar { width: 60px; height: 6px; background: var(--surface-border, var(--border-subtle)); border-radius: var(--radius-xs); display: inline-block; vertical-align: middle; margin-inline-end: 6px; }
    .confidence-fill { height: 100%; border-radius: var(--radius-xs); transition: width 0.6s ease; }
    .confidence-text { font-size: var(--font-size-sm); font-weight: var(--font-bold); }
    .action-btns { display: flex; gap: 2px; }
    .text-muted { color: var(--text-muted, var(--text-muted)); }
    @media (max-width: 768px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class HitlCenterComponent implements OnInit {
  loading = false;
  items: Record<string, any>[] = [];
  dashboard = { totalAiDrafts: 0, totalPendingReview: 0, totalApproved: 0, totalRejected: 0, totalEscalated: 0, byEntityType: {} as GrcRecord };
  totalItems = 0;
  selectedState: string | null = null;
  selectedEntityType: string | null = null;

  stateOptions = [
    { label: 'AI Draft', value: 'ai_draft' },
    { label: 'Pending Review', value: 'pending_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Escalated', value: 'escalated' },
  ];

  entityTypeOptions = [
    { label: 'Policy', value: 'policy' },
    { label: 'Risk', value: 'risk' },
    { label: 'Control', value: 'control' },
    { label: 'Evidence', value: 'evidence' },
    { label: 'Remediation', value: 'remediation' },
    { label: 'Audit Report', value: 'audit_report' },
    { label: 'Workflow Step', value: 'workflow_step' },
  ];

  agentColors: Record<string, string> = {
    A01: '#6366f1', A02: '#8b5cf6', A03: '#ec4899', A04: '#f43f5e', A05: '#f97316',
    A06: '#eab308', A07: 'var(--success)', A08: '#14b8a6', A09: '#06b6d4', A10: '#3b82f6',
  };

  constructor(public i18n: I18nService, private cdr: ChangeDetectorRef, private apiclientSvc: ApiClientService) {}

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading = true;
    this.cdr.markForCheck();

    const params: Record<string, string> = {};
    if (this.selectedState) params.state = this.selectedState;
    if (this.selectedEntityType) params.entityType = this.selectedEntityType;

    const qs = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
    const queueUrl = '/hitl/queue' + (qs ? `?${qs}` : '');

    // Load queue and dashboard in parallel
    this.apiclientSvc.get(queueUrl).subscribe({
      next: (data: any) => {
        this.items = (data?.items || []).map((item: Record<string, any>) => ({
          stateId: item.stateId || item.state_id,
          entityType: item.entityType || item.entity_type,
          entityId: item.entityId || item.entity_id,
          hitlState: item.hitlState || item.hitl_state,
          aiAgentId: item.aiAgentId || item.ai_agent_id,
          confidence: item.confidence != null ? parseFloat(item.confidence) : null,
          lastActorType: item.lastActorType || item.last_actor_type,
          reviewRequired: item.reviewRequired ?? item.review_required ?? false,
          reviewDecision: item.reviewDecision || item.review_decision,
          updatedAt: item.updatedAt || item.updated_at,
        }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.items = []; this.loading = false; this.cdr.markForCheck(); },
    });

    this.apiclientSvc.get('/hitl/dashboard').subscribe({
      next: (data: any) => {
        this.dashboard = (data || this.dashboard) as typeof this.dashboard;
        this.totalItems = this.dashboard.totalAiDrafts + this.dashboard.totalPendingReview +
          this.dashboard.totalApproved + this.dashboard.totalRejected + this.dashboard.totalEscalated;
        this.cdr.markForCheck();
      },
      error: (e: any) => devError("[API]", e),
    });
  }

  filterByState(state: string) {
    this.selectedState = state;
    this.loadData();
  }

  reviewEntity(entityType: string, entityId: string, decision: string, toState?: string) {
    const body: Record<string, any> = { decision };
    if (toState) body.toState = toState;
    this.apiclientSvc.post(`/hitl/${entityType}/${entityId}/review`, body).subscribe({
      next: () => this.loadData(),
      error: () => this.cdr.markForCheck(),
    });
  }

  stateLabel(state: string): string {
    const keyMap: Record<string, string> = {
      human_draft: 'hitlCenter.stateHumanDraft',
      ai_draft: 'hitlCenter.stateAiDraft',
      pending_review: 'hitlCenter.statePendingReview',
      approved: 'hitlCenter.stateApproved',
      rejected: 'hitlCenter.stateRejected',
      escalated: 'hitlCenter.stateEscalated',
    };
    const key = keyMap[state];
    return key ? this.i18n.translate(key) : state;
  }

  stateSeverity(s: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
    if (s === 'approved') return 'success';
    if (s === 'pending_review' || s === 'ai_draft') return 'warning';
    if (s === 'rejected') return 'danger';
    if (s === 'escalated') return 'info';
    return 'secondary';
  }

  confidenceColor(c: number): string {
    if (c >= 0.8) return '#22c55e';
    if (c >= 0.6) return '#f59e0b';
    return '#ef4444';
  }
}
