/**
 * Policy Exceptions Page
 *
 * Exception management with KPI strip, filterable table, and dialogs for
 * requesting, approving, rejecting, renewing, and closing exceptions.
 */
import {
  Component, OnInit, inject, DestroyRef,
  ChangeDetectionStrategy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { InputTextarea } from 'primeng/textarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { GrcDataTableComponent } from '@app/shared/components';
import { PolicyApiService } from '../../services/policy-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/** Policy exception DTO */
export interface PolicyException {
  id: string;
  policyId: string;
  policyTitle: string;
  clauseScope: string;
  reason: string;
  requestedBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'renewed' | 'closed' | 'expired';
  expiryDate: string | null;
  compensatingControls: string;
  businessJustification: string;
  riskAssessment: string;
  createdAt: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-policy-exceptions',
    imports: [
        CommonModule, FormsModule, GrcDataTableComponent, PageHeaderComponent,
        ButtonModule, TableModule, TagModule, DialogModule, TooltipModule,
        ProgressBarModule, InputTextModule, DropdownModule, CalendarModule,
        InputTextarea, ConfirmDialogModule, ToastModule,
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './policy-exceptions.component.html',
    styleUrls: ['./policy-exceptions.component.scss']
})
export class PolicyExceptionsComponent implements OnInit {
  private api = inject(PolicyApiService);
  private msgService = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  public i18n = inject(I18nService);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed(() => this.i18n.direction() as 'ltr' | 'rtl');

  readonly headerActions: PageHeaderAction[] = [
    { id: 'request', labelEn: 'Request Exception', labelAr: 'طلب استثناء', icon: 'plus', primary: true },
  ];

  // -- State --
  loading = signal(true);
  exceptions = signal<PolicyException[]>([]);

  // Filters
  statusFilter = signal('');
  policyFilter = signal('');
  priorityFilter = signal('');

  filteredExceptions = computed(() => {
    let items = this.exceptions();
    const sf = this.statusFilter();
    const pf = this.policyFilter();
    const prf = this.priorityFilter();
    if (sf) items = items.filter(e => e.status === sf);
    if (pf) items = items.filter(e => e.policyTitle?.toLowerCase().includes(pf.toLowerCase()));
    if (prf) items = items.filter(e => e.priority === prf);
    return items;
  });

  // KPIs
  kpiActive = computed(() => this.exceptions().filter(e => e.status === 'approved').length);
  kpiPending = computed(() => this.exceptions().filter(e => e.status === 'pending' || e.status === 'under_review').length);
  kpiExpiringSoon = computed(() => {
    const in30d = new Date(Date.now() + 30 * 86400000);
    const now = new Date();
    return this.exceptions().filter(e =>
      e.status === 'approved' && e.expiryDate &&
      new Date(e.expiryDate) <= in30d && new Date(e.expiryDate) >= now
    ).length;
  });
  kpiRejected = computed(() => this.exceptions().filter(e => e.status === 'rejected').length);
  kpiTotal = computed(() => this.exceptions().length);

  // -- Request Exception dialog --
  showRequestDialog = signal(false);
  policies = signal<{ label: string; value: string }[]>([]);
  requestForm = {
    policyId: '',
    clauseScope: '',
    reason: '',
    businessJustification: '',
    compensatingControls: '',
    riskAssessment: '',
    priority: 'medium' as string,
  };

  /** Minimum selectable date for expiry calendar (today) */
  readonly minDate = new Date();

  // -- Approve dialog --
  showApproveDialog = signal(false);
  approveTarget = signal<PolicyException | null>(null);
  approveForm = {
    comment: '',
    conditions: '',
    expiryDate: null as Date | null,
  };

  // -- Reject dialog --
  showRejectDialog = signal(false);
  rejectTarget = signal<PolicyException | null>(null);
  rejectForm = {
    reason: '',
    comment: '',
  };

  readonly statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Renewed', value: 'renewed' },
    { label: 'Closed', value: 'closed' },
    { label: 'Expired', value: 'expired' },
  ];

  readonly priorityOptions = [
    { label: 'All Priorities', value: '' },
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
  ];

  readonly priorityFormOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
  ];

  ngOnInit(): void {
    this.loadExceptions();
    this.loadPolicies();
  }

  onHeaderAction(id: string): void {
    if (id === 'request') this.openRequestDialog();
  }

  /** Load all exceptions */
  loadExceptions(): void {
    this.loading.set(true);
    this.api.listExceptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          const raw = Array.isArray(res) ? res : (res.data || res.exceptions || []);
          this.exceptions.set(raw.map((e: any) => this.normalizeException(e)));
          this.loading.set(false);
        },
        error: () => {
          this.exceptions.set([]);
          this.loading.set(false);
        },
      });
  }

  /** Load policies for dropdown */
  loadPolicies(): void {
    this.api.list({ limit: 500 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.policies.set(
            (res.data || []).map((p: any) => ({ label: p.title, value: p.id }))
          );
        },
        error: () => this.policies.set([]),
      });
  }

  // -- Request Exception --
  openRequestDialog(): void {
    this.requestForm = {
      policyId: '', clauseScope: '', reason: '',
      businessJustification: '', compensatingControls: '', riskAssessment: '', priority: 'medium',
    };
    this.showRequestDialog.set(true);
  }

  submitRequest(): void {
    if (!this.requestForm.policyId || !this.requestForm.reason) return;
    this.api.createException(this.requestForm)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showRequestDialog.set(false);
          this.msgService.add({ severity: 'success', summary: 'Exception requested', life: 3000 });
          this.loadExceptions();
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Failed to create exception', life: 4000 });
        },
      });
  }

  // -- Approve --
  openApproveDialog(exc: PolicyException): void {
    this.approveTarget.set(exc);
    this.approveForm = { comment: '', conditions: '', expiryDate: null };
    this.showApproveDialog.set(true);
  }

  submitApproval(): void {
    const target = this.approveTarget();
    if (!target || !this.approveForm.expiryDate) return;
    this.api.approveException(target.id, {
      comment: this.approveForm.comment,
      conditions: this.approveForm.conditions,
      expiryDate: this.approveForm.expiryDate.toISOString(),
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showApproveDialog.set(false);
          this.msgService.add({ severity: 'success', summary: 'Exception approved', life: 3000 });
          this.loadExceptions();
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Failed to approve exception', life: 4000 });
        },
      });
  }

  // -- Reject --
  openRejectDialog(exc: PolicyException): void {
    this.rejectTarget.set(exc);
    this.rejectForm = { reason: '', comment: '' };
    this.showRejectDialog.set(true);
  }

  submitRejection(): void {
    const target = this.rejectTarget();
    if (!target || !this.rejectForm.reason) return;
    this.api.rejectException(target.id, {
      reason: this.rejectForm.reason,
      comment: this.rejectForm.comment,
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showRejectDialog.set(false);
          this.msgService.add({ severity: 'success', summary: 'Exception rejected', life: 3000 });
          this.loadExceptions();
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Failed to reject exception', life: 4000 });
        },
      });
  }

  // -- Renew --
  renewException(exc: PolicyException): void {
    this.api.renewException(exc.id, {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msgService.add({ severity: 'success', summary: 'Exception renewed', life: 3000 });
          this.loadExceptions();
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Failed to renew exception', life: 4000 });
        },
      });
  }

  // -- Close --
  closeException(exc: PolicyException): void {
    this.api.closeException(exc.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msgService.add({ severity: 'success', summary: 'Exception closed', life: 3000 });
          this.loadExceptions();
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Failed to close exception', life: 4000 });
        },
      });
  }

  /** Map exception status to PrimeNG tag severity */
  statusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'under_review': return 'info';
      case 'rejected': case 'expired': return 'danger';
      case 'renewed': return 'info';
      case 'closed': return 'info';
      default: return 'info';
    }
  }

  /** Map priority to PrimeNG tag severity */
  prioritySeverity(priority: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (priority) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'info';
    }
  }

  /** Truncate text to given length */
  truncate(text: string, maxLen: number): string {
    if (!text) return '-';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  }

  /** Normalize raw API data into PolicyException */
  private normalizeException(raw: any): PolicyException {
    return {
      id: raw.id || raw.exception_id || '',
      policyId: raw.policyId || raw.policy_id || '',
      policyTitle: raw.policyTitle || raw.policy_title || '',
      clauseScope: raw.clauseScope || raw.clause_scope || '',
      reason: raw.reason || '',
      requestedBy: raw.requestedBy || raw.requested_by || raw.requester_name || '',
      priority: raw.priority || 'medium',
      status: raw.status || 'pending',
      expiryDate: raw.expiryDate || raw.expiry_date || null,
      compensatingControls: raw.compensatingControls || raw.compensating_controls || '',
      businessJustification: raw.businessJustification || raw.business_justification || '',
      riskAssessment: raw.riskAssessment || raw.risk_assessment || '',
      createdAt: raw.createdAt || raw.created_at || '',
    };
  }
}
