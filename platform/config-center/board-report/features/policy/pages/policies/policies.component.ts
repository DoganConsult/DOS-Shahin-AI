import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafeHtml } from '@angular/platform-browser';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { FoundationDataService } from '@app/grc';
import { Policy } from '@app/core/models/grc.models';
import { HtmlSanitizerService } from '@app/infrastructure/sanitizer/html-sanitizer.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { getModuleTabs } from '@app/shared/contracts/module-tab-registry';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';
import { PolicyTableComponent } from './components/policy-table.component';
import { PolicyDetailTabsComponent } from './components/policy-detail-tabs.component';
import { PolicyCreateEditDialogComponent, PolicyFormModel } from './components/policy-create-edit-dialog.component';
import { PolicyRulesDialogComponent } from './components/policy-rules-dialog.component';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';
import { GrcOperationsService } from '@app/api';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-policies',
    imports: [
        CommonModule, FormsModule, PageHeaderComponent, ModuleTabsBarComponent,
        ButtonModule, InputTextModule, DropdownModule, TooltipModule,
        AiPanelComponent, ToastModule,
        ConfirmDialogModule, RaciPanelComponent,
        PolicyTableComponent, PolicyDetailTabsComponent, PolicyCreateEditDialogComponent, PolicyRulesDialogComponent
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './policies.component.html',
    styleUrls: ['./policies.component.scss']
})
export class PoliciesComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private complianceSvc = inject(GrcComplianceService);
    private operationsSvc = inject(GrcOperationsService);
  policies: Policy[] = [];
  filteredPolicies: Policy[] = [];
  selectedPolicies: GrcRecord[] = [];
  loaded = false;
  searchTerm = '';
  statusFilter = '';
  healthFilter = '';

  showDialog = false;
  showDeleteDialog = false;
  editMode = false;
  editingPolicyId: string | null = null;
  deleteTarget: Policy | null = null;

  form: PolicyFormModel = { title: '', content: '', owner: '', status: 'draft', frameworksStr: '', category: '', requiresAcknowledgement: false };

  readonly tabs = getModuleTabs('governance');
  readonly headerActions: PageHeaderAction[] = [
    { id: 'add',    labelEn: 'Add Policy', labelAr: 'إضافة سياسة', icon: 'plus', primary: true },
    { id: 'export', labelEn: 'Export',     labelAr: 'تصدير',        icon: 'download' },
  ];
  isAr  = computed(() => this.i18n.currentLang() === 'ar');
  dir   = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  onHeaderAction(id: string): void {
    if (id === 'add') this.openCreateDialog();
  }

  publishedPct = 0;
  missingOwnerCount = 0;
  missingReviewCount = 0;
  dueSoonCount = 0;
  overdueCount = 0;

  drawerVisible = false;
  selectedPolicy: GrcRecord | null = null;
  policyVersions: GrcRecord[] = [];
  versionsLoading = false;
  linkedProcedures: GrcRecord[] = [];
  approvalRequests: GrcRecord[] = [];
  approvalsLoading = false;
  showRejectPolicyDialog = false;

  statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Archived', value: 'archived' },
  ];

  statusFilterOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Approved', value: 'approved' },
    { label: 'Archived', value: 'archived' },
  ];

  private live = inject(GrcLiveService);
  private confirmSvc = inject(ConfirmationService);
  private destroyRef = inject(DestroyRef);
  private msgService = inject(MessageService);
  private route = inject(ActivatedRoute);
  private foundationData = inject(FoundationDataService);
  private htmlSanitizer = inject(HtmlSanitizerService);

  /** Route query params as a signal via toSignal() */
  private readonly queryParams = toSignal(this.route.queryParams, { initialValue: {} as Record<string, string> });

  readonly policyCatOptions = computed(() => this.foundationData.policyCatOptions());

  constructor(public i18n: I18nService, private governanceSvc: GrcGovernanceService) {}

  sanitizeHtml(html: string): SafeHtml {
    return this.htmlSanitizer.sanitize(html || '');
  }

  /** React to query param changes for filters */
  private readonly queryParamEffect = effect(() => {
    const params = this.queryParams();
    if (params['dueReview'] === '1') this.healthFilter = 'due_soon';
    if (params['status']) this.statusFilter = params['status'];
    if (params['openCreate'] === '1') setTimeout(() => this.openCreateDialog(), 100);
  });

  ngOnInit(): void {
    this.foundationData.load();
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadPolicies());
    this.loadPolicies();
  }

  loadPolicies(): void {
    this.governanceSvc.getGovernancePolicies().subscribe((res: any) => {
      this.policies = res.policies || res || [];
      this.computeHealth();
      this.filterPolicies();
      this.loaded = true;
    });
  }

  computeHealth(): void {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const total = this.policies.length;
    const published = this.policies.filter((p) => p.status === 'published' || p.status === 'approved').length;
    this.publishedPct = total ? Math.round((published / total) * 100) : 0;
    this.missingOwnerCount = this.policies.filter((p) => !p.owner).length;
    this.missingReviewCount = this.policies.filter((p) => !p.next_review_date).length;
    this.dueSoonCount = this.policies.filter((p) => p.next_review_date && new Date(p.next_review_date) <= in30 && new Date(p.next_review_date) >= now).length;
    this.overdueCount = this.policies.filter((p) => p.next_review_date && new Date(p.next_review_date) < now).length;
  }

  applyHealthFilter(filter: string): void {
    this.healthFilter = filter;
    this.statusFilter = '';
    this.searchTerm = '';
    this.filterPolicies();
  }

  clearFilters(): void {
    this.healthFilter = '';
    this.statusFilter = '';
    this.searchTerm = '';
    this.filterPolicies();
  }

  filterPolicies(): void {
    let result = [...this.policies];
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    if (this.healthFilter === 'published') result = result.filter((p) => p.status === 'published' || p.status === 'approved');
    else if (this.healthFilter === 'missing_owner') result = result.filter((p) => !p.owner);
    else if (this.healthFilter === 'missing_review') result = result.filter((p) => !p.next_review_date);
    else if (this.healthFilter === 'due_soon') result = result.filter((p) => p.next_review_date && new Date(p.next_review_date) <= in30 && new Date(p.next_review_date) >= now);
    else if (this.healthFilter === 'overdue') result = result.filter((p) => p.next_review_date && new Date(p.next_review_date) < now);
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter((p) => p.title?.toLowerCase().includes(term) || p.content?.toLowerCase().includes(term) || p.owner?.toLowerCase().includes(term));
    }
    if (this.statusFilter) result = result.filter((p) => p.status === this.statusFilter);
    this.filteredPolicies = result;
  }

  isReviewOverdue(p: GrcRecord): boolean { return p.next_review_date && new Date(p.next_review_date) < new Date(); }
  isReviewDueSoon(p: GrcRecord): boolean { const d = new Date(); return p.next_review_date && new Date(p.next_review_date) <= new Date(d.getTime() + 30 * 86400000); }

  openDetail(policy: GrcRecord): void {
    this.selectedPolicy = policy;
    this.drawerVisible = true;
    this.policyVersions = [];
    this.linkedProcedures = [];
    this.approvalRequests = [];
    this.versionsLoading = true;
    this.approvalsLoading = true;
    const id = policy.policyId || policy.policy_id;
    this.governanceSvc.getPolicyVersions(id).subscribe({
      next: (res: any) => { this.policyVersions = res.versions || res || []; this.versionsLoading = false; },
      error: () => { this.versionsLoading = false; },
    });
    this.operationsSvc.getApprovalRequests('policy', id).subscribe({
      next: (res: any) => { this.approvalRequests = res.requests || res.approvals || res || []; this.approvalsLoading = false; },
      error: () => { this.approvalsLoading = false; },
    });
    if (id) {
      this.governanceSvc.getPolicyProcedures(id).subscribe({
        next: (res) => { this.linkedProcedures = res.procedures || []; },
        error: (e) => devError("[API]", e),
      });
    }
  }

  createNewVersion(): void {
    if (!this.selectedPolicy) return;
    const id = this.selectedPolicy.policyId || this.selectedPolicy.policy_id;
    this.governanceSvc.updatePolicy(id, { content: this.selectedPolicy.content, change_summary: this.i18n.translate('common.newVersionCreated') } as any).subscribe({
      next: () => { this.loadPolicies(); this.openDetail(this.selectedPolicy); this.msgService.add({ severity: 'success', summary: this.i18n.translate('common.versionCreated'), life: 3000 }); },
      error: () => { this.msgService.add({ severity: 'error', summary: this.i18n.translate('common.failedToCreateVersion'), life: 4000 }); },
    });
  }

  submitForApproval(): void {
    if (!this.selectedPolicy) return;
    const id = this.selectedPolicy.policyId || this.selectedPolicy.policy_id;
    this.operationsSvc.initiateApprovalRequest({ entityType: 'policy', entityId: id, action: 'publish', routeId: 'policy-approval' }).subscribe({
      next: () => { this.msgService.add({ severity: 'success', summary: this.i18n.translate('common.submittedForApproval'), life: 3000 }); this.openDetail(this.selectedPolicy); },
      error: () => { this.msgService.add({ severity: 'error', summary: this.i18n.translate('common.submissionFailed'), life: 4000 }); },
    });
  }

  openCreateDialog(): void {
    this.editMode = false;
    this.editingPolicyId = null;
    this.form = { title: '', content: '', owner: '', status: 'draft', frameworksStr: '', category: '', requiresAcknowledgement: false };
    this.showDialog = true;
  }

  openEditDialog(policy: GrcRecord): void {
    this.editMode = true;
    this.editingPolicyId = policy.policyId || policy.policy_id;
    this.form = {
      title: policy.title,
      content: policy.content || '',
      owner: policy.owner || '',
      status: policy.status || 'draft',
      frameworksStr: (policy.frameworks || []).join(', '),
      category: policy.category || '',
      requiresAcknowledgement: policy.requiresAcknowledgement ?? policy.requires_acknowledgement ?? false,
    };
    this.showDialog = true;
  }

  savePolicy(formData: PolicyFormModel): void {
    if (!formData.title || !formData.content) return;
    const payload: GrcRecord = {
      title: formData.title, content: formData.content, owner: formData.owner, status: formData.status,
      frameworks: formData.frameworksStr.split(',').map(s => s.trim()).filter(Boolean),
    };
    if (this.editMode && this.editingPolicyId) {
      this.governanceSvc.updatePolicy(this.editingPolicyId, payload as any).subscribe(() => { this.showDialog = false; this.loadPolicies(); });
    } else {
      this.governanceSvc.createPolicy(payload as any).subscribe(() => { this.showDialog = false; this.loadPolicies(); });
    }
  }

  approve(policy: GrcRecord): void {
    const id = policy.policyId || policy.policy_id;
    this.governanceSvc.approvePolicy(id).subscribe(() => this.loadPolicies());
  }

  confirmDelete(policy: Policy): void {
    this.deleteTarget = policy;
    this.showDeleteDialog = true;
  }

  deletePolicy(): void {
    if (!this.deleteTarget) return;
    const id = (this.deleteTarget as GrcRecord).policyId || (this.deleteTarget as GrcRecord).policy_id;
    this.governanceSvc.deletePolicy(id).subscribe(() => { this.showDeleteDialog = false; this.deleteTarget = null; this.loadPolicies(); });
  }

  // Policy-as-Code
  showRulesDialog = false;
  rulesLoading = false;
  policyRules: GrcRecord[] = [];
  rulesPolicyId: string | null = null;
  executeResult: GrcRecord | null = null;

  openRulesDialog(policy: GrcRecord): void {
    const id = policy.policyId || policy.policy_id;
    this.rulesPolicyId = id;
    this.policyRules = [];
    this.executeResult = null;
    this.rulesLoading = true;
    this.showRulesDialog = true;
    this.complianceSvc.getPolicyRules(id).subscribe({
      next: (res: any) => { this.policyRules = res.rules || res || []; this.rulesLoading = false; },
      error: () => { this.rulesLoading = false; },
    });
  }

  executeRules(): void {
    if (!this.rulesPolicyId) return;
    this.complianceSvc.executePolicyRules(this.rulesPolicyId, {}).subscribe({
      next: (res) => { this.executeResult = res; },
      error: (e) => devError("[API]", e),
    });
  }

  exportCSV(): void {
    const rows = this.filteredPolicies.map((p) => ({
      Title: p.title, Status: p.status, Version: p.version,
      Owner: p.owner || '', Frameworks: (p.frameworks || []).join('; '),
    }));
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String((r as GrcRecord)[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'policies-export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  rejectPolicy(reason: string): void {
    if (!this.selectedPolicy || !reason) return;
    this.governanceSvc.rejectPolicy(this.selectedPolicy.policy_id, reason).subscribe({
      next: () => {
        this.showRejectPolicyDialog = false;
        this.selectedPolicy = { ...this.selectedPolicy, status: 'rejected' };
        this.loadPolicies();
        this.msgService.add({ severity: 'success', summary: this.i18n.translate('common.policyRejected'), life: 3000 });
      },
      error: () => { this.msgService.add({ severity: 'error', summary: this.i18n.translate('common.rejectFailed'), life: 4000 }); },
    });
  }

  publishPolicy(): void {
    if (!this.selectedPolicy) return;
    this.governanceSvc.publishPolicy(this.selectedPolicy.policy_id).subscribe({
      next: () => {
        this.selectedPolicy = { ...this.selectedPolicy, status: 'published' };
        this.loadPolicies();
        this.msgService.add({ severity: 'success', summary: this.i18n.translate('common.policyPublished'), life: 3000 });
      },
      error: (err) => { this.msgService.add({ severity: 'error', summary: err?.error?.error || this.i18n.translate('common.operationFailed'), life: 4000 }); },
    });
  }

  viewVersion(v: GrcRecord): void {
    this.msgService.add({ severity: 'info', summary: `Viewing v${v.version}`, detail: v.change_summary || v.content?.substring(0, 100) || 'No details', life: 5000 });
  }

  bulkApprove(): void {
    if (!this.selectedPolicies.length) return;
    const calls = this.selectedPolicies.map(p => this.governanceSvc.approvePolicy(p.policy_id));
    let done = 0;
    calls.forEach(obs => obs.subscribe({
      next: () => { done++; if (done === calls.length) { this.selectedPolicies = []; this.loadPolicies(); this.msgService.add({ severity: 'success', summary: this.i18n.translate('common.policiesApproved', { count: String(done) }), life: 3000 }); } },
      error: () => this.msgService.add({ severity: 'error', summary: this.i18n.translate('common.someApprovalsFailed'), life: 4000 }),
    }));
  }

  bulkArchive(): void {
    if (!this.selectedPolicies.length) return;
    this.confirmSvc.confirm({
      message: `Archive ${this.selectedPolicies.length} policies?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const calls = this.selectedPolicies.map(p => this.apiclientSvc.put(`/policies/${p.policy_id}`, { status: 'archived' }));
        let done = 0;
        calls.forEach(obs => obs.subscribe({
          next: () => { done++; if (done === calls.length) { this.selectedPolicies = []; this.loadPolicies(); this.msgService.add({ severity: 'info', summary: this.i18n.translate('common.policiesArchived', { count: String(done) }), life: 3000 }); } },
          error: () => this.msgService.add({ severity: 'error', summary: this.i18n.translate('common.someArchivesFailed'), life: 4000 }),
        }));
      }
    });
  }

}
