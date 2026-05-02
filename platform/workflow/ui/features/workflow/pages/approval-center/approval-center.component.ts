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
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcDataTableComponent, GrcFormFieldComponent } from '@app/shared/components';

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
    imports: [CommonModule, AppDatePipe, FormsModule, GrcDataTableComponent, PageHeaderComponent, GrcFormFieldComponent, CardModule, TagModule,
        ButtonModule, DialogModule, InputTextModule, InputTextarea, DropdownModule,
        TableModule, TooltipModule, TabViewModule, SlaTimerPillComponent, ToastModule,
        EmptyStateComponent, SkeletonLoaderComponent],
    providers: [MessageService],
    templateUrl: './approval-center.component.html',
    styleUrls: ['./approval-center.component.scss']
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
      if (['approval', 'policy', 'risk', 'control', 'finding', 'vendor', 'exception', 'workflows'].includes(et)) {
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
    this.http.get<any>(`${this.api}/approval-requests/dashboard${scopeQs}`).subscribe({
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
    this.http.get<any>(`${this.api}/approval-requests${scopeQs}`).subscribe({
      next: (d) => { this.allRequests = d.requests || []; this.displayRequests = this.allRequests; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.allRequests = []; this.displayRequests = []; this.loading = false; this.loadError = true; this.cdr.markForCheck(); },
    });
  }

  loadMyRequests(): void {
    this.loading = true;
    this.loadError = false;
    this.http.get<any>(`${this.api}/approval-requests/my`).subscribe({
      next: (d) => { this.displayRequests = d.requests || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.displayRequests = []; this.loading = false; this.loadError = true; this.cdr.markForCheck(); },
    });
  }

  private loadTeams(): void {
    this.http.get<any>(`${this.api}/teams`).subscribe({
      next: (res) => {
        const teams = res?.teams || (Array.isArray(res) ? res : []);
        this.teamOptions = teams.map((t) => ({ label: t.name_en || t.name || 'Team', value: t.team_id || t.id }));
      },
      error: (e) => devError("[API]", e),
    });
  }

  // --- Actions ---
  acceptRequest(req: ApprovalRequest): void {
    this.http.put<any>(`${this.api}/approval-requests/${req.request_id}/accept`, {}).subscribe({
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
    this.http.put<any>(`${this.api}/approval-requests/${this.decisionTarget.request_id}/${endpoint}`, { comment: this.decisionComment }).subscribe({
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
    this.http.put<any>(`${this.api}/approval-requests/${this.reassignTarget.request_id}/reassign`, {
      assigned_to: this.reassignTo || null, assigned_team_id: this.reassignTeamId || null, comment: this.reassignComment,
    }).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('common.reassigned'), detail: this.i18n.translate('common.requestReassigned') }); this.showReassignDialog = false; this.refresh(); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToReassignRequest') }); },
    });
  }

  escalateRequest(req: ApprovalRequest): void {
    this.http.put<any>(`${this.api}/approval-requests/${req.request_id}/escalate`, { comment: 'SLA escalation' }).subscribe({
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
    this.http.post<any>(`${this.api}/approval-requests`, {
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
