import { Component, OnInit, OnDestroy, inject, computed, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { Subscription } from 'rxjs';
import { WebSocketService } from '@app/websocket';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { TabViewModule } from 'primeng/tabs';
import { SlaTimerPillComponent } from '@app/shared/components/status-indicators/sla-timer-pill.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { environment } from '@env/environment';
import { ScopeSelection } from '@app/shared/layout/workspace-scope-filter.component';
import { devError } from '../../core/utils/dev-logger';

interface ApprovalRequest {
  request_id: string;
  title: string;
  description: string;
  request_type: string;
  entity_type: string;
  entity_id: string;
  status: string;
  priority: string;
  requested_by: string;
  assigned_to: string;
  assigned_team_id: string;
  approved_by: string;
  rejected_by: string;
  decision_comment: string;
  sla_hours: number;
  sla_deadline: string;
  escalation_level: number;
  escalation_chain: string[];
  timeline: TimelineEntry[];
  created_at: string;
  resolved_at: string;
}

interface TimelineEntry {
  action: string;
  actor: string;
  at: string;
  comment?: string;
  level?: number;
  assignedTo?: string;
  teamId?: string;
}

interface ApprovalDashboardSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
  overdue: number;
  avgResolutionHours: number;
}

interface ApprovalTeamBreakdown {
  teamName: string;
  total: number;
  pending: number;
}

interface ApprovalEntityBreakdown {
  type: string;
  count: number;
  pending: number;
}

interface ApprovalDashboard {
  summary: ApprovalDashboardSummary;
  overdueRequests: ApprovalRequest[];
  recentDecisions: ApprovalRequest[];
  byTeam: ApprovalTeamBreakdown[];
  byEntityType: ApprovalEntityBreakdown[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-approval-center',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageHeaderComponent, ModuleTabsBarComponent, CardModule, TagModule,
    ButtonModule, DialogModule, InputTextModule, InputTextarea, DropdownModule,
    TableModule, TooltipModule, TabViewModule, SlaTimerPillComponent, ToastModule,
    EmptyStateComponent, SkeletonLoaderComponent],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="ac-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Approval Center" titleAr="مركز الموافقات"
        subtitleEn="Manage approval requests, escalations, SLA tracking & team workflows"
        subtitleAr="إدارة طلبات الموافقة والتصعيد ومستويات الخدمة"
        icon="check-square"
        [breadcrumbs]="[i18n.translate('approvalCenter.dashboard'), i18n.translate('approvalCenter.approvalCenter')]"
        [actions]="headerActions" [isAr]="isAr()" [dir]="dir()"
        (actionClick)="onHdrAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="isAr()" />
      <div class="ac-body">

      @if (loadError) {
        <div class="ac-error-panel surface-card border-round p-4 text-center">
          <i class="pi pi-exclamation-triangle text-3xl text-orange-500 mb-2" aria-hidden="true"></i>
          <p class="font-semibold text-color-secondary">{{ i18n.translate('Failed to load approval center') }}</p>
          <p class="text-sm text-color-secondary mt-1">{{ i18n.translate('Check connection and try again') }}</p>
          <button pButton [label]="i18n.translate('Retry')" icon="pi pi-refresh" class="p-button-outlined mt-3" (click)="retryLoad()"></button>
        </div>
      } @else if (loading && !dashboard) {
        <app-skeleton-loader variant="list" [count]="6"></app-skeleton-loader>
      } @else {

      <!-- Dashboard KPI Cards -->
      <div class="ac-kpi-grid" *ngIf="dashboard">
        <div class="ac-kpi"><div class="ac-kpi-icon" style="background:var(--blue-50);color:var(--primary)"><i class="pi pi-inbox"></i></div><div class="ac-kpi-body"><div class="ac-kpi-val">{{ dashboard.summary.total }}</div><div class="ac-kpi-label">{{ i18n.translate('approvalCenter.totalRequests') }}</div></div></div>
        <div class="ac-kpi"><div class="ac-kpi-icon" style="background:var(--status-warning-bg, var(--blue-50));color:var(--severity-high)"><i class="pi pi-hourglass"></i></div><div class="ac-kpi-body"><div class="ac-kpi-val">{{ dashboard.summary.pending }}</div><div class="ac-kpi-label">{{ i18n.translate('approvalCenter.pending') }}</div></div></div>
        <div class="ac-kpi"><div class="ac-kpi-icon" style="background:var(--blue-50);color:var(--success)"><i class="pi pi-check-circle"></i></div><div class="ac-kpi-body"><div class="ac-kpi-val">{{ dashboard.summary.approved }}</div><div class="ac-kpi-label">{{ i18n.translate('approvalCenter.approved') }}</div></div></div>
        <div class="ac-kpi"><div class="ac-kpi-icon" style="background:var(--blue-50);color:var(--error)"><i class="pi pi-times-circle"></i></div><div class="ac-kpi-body"><div class="ac-kpi-val">{{ dashboard.summary.rejected }}</div><div class="ac-kpi-label">{{ i18n.translate('approvalCenter.rejected') }}</div></div></div>
        <div class="ac-kpi"><div class="ac-kpi-icon" style="background:var(--status-danger-bg, var(--blue-50));color:var(--severity-critical)"><i class="pi pi-arrow-up"></i></div><div class="ac-kpi-body"><div class="ac-kpi-val">{{ dashboard.summary.escalated }}</div><div class="ac-kpi-label">{{ i18n.translate('approvalCenter.escalated') }}</div></div></div>
        <div class="ac-kpi"><div class="ac-kpi-icon" style="background:var(--status-danger-bg, var(--blue-50));color:var(--error)"><i class="pi pi-clock"></i></div><div class="ac-kpi-body"><div class="ac-kpi-val">{{ dashboard.summary.overdue }}</div><div class="ac-kpi-label">{{ i18n.translate('approvalCenter.slaBreached') }}</div></div></div>
        <div class="ac-kpi ac-kpi-wide"><div class="ac-kpi-icon" style="background:var(--status-info-bg, var(--blue-50));color:var(--severity-info)"><i class="pi pi-stopwatch"></i></div><div class="ac-kpi-body"><div class="ac-kpi-val">{{ dashboard.summary.avgResolutionHours }}h</div><div class="ac-kpi-label">{{ i18n.translate('approvalCenter.avgResolution') }}</div></div></div>
      </div>

      <!-- Toolbar -->
      <div class="ac-toolbar">
        <div class="ac-tabs">
          <button class="ac-tab" [class.active]="activeTab === 'all'" (click)="activeTab = 'all'; loadRequests()">{{ i18n.translate('approvalCenter.tabAll') }}</button>
          <button class="ac-tab" [class.active]="activeTab === 'my'" (click)="activeTab = 'my'; loadMyRequests()">{{ i18n.translate('approvalCenter.tabMyQueue') }}</button>
          <button class="ac-tab" [class.active]="activeTab === 'overdue'" (click)="activeTab = 'overdue'">{{ i18n.translate('approvalCenter.tabOverdue') }}</button>
          <button class="ac-tab" [class.active]="activeTab === 'recent'" (click)="activeTab = 'recent'">{{ i18n.translate('approvalCenter.tabRecentDecisions') }}</button>
        </div>
        <button class="ac-create-btn" (click)="openCreateDialog()"><i class="pi pi-plus"></i> {{ i18n.translate('approvalCenter.newRequest') }}</button>
      </div>

      <!-- Request Cards -->
      <div class="ac-request-list" *ngIf="(activeTab === 'all' || activeTab === 'my') && !loading">
        <div *ngFor="let req of displayRequests" class="ac-request-card" [class.ac-overdue]="isSLABreached(req)" [class.ac-escalated]="req.status === 'escalated'">
          <div class="ac-req-top">
            <div class="ac-req-title-row">
              <span class="ac-req-title">{{ req.title }}</span>
              <p-tag [value]="req.status" [severity]="statusSeverity(req.status)" />
              <p-tag *ngIf="req.priority" [value]="req.priority" [severity]="prioritySeverity(req.priority)" styleClass="ml-1" />
            </div>
            <div class="ac-req-meta">
              <span *ngIf="req.entity_type"><i class="pi pi-link"></i> {{ req.entity_type }}</span>
              <span *ngIf="req.requested_by"><i class="pi pi-user"></i> {{ req.requested_by }}</span>
              <span *ngIf="req.assigned_to"><i class="pi pi-arrow-right"></i> {{ req.assigned_to }}</span>
              <span class="ac-sla" [class.ac-sla-breached]="isSLABreached(req)" *ngIf="req.sla_deadline">
                <i class="pi pi-clock"></i> Due: {{ req.sla_deadline | appDate:'short' }}
                <ng-container *ngIf="req.status === 'pending' || req.status === 'assigned'">
                  <app-sla-timer-pill [dueDate]="req.sla_deadline" [slaHours]="req.sla_hours || 24" [status]="req.status" class="ac-sla-pill" />
                </ng-container>
              </span>
              <span *ngIf="req.escalation_level > 0" class="ac-escalation-badge">L{{ req.escalation_level }}</span>
            </div>
          </div>

          <!-- Visual Timeline -->
          <div class="ac-timeline" *ngIf="req.timeline && req.timeline.length > 0">
            <div *ngFor="let ev of req.timeline; let last = last" class="ac-tl-item">
              <div class="ac-tl-dot" [ngClass]="'ac-tl-' + ev.action"></div>
              <div class="ac-tl-line" *ngIf="!last"></div>
              <div class="ac-tl-content">
                <span class="ac-tl-action">{{ formatAction(ev.action) }}</span>
                <span class="ac-tl-actor">{{ ev.actor }}</span>
                <span class="ac-tl-time">{{ ev.at | appDate:'short' }}</span>
                <span class="ac-tl-comment" *ngIf="ev.comment">{{ ev.comment }}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="ac-actions" *ngIf="req.status === 'pending' || req.status === 'escalated'">
            <button class="ac-act-btn ac-act-accept" (click)="acceptRequest(req)" [pTooltip]="i18n.translate('approvalCenter.claimRequest')"><i class="pi pi-thumbs-up"></i> {{ i18n.translate('approvalCenter.accept') }}</button>
            <button class="ac-act-btn ac-act-approve" (click)="openDecisionDialog(req, 'approve')"><i class="pi pi-check"></i> {{ i18n.translate('approvalCenter.approve') }}</button>
            <button class="ac-act-btn ac-act-reject" (click)="openDecisionDialog(req, 'reject')"><i class="pi pi-times"></i> {{ i18n.translate('approvalCenter.reject') }}</button>
            <button class="ac-act-btn ac-act-reassign" (click)="openReassignDialog(req)"><i class="pi pi-reply"></i> {{ i18n.translate('approvalCenter.reassign') }}</button>
            <button class="ac-act-btn ac-act-escalate" (click)="escalateRequest(req)"><i class="pi pi-arrow-up"></i> {{ i18n.translate('approvalCenter.escalate') }}</button>
          </div>
        </div>
        <app-empty-state
          *ngIf="displayRequests.length === 0 && !loading"
          [title]="i18n.currentLang()==='ar' ? 'لا توجد طلبات موافقة' : 'No approval requests'"
          [description]="i18n.currentLang()==='ar' ? 'ستظهر الطلبات عند إنشائها أو عند تعيينها لك. جرّب إنشاء طلب جديد أو تحقق من Process Tasks.' : 'Requests will appear when created or assigned to you. Try creating a new request or check Process Tasks.'"
          [actionLabel]="i18n.currentLang()==='ar' ? 'إنشاء طلب' : 'New request'"
          (action)="openCreateDialog()">
        </app-empty-state>
      </div>
      <div class="ac-request-list" *ngIf="(activeTab === 'all' || activeTab === 'my') && loading">
        <app-skeleton-loader variant="list" [count]="4"></app-skeleton-loader>
      </div>

      <!-- Overdue Table -->
      <div *ngIf="activeTab === 'overdue' && dashboard">
        <p-table [attr.aria-label]="i18n.translate('approvalCenter.ariaOverdueTable')" [value]="dashboard.overdueRequests || []" styleClass="p-datatable-sm p-datatable-striped" [paginator]="true" [rows]="15" [rowsPerPageOptions]="[10,15,25,50]">
          <ng-template pTemplate="header"><tr><th>{{ i18n.translate('approvalCenter.colTitle') }}</th><th>{{ i18n.translate('approvalCenter.colType') }}</th><th>{{ i18n.translate('approvalCenter.colAssignedTo') }}</th><th>{{ i18n.translate('approvalCenter.colSlaDeadline') }}</th><th>{{ i18n.translate('approvalCenter.colEscalation') }}</th><th>{{ i18n.translate('approvalCenter.colCreated') }}</th></tr></ng-template>
          <ng-template pTemplate="body" let-r>
            <tr class="ac-row-overdue">
              <td><strong>{{ r.title }}</strong></td>
              <td><p-tag [value]="r.entity_type || 'general'" severity="info" /></td>
              <td>{{ r.assigned_to }}</td>
              <td class="ac-sla-breached">{{ r.sla_deadline | appDate:'short' }}</td>
              <td><span class="ac-escalation-badge" *ngIf="r.escalation_level > 0">L{{ r.escalation_level }}</span></td>
              <td>{{ r.created_at | appDate:'medium' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="ac-empty-cell">{{ i18n.translate('approvalCenter.noOverdueRequests') }}</td></tr></ng-template>
        </p-table>
      </div>

      <!-- Recent Decisions Table -->
      <div *ngIf="activeTab === 'recent' && dashboard">
        <p-table [attr.aria-label]="i18n.translate('approvalCenter.ariaRecentDecisionsTable')" [value]="dashboard.recentDecisions || []" styleClass="p-datatable-sm p-datatable-striped" [paginator]="true" [rows]="15" [rowsPerPageOptions]="[10,15,25,50]">
          <ng-template pTemplate="header"><tr><th>{{ i18n.translate('approvalCenter.colTitle') }}</th><th>{{ i18n.translate('approvalCenter.colDecision') }}</th><th>{{ i18n.translate('approvalCenter.colType') }}</th><th>{{ i18n.translate('approvalCenter.colDecidedBy') }}</th><th>{{ i18n.translate('approvalCenter.colComment') }}</th><th>{{ i18n.translate('approvalCenter.colResolved') }}</th></tr></ng-template>
          <ng-template pTemplate="body" let-r>
            <tr>
              <td><strong>{{ r.title }}</strong></td>
              <td><p-tag [value]="r.status" [severity]="r.status === 'approved' ? 'success' : 'danger'" /></td>
              <td>{{ r.entity_type || '-' }}</td>
              <td>{{ r.approved_by || r.rejected_by }}</td>
              <td class="ac-comment-cell">{{ r.decision_comment || '-' }}</td>
              <td>{{ r.resolved_at | appDate:'short' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="ac-empty-cell">{{ i18n.translate('approvalCenter.noRecentDecisions') }}</td></tr></ng-template>
        </p-table>
      </div>

      <!-- Team Breakdown -->
      <div class="ac-team-section" *ngIf="dashboard?.byTeam?.length">
        <h4 class="ac-section-title"><i class="pi pi-users"></i> {{ i18n.translate('approvalCenter.approvalsByTeam') }}</h4>
        <div class="ac-team-grid">
          <div *ngFor="let t of dashboard!.byTeam" class="ac-team-card">
            <div class="ac-team-name">{{ t.teamName }}</div>
            <div class="ac-team-stats">
              <span>{{ i18n.translate('approvalCenter.total') }}: <strong>{{ t.total }}</strong></span>
              <span class="ac-team-pending" *ngIf="t.pending > 0">{{ i18n.translate('approvalCenter.pending') }}: <strong>{{ t.pending }}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Entity Type Breakdown -->
      <div class="ac-entity-section" *ngIf="dashboard?.byEntityType?.length">
        <h4 class="ac-section-title"><i class="pi pi-th-large"></i> {{ i18n.translate('approvalCenter.byEntityType') }}</h4>
        <div class="ac-entity-grid">
          <div *ngFor="let e of dashboard!.byEntityType" class="ac-entity-card">
            <span class="ac-entity-type">{{ formatLabel(e.type) }}</span>
            <span class="ac-entity-count">{{ e.count }}</span>
            <span class="ac-entity-pending" *ngIf="e.pending > 0">{{ e.pending }} {{ i18n.translate('approvalCenter.pending') }}</span>
          </div>
        </div>
      </div>

      <!-- Create Request Dialog -->
      <p-dialog [header]="i18n.translate('approvalCenter.newApprovalRequest')" [(visible)]="showCreateDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="ac-dialog-form">
          <label>{{ i18n.translate('approvalCenter.labelTitle') }} *</label>
          <input pInputText [(ngModel)]="createForm.title" class="w-full" [placeholder]="i18n.translate('approvalCenter.placeholderRequestTitle')" [attr.aria-label]="i18n.translate('approvalCenter.placeholderRequestTitle')" />
          <label>{{ i18n.translate('approvalCenter.labelDescription') }}</label>
          <textarea pInputTextarea [(ngModel)]="createForm.description" [rows]="3" class="w-full"></textarea>
          <div class="ac-form-row">
            <div class="ac-form-col">
              <label>{{ i18n.translate('approvalCenter.labelEntityType') }}</label>
              <p-dropdown [options]="entityTypeOpts" [(ngModel)]="createForm.entity_type" optionLabel="label" optionValue="value" [placeholder]="i18n.translate('approvalCenter.placeholderSelect')" class="w-full" />
            </div>
            <div class="ac-form-col">
              <label>{{ i18n.translate('approvalCenter.labelPriority') }}</label>
              <p-dropdown [options]="priorityOpts" [(ngModel)]="createForm.priority" optionLabel="label" optionValue="value" class="w-full" />
            </div>
          </div>
          <div class="ac-form-row">
            <div class="ac-form-col">
              <label>{{ i18n.translate('approvalCenter.labelAssignToEmail') }}</label>
              <input pInputText [(ngModel)]="createForm.assigned_to" class="w-full" [placeholder]="i18n.translate('approvalCenter.placeholderEmail')" [attr.aria-label]="i18n.translate('approvalCenter.placeholderEmail')" />
            </div>
            <div class="ac-form-col">
              <label>{{ i18n.translate('approvalCenter.labelAssignToTeam') }}</label>
              <p-dropdown [options]="teamOptions" [(ngModel)]="createForm.assigned_team_id" optionLabel="label" optionValue="value" [showClear]="true" [placeholder]="i18n.translate('approvalCenter.placeholderSelectTeam')" class="w-full" />
            </div>
          </div>
          <div class="ac-form-row">
            <div class="ac-form-col">
              <label>{{ i18n.translate('approvalCenter.labelSlaHours') }}</label>
              <input pInputText [(ngModel)]="createForm.sla_hours" type="number" class="w-full" />
            </div>
            <div class="ac-form-col">
              <label>{{ i18n.translate('approvalCenter.labelEscalationChain') }}</label>
              <input pInputText [(ngModel)]="createForm.escalation_chain_str" class="w-full" [placeholder]="i18n.translate('approvalCenter.placeholderEscalationChain')" [attr.aria-label]="i18n.translate('approvalCenter.placeholderEscalationChain')" />
            </div>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" (onClick)="showCreateDialog = false" />
          <p-button [label]="i18n.translate('approvalCenter.createRequest')" icon="pi pi-check" (onClick)="submitCreate()" [disabled]="!createForm.title" />
        </ng-template>
      </p-dialog>

      <!-- Decision Dialog (Approve/Reject) -->
      <p-dialog [header]="decisionAction === 'approve' ? i18n.translate('approvalCenter.approveRequest') : i18n.translate('approvalCenter.rejectRequest')" [(visible)]="showDecisionDialog" [modal]="true" [style]="{width:'440px'}">
        <div class="ac-dialog-form" *ngIf="decisionTarget">
          <p><strong>{{ decisionTarget.title }}</strong></p>
          <label>{{ i18n.translate('approvalCenter.labelComment') }}</label>
          <textarea pInputTextarea [(ngModel)]="decisionComment" [rows]="3" class="w-full" [placeholder]="decisionAction === 'approve' ? i18n.translate('approvalCenter.placeholderApprovalNotes') : i18n.translate('approvalCenter.placeholderRejectionReason')" [attr.aria-label]="decisionAction === 'approve' ? i18n.translate('approvalCenter.placeholderApprovalNotes') : i18n.translate('approvalCenter.placeholderRejectionReason')"></textarea>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" (onClick)="showDecisionDialog = false" />
          <p-button [label]="decisionAction === 'approve' ? i18n.translate('approvalCenter.approve') : i18n.translate('approvalCenter.reject')"
                    [icon]="decisionAction === 'approve' ? 'pi pi-check' : 'pi pi-times'"
                    [severity]="decisionAction === 'approve' ? 'success' : 'danger'"
                    (onClick)="submitDecision()" />
        </ng-template>
      </p-dialog>

      <!-- Reassign Dialog -->
      <p-dialog [header]="i18n.translate('approvalCenter.reassignRequest')" [(visible)]="showReassignDialog" [modal]="true" [style]="{width:'440px'}">
        <div class="ac-dialog-form" *ngIf="reassignTarget">
          <p><strong>{{ reassignTarget.title }}</strong></p>
          <label>{{ i18n.translate('approvalCenter.labelReassignToEmail') }}</label>
          <input pInputText [(ngModel)]="reassignTo" class="w-full" [placeholder]="i18n.translate('approvalCenter.placeholderEmail')" [attr.aria-label]="i18n.translate('approvalCenter.placeholderEmail')" />
          <label>{{ i18n.translate('approvalCenter.labelReassignToTeam') }}</label>
          <p-dropdown [options]="teamOptions" [(ngModel)]="reassignTeamId" optionLabel="label" optionValue="value" [showClear]="true" [placeholder]="i18n.translate('approvalCenter.placeholderSelectTeam')" class="w-full" />
          <label>{{ i18n.translate('approvalCenter.labelComment') }}</label>
          <textarea pInputTextarea [(ngModel)]="reassignComment" [rows]="2" class="w-full"></textarea>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" (onClick)="showReassignDialog = false" />
          <p-button [label]="i18n.translate('approvalCenter.reassign')" icon="pi pi-reply" (onClick)="submitReassign()" [disabled]="!reassignTo && !reassignTeamId" />
        </ng-template>
      </p-dialog>

      }
      </div>
    </div>
  `,
  styles: [`
    .ac-page { display: flex; flex-direction: column; height: 100%; }
    .ac-body { flex: 1; padding: var(--space-lg, 20px); overflow-y: auto; }
    .ac-kpi-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin-bottom: 16px; }
    .ac-kpi {
      display: flex; align-items: center; gap: 10px; padding: 12px;
      background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border-subtle);
    }
    .ac-kpi-wide { grid-column: span 1; }
    .ac-kpi-icon { width: 36px; height: 36px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-base); flex-shrink: 0; }
    .ac-kpi-val { font-size: var(--font-size-xl); font-weight: var(--font-black); color: var(--text-heading); line-height: 1; }
    .ac-kpi-label { font-size: var(--font-size-xs); font-weight: var(--font-medium); color: var(--text-muted); text-transform: uppercase; margin-top: 2px; }

    .ac-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .ac-tabs { display: flex; gap: 4px; }
    .ac-tab {
      padding: 6px 14px; font-size: var(--font-size-sm); font-weight: var(--font-medium); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm); background: var(--surface); color: var(--text-muted); cursor: pointer; transition: all 150ms;
    }
    .ac-tab.active { background: var(--primary); color: white; border-color: var(--primary); }
    .ac-tab:hover:not(.active) { border-color: var(--primary); color: var(--primary-dark); }
    .ac-create-btn {
      display: flex; align-items: center; gap: 6px; padding: 8px 16px;
      background: var(--primary); color: white; border: none; border-radius: var(--radius-sm);
      font-size: var(--font-size-sm); font-weight: var(--font-medium); cursor: pointer; transition: all 150ms;
    }
    .ac-create-btn:hover { background: var(--primary-dark); }

    .ac-request-list { display: flex; flex-direction: column; gap: 12px; }
    .ac-request-card {
      padding: 16px; background: var(--surface); border-radius: var(--radius);
      border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card); transition: all 200ms;
    }
    .ac-request-card:hover { box-shadow: var(--shadow-card-hover); }
    .ac-overdue { border-inline-start: 4px solid var(--error); }
    .ac-escalated { border-inline-start: 4px solid var(--warning); }

    .ac-req-top { margin-bottom: 10px; }
    .ac-req-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
    .ac-req-title { font-size: var(--font-size-base); font-weight: var(--font-bold); color: var(--text-heading); }
    .ac-req-meta { display: flex; gap: 12px; font-size: var(--font-size-xs); color: var(--text-muted); flex-wrap: wrap; }
    .ac-req-meta span { display: flex; align-items: center; gap: 3px; }
    .ac-sla { font-weight: var(--font-medium); display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .ac-sla-pill { margin-inline-start: 4px; }
    .ac-sla-breached { color: var(--error); font-weight: var(--font-bold); }
    .ac-escalation-badge {
      background: rgba(245,158,11,var(--opacity-hover)); color: var(--severity-high); font-size: var(--font-size-xs); font-weight: var(--font-bold);
      padding: 1px 6px; border-radius: var(--radius-pill);
    }

    /* Visual Timeline */
    .ac-timeline { display: flex; flex-direction: column; gap: 0; margin: 10px 0 10px 8px; }
    .ac-tl-item { display: flex; align-items: flex-start; gap: 10px; position: relative; min-height: 32px; }
    .ac-tl-dot {
      width: 12px; height: 12px; border-radius: var(--radius-pill); flex-shrink: 0; margin-top: 2px; border: 2px solid white; box-shadow: 0 0 0 1px var(--border-subtle);
    }
    .ac-tl-created { background: var(--primary); }
    .ac-tl-accepted { background: var(--secondary, var(--hub-evidence)); }
    .ac-tl-approved { background: var(--success); }
    .ac-tl-rejected { background: var(--error); }
    .ac-tl-escalated { background: var(--warning); }
    .ac-tl-reassigned { background: var(--primary); }
    .ac-tl-line {
      position: absolute; left: 5px; top: 14px; width: 2px; height: calc(100% - 2px);
      background: var(--border-subtle);
    }
    .ac-tl-content { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: var(--font-size-xs); }
    .ac-tl-action { font-weight: var(--font-bold); color: var(--text-heading); text-transform: capitalize; }
    .ac-tl-actor { color: var(--primary-dark); font-weight: var(--font-medium); }
    .ac-tl-time { color: var(--text-muted); }
    .ac-tl-comment { flex-basis: 100%; color: var(--text-muted); font-style: italic; font-size: var(--font-size-xs); }

    /* Action Buttons */
    .ac-actions { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
    .ac-act-btn {
      display: flex; align-items: center; gap: 4px; padding: 5px 12px;
      border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);
      background: var(--surface); font-size: var(--font-size-xs); font-weight: var(--font-medium); cursor: pointer; transition: all 150ms;
    }
    .ac-act-accept { border-color: rgba(var(--module-accent-violet-rgb), 0.25); color: var(--role-executive); }
    .ac-act-accept:hover { background: var(--surface-lavender); }
    .ac-act-approve { border-color: rgba(var(--module-accent-green-rgb), 0.25); color: var(--success); }
    .ac-act-approve:hover { background: rgba(var(--module-accent-green-rgb), 0.06); }
    .ac-act-reject { border-color: rgba(var(--module-accent-red-rgb), 0.25); color: var(--error); }
    .ac-act-reject:hover { background: rgba(var(--module-accent-red-rgb), 0.06); }
    .ac-act-reassign { border-color: rgba(var(--module-accent-indigo-rgb), 0.25); color: var(--info); }
    .ac-act-reassign:hover { background: rgba(var(--module-accent-indigo-rgb), 0.06); }
    .ac-act-escalate { border-color: rgba(var(--module-accent-amber-rgb), 0.3); color: var(--severity-high); }
    .ac-act-escalate:hover { background: var(--surface-amber); }

    .ac-section-title { font-size: var(--font-size-base); font-weight: var(--font-bold); color: var(--text-heading); display: flex; align-items: center; gap: 6px; margin: 20px 0 10px; }
    .ac-section-title .pi { color: var(--primary); }

    .ac-team-section, .ac-entity-section { margin-top: 16px; }
    .ac-team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    .ac-team-card {
      padding: 12px; background: var(--surface); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }
    .ac-team-name { font-size: var(--font-size-sm); font-weight: var(--font-bold); color: var(--text-heading); margin-bottom: 4px; }
    .ac-team-stats { font-size: var(--font-size-xs); color: var(--text-muted); display: flex; gap: 10px; }
    .ac-team-pending { color: var(--warning); font-weight: var(--font-medium); }

    .ac-entity-grid { display: flex; gap: 10px; flex-wrap: wrap; }
    .ac-entity-card {
      display: flex; align-items: center; gap: 8px; padding: 8px 14px;
      background: var(--surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);
    }
    .ac-entity-type { font-size: var(--font-size-sm); font-weight: var(--font-medium); color: var(--text-heading); text-transform: capitalize; }
    .ac-entity-count { font-size: var(--font-size-md); font-weight: var(--font-black); color: var(--primary); }
    .ac-entity-pending { font-size: var(--font-size-xs); color: var(--warning); font-weight: var(--font-medium); }

    .ac-empty { text-align: center; padding: 40px; color: var(--text-muted); }
    .ac-empty-cell { text-align: center; color: var(--text-muted); padding: 20px; }
    .ac-row-overdue td { background: rgba(var(--module-accent-red-rgb), 0.06); }
    .ac-comment-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .ac-dialog-form { display: flex; flex-direction: column; gap: 10px; }
    .ac-dialog-form label { font-size: var(--font-size-sm); font-weight: var(--font-medium); color: var(--text-muted); margin-bottom: -4px; }
    .ac-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .ac-form-col { display: flex; flex-direction: column; gap: 6px; }
    .ac-form-col label { font-size: var(--font-size-sm); font-weight: var(--font-medium); color: var(--text-muted); }
    .w-full { width: 100%; }

    @media (max-width: 1200px) { .ac-kpi-grid { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 768px) { .ac-kpi-grid { grid-template-columns: repeat(2, 1fr); } .ac-form-row { grid-template-columns: 1fr; } .ac-toolbar { flex-direction: column; gap: 8px; } }
  `],
})
export class ApprovalCenterComponent implements OnInit, OnDestroy {
  private wsService = inject(WebSocketService);
  private cdr = inject(ChangeDetectorRef);
  private msg = inject(MessageService);
  private wsSub?: Subscription;
  loading = true;
  loadError = false;

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed(() => this.isAr() ? 'rtl' : 'ltr');

  headerActions: PageHeaderAction[] = [
    { id: 'create', labelEn: 'New Request', labelAr: 'طلب جديد', icon: 'plus' },
  ];

  readonly tabs = [
    { id: 'approvals', labelEn: 'Approvals', labelAr: 'الموافقات', route: '/approval-center', icon: 'check-square' },
    { id: 'workflows', labelEn: 'Workflows', labelAr: 'سير العمل', route: '/workflows', icon: 'sitemap' },
    { id: 'governance', labelEn: 'Governance', labelAr: 'الحوكمة', route: '/governance', icon: 'file' },
  ];

  onHdrAction(id: string): void {
    if (id === 'create') this.openCreateDialog();
  }
  activeTab = 'all';
  dashboard: ApprovalDashboard | null = null;
  allRequests: ApprovalRequest[] = [];
  displayRequests: ApprovalRequest[] = [];
  private api = environment.apiUrl;
  private scopeIds: string[] = [];

  // Create
  showCreateDialog = false;
  createForm: { title: string; description: string; entity_type: string; priority: string; assigned_to: string; assigned_team_id: string | null; sla_hours: number; escalation_chain_str: string } = { title: '', description: '', entity_type: '', priority: 'medium', assigned_to: '', assigned_team_id: null, sla_hours: 24, escalation_chain_str: '' };

  // Decision
  showDecisionDialog = false;
  decisionTarget: ApprovalRequest | null = null;
  decisionAction: 'approve' | 'reject' = 'approve';
  decisionComment = '';

  // Reassign
  showReassignDialog = false;
  reassignTarget: ApprovalRequest | null = null;
  reassignTo = '';
  reassignTeamId: string | null = null;
  reassignComment = '';

  // Options
  teamOptions: { label: string; value: string }[] = [];
  /** Entity type options with i18n-reactive labels */
  get entityTypeOpts() {
    return [
      { label: this.i18n.translate('approvalCenter.entityPolicy'), value: 'policy' },
      { label: this.i18n.translate('approvalCenter.entityRisk'), value: 'risk' },
      { label: this.i18n.translate('approvalCenter.entityControl'), value: 'control' },
      { label: this.i18n.translate('approvalCenter.entityFinding'), value: 'finding' },
      { label: this.i18n.translate('approvalCenter.entityVendor'), value: 'vendor' },
      { label: this.i18n.translate('approvalCenter.entityException'), value: 'exception' },
      { label: this.i18n.translate('approvalCenter.entityChangeRequest'), value: 'change_request' },
      { label: this.i18n.translate('approvalCenter.entityGeneral'), value: 'general' },
    ];
  }
  /** Priority options with i18n-reactive labels */
  get priorityOpts() {
    return [
      { label: this.i18n.translate('approvalCenter.priorityCritical'), value: 'critical' },
      { label: this.i18n.translate('approvalCenter.priorityHigh'), value: 'high' },
      { label: this.i18n.translate('approvalCenter.priorityMedium'), value: 'medium' },
      { label: this.i18n.translate('approvalCenter.priorityLow'), value: 'low' },
    ];
  }

  private live = inject(GrcLiveService);
  private liveSub: Subscription | null = null;

  constructor(public i18n: I18nService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadRequests();
    this.loadTeams();
    this.wsSub = this.wsService.dataUpdates$.subscribe(e => {
      const et = (e as any).data?.entityType || (e as any).data?.module || '';
      if (['approval', 'policy', 'risk', 'control', 'finding', 'vendor', 'exception', 'workflows'].includes(et as string)) {
        this.loadDashboard();
        this.loadRequests();
      }
    });
    this.liveSub = this.live.debounced(600).subscribe(() => {
      this.loadDashboard();
      if (this.activeTab === 'my') this.loadMyRequests();
      else this.loadRequests();
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.liveSub?.unsubscribe();
  }

  retryLoad(): void {
    this.loadError = false;
    this.loadDashboard();
    if (this.activeTab === 'my') this.loadMyRequests();
    else this.loadRequests();
    this.cdr.markForCheck();
  }

  onScopeChange(selection: ScopeSelection): void {
    this.scopeIds = Object.values(selection).flat();
    this.loadDashboard();
    this.loadRequests();
  }

  private loadDashboard(): void {
    const scopeQs = this.scopeIds.length ? '?' + this.scopeIds.map(s => `scopeIds=${s}`).join('&') : '';
    this.http.get<unknown>(`${this.api}/approval-requests/dashboard${scopeQs}`).subscribe({
      next: (d) => {
        this.dashboard = {
          summary: {
            total: d?.total ?? 0,
            pending: d?.pending ?? 0,
            approved: d?.approved ?? 0,
            rejected: d?.rejected ?? 0,
            escalated: d?.escalated ?? 0,
            overdue: d?.overdue ?? 0,
            avgResolutionHours: d?.avgResolutionHours ?? 0,
          },
          overdueRequests: d?.overdueRequests ?? [],
          recentDecisions: d?.recentDecisions ?? [],
          byTeam: d?.byTeam ?? [],
          byEntityType: d?.byEntityType ?? [],
        };
        this.loadError = false;
        this.cdr.markForCheck();
      },
      error: (e) => { this.loadError = true; devError("[API]", e); this.cdr.markForCheck(); },
    });
  }

  loadRequests(): void {
    this.loading = true;
    this.loadError = false;
    const scopeQs = this.scopeIds.length ? '?' + this.scopeIds.map(s => `scopeIds=${s}`).join('&') : '';
    this.http.get<unknown>(`${this.api}/approval-requests${scopeQs}`).subscribe({
      next: (d) => { this.allRequests = d.requests || []; this.displayRequests = this.allRequests; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.allRequests = []; this.displayRequests = []; this.loading = false; this.loadError = true; this.cdr.markForCheck(); },
    });
  }

  loadMyRequests(): void {
    this.loading = true;
    this.loadError = false;
    this.http.get<unknown>(`${this.api}/approval-requests/my`).subscribe({
      next: (d) => { this.displayRequests = d.requests || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.displayRequests = []; this.loading = false; this.loadError = true; this.cdr.markForCheck(); },
    });
  }

  private loadTeams(): void {
    this.http.get<unknown>(`${this.api}/teams`).subscribe({
      next: (res) => {
        const teams = res?.teams || (Array.isArray(res) ? res : []);
        this.teamOptions = teams.map((t) => ({ label: t.name_en || t.name || 'Team', value: t.team_id || t.id }));
      },
      error: (e) => devError("[API]", e),
    });
  }

  // --- Actions ---
  acceptRequest(req: ApprovalRequest): void {
    this.http.put<unknown>(`${this.api}/approval-requests/${req.request_id}/accept`, {}).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('common.claimed'), detail: this.i18n.translate('common.requestClaimed') }); this.refresh(); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToClaimRequest') }); },
    });
  }

  openDecisionDialog(req: ApprovalRequest, action: 'approve' | 'reject'): void {
    this.decisionTarget = req;
    this.decisionAction = action;
    this.decisionComment = '';
    this.showDecisionDialog = true;
  }

  submitDecision(): void {
    if (!this.decisionTarget) return;
    const endpoint = this.decisionAction === 'approve' ? 'approve' : 'reject';
    this.http.put<unknown>(`${this.api}/approval-requests/${this.decisionTarget.request_id}/${endpoint}`, { comment: this.decisionComment }).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: this.decisionAction === 'approve' ? 'Approved' : 'Rejected', detail: this.decisionAction === 'approve' ? 'Request approved' : 'Request rejected' });
        this.showDecisionDialog = false;
        this.refresh();
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: `Failed to ${this.decisionAction} request` }); },
    });
  }

  openReassignDialog(req: ApprovalRequest): void {
    this.reassignTarget = req;
    this.reassignTo = '';
    this.reassignTeamId = null;
    this.reassignComment = '';
    this.showReassignDialog = true;
  }

  submitReassign(): void {
    if (!this.reassignTarget) return;
    this.http.put<unknown>(`${this.api}/approval-requests/${this.reassignTarget.request_id}/reassign`, {
      assigned_to: this.reassignTo || null, assigned_team_id: this.reassignTeamId || null, comment: this.reassignComment,
    }).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('common.reassigned'), detail: this.i18n.translate('common.requestReassigned') }); this.showReassignDialog = false; this.refresh(); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToReassignRequest') }); },
    });
  }

  escalateRequest(req: ApprovalRequest): void {
    this.http.put<unknown>(`${this.api}/approval-requests/${req.request_id}/escalate`, { comment: 'SLA escalation' }).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('common.escalated'), detail: this.i18n.translate('common.requestEscalated') }); this.refresh(); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToEscalateRequest') }); },
    });
  }

  openCreateDialog(): void {
    this.createForm = { title: '', description: '', entity_type: '', priority: 'medium', assigned_to: '', assigned_team_id: null, sla_hours: 24, escalation_chain_str: '' };
    this.showCreateDialog = true;
  }

  submitCreate(): void {
    const chain = this.createForm.escalation_chain_str
      ? this.createForm.escalation_chain_str.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    this.http.post<unknown>(`${this.api}/approval-requests`, {
      ...this.createForm,
      escalation_chain: chain,
    }).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('common.created'), detail: this.i18n.translate('common.approvalRequestCreated') }); this.showCreateDialog = false; this.refresh(); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToCreateRequest') }); },
    });
  }

  private refresh(): void {
    this.loadDashboard();
    if (this.activeTab === 'my') this.loadMyRequests();
    else this.loadRequests();
  }

  // --- Helpers ---
  isSLABreached(req: ApprovalRequest): boolean {
    if (!req.sla_deadline) return false;
    return new Date(req.sla_deadline) < new Date() && ['pending', 'escalated'].includes(req.status);
  }

  statusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'escalated': return 'warning';
      case 'pending': return 'info';
      default: return 'secondary';
    }
  }

  prioritySeverity(priority: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    switch (priority) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'secondary';
    }
  }

  formatAction(action: string): string {
    return action.replace(/_/g, ' ');
  }

  formatLabel(val: string): string {
    if (!val) return '-';
    return val.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

}
