import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { RISK_PRIMARY_TABS } from '@app/features/risk/risk.constants';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { BadgeModule } from 'primeng/badge';
import { TabsModule } from 'primeng/tabs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AcceptanceQueueItemDto } from '@app/features/risk/pages/risk-workspace/risk-workspace.models';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/shared/components/forms-inputs/grc-form-field.component';

type ViewTab = 'queue' | 'history';
type WorkflowStep = 'requested' | 'under_review' | 'decision';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-acceptance-page',
    imports: [
        CommonModule, FormsModule, PageShellComponent, ModuleTabsBarComponent, StatusBadgeComponent, ExportButtonComponent,
        GrcDataTableComponent, GrcFormFieldComponent,
        TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, TextareaModule,
        SelectModule, TooltipModule, ToastModule, ConfirmDialogModule, BadgeModule, TabsModule, AppDatePipe,
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './risk-acceptance.component.html',
    styleUrls: ['./risk-acceptance.component.scss']
})
export class RiskAcceptancePageComponent implements OnInit {
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private router = inject(Router);
  public i18n = inject(I18nService);

  loading = signal(true);
  queue = signal<AcceptanceQueueItemDto[]>([]);
  history = signal<GrcRecord[]>([]);
  historyLoading = signal(false);
  historyLoaded = signal(false);
  activeTab = signal<ViewTab>('queue');

  requestDialogVisible = false;
  approvalDialogVisible = false;
  renewDialogVisible = false;
  approvalMode: 'accepted' | 'rejected' = 'accepted';
  pendingApprovalRiskId = '';
  approvalComments = '';
  form = { riskId: '', reason: '' };
  renewTarget: AcceptanceQueueItemDto | null = null;
  renewReason = '';

  tabs = RISK_PRIMARY_TABS;
  L = computed(() => this.i18n.isAr() ? AR : EN);

  total = computed(() => this.queue().length);
  pending = computed(() => this.queue().filter(q => q.status === 'pending').length);
  accepted = computed(() => this.queue().filter(q => q.status === 'accepted').length);
  rejected = computed(() => this.queue().filter(q => q.status === 'rejected').length);
  expiringSoon = computed(() => {
    const threshold = Date.now() + 30 * 24 * 60 * 60 * 1000;
    return this.queue().filter(q => {
      const dt = (q as any).expiryDate || q.reviewDate;
      if (!dt) return false;
      return new Date(dt).getTime() < threshold && q.status === 'accepted';
    }).length;
  });

  ngOnInit(): void {
    this.loadQueue();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadQueue();
      if (this.historyLoaded()) this.loadHistory();
    });
  }

  private loadQueue(): void {
    this.api.getAcceptanceQueue().subscribe({
      next: (d) => { this.queue.set(d || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  /** Switch to history tab and load data on first visit */
  switchToHistory(): void {
    this.activeTab.set('history');
    if (!this.historyLoaded()) {
      this.loadHistory();
    }
  }

  private loadHistory(): void {
    this.historyLoading.set(true);
    this.api.getAcceptanceHistory().subscribe({
      next: (res) => {
        this.history.set(res?.history || []);
        this.historyLoading.set(false);
        this.historyLoaded.set(true);
      },
      error: () => {
        this.historyLoading.set(false);
        this.historyLoaded.set(true);
      },
    });
  }

  // ── Workflow Step Logic ──

  getWorkflowStep(q: AcceptanceQueueItemDto): WorkflowStep {
    if (q.status === 'accepted' || q.status === 'rejected' || q.status === 'expired') return 'decision';
    if (q.approvalTrail?.length > 0) return 'under_review';
    return 'requested';
  }

  isWorkflowPast(q: AcceptanceQueueItemDto, step: WorkflowStep): boolean {
    const currentStep = this.getWorkflowStep(q);
    const order: WorkflowStep[] = ['requested', 'under_review', 'decision'];
    return order.indexOf(step) < order.indexOf(currentStep);
  }

  // ── Expiry Badge Logic ──

  getExpiryBadge(q: AcceptanceQueueItemDto): 'red' | 'amber' | null {
    if (q.status !== 'accepted') return null;
    const dt = (q as any).expiryDate || q.reviewDate;
    if (!dt) return null;
    const daysLeft = (new Date(dt).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    if (daysLeft <= 7) return 'red';
    if (daysLeft <= 30) return 'amber';
    return null;
  }

  isExpiringSoon(date?: string | null): boolean {
    if (!date) return false;
    return new Date(date).getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000;
  }

  scoreClass(score: number): string {
    if (score >= 15) return 'score-high';
    if (score >= 6) return 'score-medium';
    return 'score-low';
  }

  // ── Cross-link Navigation ──

  navigateToRisk(riskId: string): void {
    this.router.navigate(['/risk/register'], { queryParams: { riskId } });
  }

  navigateToAppetite(): void {
    this.router.navigate(['/risk/appetite']);
  }

  navigateToTreatment(treatmentId: string): void {
    this.router.navigate(['/risk/treatment'], { queryParams: { treatmentId } });
  }

  // ── Request Acceptance ──

  openRequestDialog(): void {
    this.form = { riskId: '', reason: '' };
    this.requestDialogVisible = true;
  }

  submitRequest(): void {
    if (!this.form.riskId || !this.form.reason) return;
    this.api.requestAcceptance(this.form.riskId, { reason: this.form.reason }).subscribe({
      next: () => {
        this.requestDialogVisible = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.L().requestSent, life: 3000 });
        this.loadQueue();
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.L().requestFailed, life: 3000 }),
    });
  }

  // ── Approve / Reject ──

  approve(riskId: string): void {
    this.pendingApprovalRiskId = riskId;
    this.approvalMode = 'accepted';
    this.approvalComments = '';
    this.approvalDialogVisible = true;
  }

  reject(riskId: string): void {
    this.pendingApprovalRiskId = riskId;
    this.approvalMode = 'rejected';
    this.approvalComments = '';
    this.approvalDialogVisible = true;
  }

  submitApproval(): void {
    const action = this.approvalMode === 'accepted' ? this.i18n.translate('common.approve') : this.i18n.translate('common.reject');
    this.confirm.confirm({
      message: this.approvalMode === 'accepted' ? this.i18n.translate('common.confirmApproveRisk') : this.i18n.translate('common.confirmRejectRisk'),
      header: action,
      icon: this.approvalMode === 'accepted' ? 'pi pi-check-circle' : 'pi pi-times-circle',
      acceptButtonStyleClass: this.approvalMode === 'rejected' ? 'p-button-danger' : '',
      accept: () => {
        this.api.approveAcceptance(this.pendingApprovalRiskId, {
          decision: this.approvalMode,
          comments: this.approvalComments,
        }).subscribe({
          next: () => {
            this.approvalDialogVisible = false;
            this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.approvalMode === 'accepted' ? this.L().approvedMsg : this.L().rejectedMsg, life: 3000 });
            this.loadQueue();
          },
          error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.L().approvalFailed, life: 3000 }),
        });
      },
    });
  }

  // ── Renew Acceptance ──

  renewAcceptance(q: AcceptanceQueueItemDto): void {
    this.renewTarget = q;
    this.renewReason = '';
    this.renewDialogVisible = true;
  }

  submitRenewal(): void {
    if (!this.renewTarget || !this.renewReason) return;
    this.api.requestAcceptance(this.renewTarget.riskId, { reason: this.renewReason }).subscribe({
      next: () => {
        this.renewDialogVisible = false;
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.L().renewalSubmitted, life: 3000 });
        this.loadQueue();
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.L().renewalFailed, life: 3000 }),
    });
  }
}

// ══════════════════════════════════════════
// EN / AR Translations
// ══════════════════════════════════════════

const EN = {
  title: 'Risk Acceptance',
  subtitle: 'Manage formal risk acceptance requests — submit, review, approve, or reject with justification and expiry tracking',
  totalRequests: 'Total', pendingReview: 'Pending', accepted: 'Accepted', rejected: 'Rejected', expiringSoon: 'Expiring Soon',
  risk: 'Risk', category: 'Category', residualScore: 'Residual', requestedBy: 'Requested By',
  requestedDate: 'Requested', expiryDate: 'Expires', justification: 'Justification', status: 'Status', actions: 'Actions',
  requestAcceptance: 'Request Acceptance', requestAcceptanceTitle: 'New Acceptance Request',
  export: 'Export', approve: 'Approve', reject: 'Reject',
  approveTitle: 'Approve Acceptance', rejectTitle: 'Reject Acceptance',
  riskId: 'Risk ID', riskIdPlaceholder: 'e.g. RSK-0001',
  justificationPlaceholder: 'Provide business justification for accepting this risk\u2026',
  comments: 'Reviewer Comments', commentsPlaceholder: 'Optional comments\u2026',
  submit: 'Submit', cancel: 'Cancel',
  requestSent: 'Acceptance request submitted.', requestFailed: 'Failed to submit request.',
  approvedMsg: 'Risk acceptance approved.', rejectedMsg: 'Risk acceptance rejected.', approvalFailed: 'Failed to record decision.',
  emptyMsg: 'No acceptance requests yet. Use "Request Acceptance" to begin the formal process.',

  // History tab
  activeQueue: 'Active Queue', historyTab: 'History',
  decisionDate: 'Decision Date', outcome: 'Outcome', reviewerComments: 'Comments',
  emptyHistoryMsg: 'No acceptance history records found.', loadingHistory: 'Loading history\u2026',

  // Workflow steps
  workflow: 'Workflow', stepRequested: 'Requested', stepReview: 'Review', stepDecision: 'Decision',

  // Expiry tracking
  critical: 'Critical', warning: 'Warning',
  expiresIn7d: 'Expires within 7 days', expiresIn30d: 'Expires within 30 days',
  renewAcceptance: 'Renew', renewAcceptanceTitle: 'Renew Risk Acceptance',
  renewExplanation: 'This acceptance is expiring soon. Submit a renewal justification to extend the acceptance period.',
  renewJustification: 'Renewal Justification', renewPlaceholder: 'Explain why continued acceptance is warranted\u2026',
  submitRenewal: 'Submit Renewal', renewalSubmitted: 'Renewal request submitted.', renewalFailed: 'Failed to submit renewal.',

  // Rich risk context
  riskContext: 'Risk Context', controlCount: 'Linked Controls', treatmentCount: 'Linked Treatments',

  // Cross-links
  viewInRegister: 'View in Risk Register', viewAppetite: 'View Appetite', viewTreatment: 'View Treatment Plan',
};

const AR: typeof EN = {
  title: '\u0642\u0628\u0648\u0644 \u0627\u0644\u0645\u062E\u0627\u0637\u0631',
  subtitle: '\u0625\u062F\u0627\u0631\u0629 \u0637\u0644\u0628\u0627\u062A \u0642\u0628\u0648\u0644 \u0627\u0644\u0645\u062E\u0627\u0637\u0631 \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u2014 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0648\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0623\u0648 \u0627\u0644\u0631\u0641\u0636 \u0645\u0639 \u062A\u062A\u0628\u0639 \u0627\u0644\u0645\u0633\u0648\u0651\u063A\u0627\u062A \u0648\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621',
  totalRequests: '\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A', pendingReview: '\u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629', accepted: '\u0645\u0642\u0628\u0648\u0644\u0629', rejected: '\u0645\u0631\u0641\u0648\u0636\u0629', expiringSoon: '\u062A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u0627\u064B',
  risk: '\u0627\u0644\u062E\u0637\u0631', category: '\u0627\u0644\u0641\u0626\u0629', residualScore: '\u0627\u0644\u0645\u062A\u0628\u0642\u064A', requestedBy: '\u0637\u0627\u0644\u0628 \u0627\u0644\u0642\u0628\u0648\u0644',
  requestedDate: '\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0637\u0644\u0628', expiryDate: '\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621', justification: '\u0627\u0644\u0645\u0633\u0648\u0651\u063A', status: '\u0627\u0644\u062D\u0627\u0644\u0629', actions: '\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A',
  requestAcceptance: '\u0637\u0644\u0628 \u0642\u0628\u0648\u0644 \u062E\u0637\u0631', requestAcceptanceTitle: '\u0637\u0644\u0628 \u0642\u0628\u0648\u0644 \u062C\u062F\u064A\u062F',
  export: '\u062A\u0635\u062F\u064A\u0631', approve: '\u0642\u0628\u0648\u0644', reject: '\u0631\u0641\u0636',
  approveTitle: '\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0642\u0628\u0648\u0644', rejectTitle: '\u0631\u0641\u0636 \u0627\u0644\u0642\u0628\u0648\u0644',
  riskId: '\u0645\u0639\u0631\u0641 \u0627\u0644\u062E\u0637\u0631', riskIdPlaceholder: '\u0645\u062B\u0627\u0644: RSK-0001',
  justificationPlaceholder: '\u0642\u062F\u0645 \u0627\u0644\u0645\u0633\u0648\u0651\u063A \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0644\u0642\u0628\u0648\u0644 \u0647\u0630\u0627 \u0627\u0644\u062E\u0637\u0631\u2026',
  comments: '\u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0627\u0644\u0645\u0631\u0627\u062C\u0639', commentsPlaceholder: '\u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0627\u062E\u062A\u064A\u0627\u0631\u064A\u0629\u2026',
  submit: '\u0625\u0631\u0633\u0627\u0644', cancel: '\u0625\u0644\u063A\u0627\u0621',
  requestSent: '\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u0642\u0628\u0648\u0644.', requestFailed: '\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628.',
  approvedMsg: '\u062A\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u062E\u0637\u0631.', rejectedMsg: '\u062A\u0645 \u0631\u0641\u0636 \u0642\u0628\u0648\u0644 \u0627\u0644\u062E\u0637\u0631.', approvalFailed: '\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0642\u0631\u0627\u0631.',
  emptyMsg: '\u0644\u0627 \u062A\u0648\u062C\u062F \u0637\u0644\u0628\u0627\u062A \u0642\u0628\u0648\u0644 \u0628\u0639\u062F. \u0627\u0633\u062A\u062E\u062F\u0645 "\u0637\u0644\u0628 \u0642\u0628\u0648\u0644 \u062E\u0637\u0631" \u0644\u0628\u062F\u0621 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0631\u0633\u0645\u064A\u0629.',

  // History tab
  activeQueue: '\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0646\u0634\u0637\u0629', historyTab: '\u0627\u0644\u0633\u062C\u0644',
  decisionDate: '\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u0631\u0627\u0631', outcome: '\u0627\u0644\u0646\u062A\u064A\u062C\u0629', reviewerComments: '\u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A',
  emptyHistoryMsg: '\u0644\u0627 \u062A\u0648\u062C\u062F \u0633\u062C\u0644\u0627\u062A \u0642\u0628\u0648\u0644 \u0633\u0627\u0628\u0642\u0629.', loadingHistory: '\u062C\u0627\u0631\u064D \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0633\u062C\u0644\u2026',

  // Workflow steps
  workflow: '\u0633\u064A\u0631 \u0627\u0644\u0639\u0645\u0644', stepRequested: '\u0645\u0637\u0644\u0648\u0628', stepReview: '\u0645\u0631\u0627\u062C\u0639\u0629', stepDecision: '\u0642\u0631\u0627\u0631',

  // Expiry tracking
  critical: '\u062D\u0631\u062C', warning: '\u062A\u062D\u0630\u064A\u0631',
  expiresIn7d: '\u064A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 7 \u0623\u064A\u0627\u0645', expiresIn30d: '\u064A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 30 \u064A\u0648\u0645\u0627\u064B',
  renewAcceptance: '\u062A\u062C\u062F\u064A\u062F', renewAcceptanceTitle: '\u062A\u062C\u062F\u064A\u062F \u0642\u0628\u0648\u0644 \u0627\u0644\u062E\u0637\u0631',
  renewExplanation: '\u0647\u0630\u0627 \u0627\u0644\u0642\u0628\u0648\u0644 \u0639\u0644\u0649 \u0648\u0634\u0643 \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621. \u0642\u062F\u0645 \u0645\u0633\u0648\u0651\u063A \u0627\u0644\u062A\u062C\u062F\u064A\u062F \u0644\u062A\u0645\u062F\u064A\u062F \u0641\u062A\u0631\u0629 \u0627\u0644\u0642\u0628\u0648\u0644.',
  renewJustification: '\u0645\u0633\u0648\u0651\u063A \u0627\u0644\u062A\u062C\u062F\u064A\u062F', renewPlaceholder: '\u0627\u0634\u0631\u062D \u0633\u0628\u0628 \u0627\u0633\u062A\u0645\u0631\u0627\u0631 \u0627\u0644\u0642\u0628\u0648\u0644\u2026',
  submitRenewal: '\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u062C\u062F\u064A\u062F', renewalSubmitted: '\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u062A\u062C\u062F\u064A\u062F.', renewalFailed: '\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u062C\u062F\u064A\u062F.',

  // Rich risk context
  riskContext: '\u0633\u064A\u0627\u0642 \u0627\u0644\u062E\u0637\u0631', controlCount: '\u0627\u0644\u0636\u0648\u0627\u0628\u0637 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629', treatmentCount: '\u062E\u0637\u0637 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629',

  // Cross-links
  viewInRegister: '\u0639\u0631\u0636 \u0641\u064A \u0633\u062C\u0644 \u0627\u0644\u0645\u062E\u0627\u0637\u0631', viewAppetite: '\u0639\u0631\u0636 \u0634\u0647\u064A\u0629 \u0627\u0644\u0645\u062E\u0627\u0637\u0631', viewTreatment: '\u0639\u0631\u0636 \u062E\u0637\u0629 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629',
};
