import { Component, OnInit, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AuditApiService } from '../../services/audit-api.service';
import { ComplianceFeatureApiService } from '@app/features/compliance/services/compliance-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { EntityDetailDrawerComponent } from '@app/shared/components/entity/entity-detail-drawer.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TabViewModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/widgets';

// ── Status Lifecycle (canonical — must match backend FINDING_STATUS_TRANSITIONS) ──
const FINDING_TRANSITIONS: Record<string, string[]> = {
  open:                 ['in_progress', 'remediation_planned', 'deferred', 'closed'],
  in_progress:          ['resolved', 'deferred', 'open'],
  remediation_planned:  ['in_progress', 'deferred'],
  deferred:             ['open', 'closed'],
  resolved:             ['verified', 'open'],
  verified:             ['closed'],
  closed:               [],
};

interface UserOption { label: string; value: string; email?: string; department?: string }
interface TeamOption { label: string; value: string }
interface StatusHistoryEntry { fromStatus: string; toStatus: string; actor: string; timestamp: string; reason?: string }
interface OwnerProfile { name: string; email: string; team?: string; department?: string; businessUnit?: string }

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-findings',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent, EntityDetailDrawerComponent,
        GrcDataTableComponent, GrcFormFieldComponent,
        ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule, InputTextarea,
        DropdownModule, TabViewModule, TagModule],
    providers: [MessageService],
    templateUrl: './audit-findings.component.html',
    styleUrls: ['./audit-findings.component.scss']
})
export class AuditFindingsComponent implements OnInit {
  private api = inject(AuditApiService);
  private complianceApi = inject(ComplianceFeatureApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  readonly i18nSvc = inject(I18nService);
  private msg = inject(MessageService);

  loading = signal(true);
  items = signal<GrcRecord[]>([]);
  filtered = signal<GrcRecord[]>([]);
  detailData = signal<GrcRecord | null>(null);

  // Drawer data signals
  userOptions = signal<UserOption[]>([]);
  teamOptions = signal<TeamOption[]>([]);
  ownerProfile = signal<OwnerProfile | null>(null);
  statusHistory = signal<StatusHistoryEntry[]>([]);
  availableTransitions = signal<{ label: string; value: string }[]>([]);

  selectedOwnerId: string | null = null;
  selectedTeamId: string | null = null;
  pendingStatusChange: string | null = null;

  severityFilter = '';
  statusFilter = '';
  searchTerm = '';
  drawerVisible = false;
  selectedItem: GrcRecord | null = null;

  findingDialogVisible = false;
  editingFinding = false;
  editFindingId = '';
  findingForm: GrcRecord = { title: '', description: '', severity: 'medium', status: 'open' };

  showRootCauseDialog = false;
  rootCauseForm: GrcRecord = { cause_type: '', description: '', analysis_method: '' };

  showImpactDialog = false;
  impactForm: GrcRecord = { impact_type: '', severity: 'medium', description: '', financial_impact: null };

  get severityOptions() {
    return [
      { label: this.i18nSvc.translate('audit.critical'), value: 'critical' },
      { label: this.i18nSvc.translate('audit.high'), value: 'high' },
      { label: this.i18nSvc.translate('audit.medium'), value: 'medium' },
      { label: this.i18nSvc.translate('audit.low'), value: 'low' },
    ];
  }
  get statusOptions() {
    return [
      { label: this.i18nSvc.translate('audit.open'), value: 'open' },
      { label: this.i18nSvc.translate('audit.inProgress'), value: 'in_progress' },
      { label: this.i18nSvc.translate('audit.remediationPlanned'), value: 'remediation_planned' },
      { label: this.i18nSvc.translate('audit.deferred'), value: 'deferred' },
      { label: this.i18nSvc.translate('audit.resolved'), value: 'resolved' },
      { label: this.i18nSvc.translate('audit.verified'), value: 'verified' },
      { label: this.i18nSvc.translate('audit.closed'), value: 'closed' },
    ];
  }
  get causeTypeOptions() {
    return [
      { label: this.i18nSvc.translate('audit.process'), value: 'process' },
      { label: this.i18nSvc.translate('audit.people'), value: 'people' },
      { label: this.i18nSvc.translate('audit.technology'), value: 'technology' },
      { label: this.i18nSvc.translate('audit.policy'), value: 'policy' },
      { label: this.i18nSvc.translate('audit.external'), value: 'external' },
    ];
  }
  get impactTypeOptions() {
    return [
      { label: this.i18nSvc.translate('audit.financial'), value: 'financial' },
      { label: this.i18nSvc.translate('audit.operational'), value: 'operational' },
      { label: this.i18nSvc.translate('audit.reputational'), value: 'reputational' },
      { label: this.i18nSvc.translate('audit.regulatoryImpact'), value: 'regulatory' },
      { label: this.i18nSvc.translate('audit.strategic'), value: 'strategic' },
    ];
  }

  ngOnInit() {
    // Long-lived router observable -- needs takeUntilDestroyed for cleanup
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      const sev = p.get('severity');
      const st = p.get('status');
      if (sev) this.severityFilter = sev;
      if (st) this.statusFilter = st;
      const id = p.get('id');
      if (id) this.openDetailById(id);
    });
    this.load();
    this.loadLookups();
  }

  load() {
    this.api.getFindings().subscribe({
      next: r => { this.items.set((r as any).findings || []); this.applyFilter(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('common.failedToLoadFindings') }); }
    });
  }

  applyFilter() {
    let list = this.items();
    if (this.severityFilter) list = list.filter(i => i.severity === this.severityFilter);
    if (this.statusFilter) list = list.filter(i => i.status === this.statusFilter);
    if (this.searchTerm) { const s = this.searchTerm.toLowerCase(); list = list.filter(i => i.title?.toLowerCase().includes(s)); }
    this.filtered.set(list);
  }

  openDetail(item: GrcRecord) {
    this.selectedItem = item;
    this.drawerVisible = true;
    this.loadDetail(item.finding_id);
    this.loadDrawerContext(item);
  }

  openDetailById(id: string) {
    this.api.getFinding(id).subscribe({ next: d => {
      this.selectedItem = d;
      this.detailData.set(d);
      this.drawerVisible = true;
      this.loadDrawerContext(d);
    }});
  }

  loadDetail(id: string) {
    this.api.getFinding(id).subscribe({ next: d => this.detailData.set(d) });
  }

  /** Load Foundation lookups (users + teams) for dropdowns */
  loadLookups(): void {
    this.api.getFoundationUsers().pipe(catchError(() => of([]))).subscribe(users => {
      this.userOptions.set(
        (Array.isArray(users) ? users : []).map((u) => ({
          label: `${u.full_name || u.name || u.email} (${u.email || ''})${u.department_name ? ' \u2014 ' + u.department_name : ''}`,
          value: u.user_id || u.id,
          email: u.email,
          department: u.department_name,
        }))
      );
    });
    this.api.getFoundationTeams().pipe(catchError(() => of([]))).subscribe(teams => {
      this.teamOptions.set(
        (Array.isArray(teams) ? teams : []).map((t) => ({
          label: `${t.team_name || t.name} (${t.team_code || t.code || ''})`,
          value: t.team_id || t.id,
        }))
      );
    });
  }

  /** Populate drawer signals when a finding is selected */
  private loadDrawerContext(item: GrcRecord): void {
    // Set current assignments
    this.selectedOwnerId = item.owner_id || item.ownerId || null;
    this.selectedTeamId = item.team_id || item.teamId || null;
    this.pendingStatusChange = null;

    // Compute available status transitions
    const currentStatus = item.status || 'open';
    const transitions = FINDING_TRANSITIONS[currentStatus] || [];
    this.availableTransitions.set(
      transitions.map((s: string) => ({ label: this.formatStatus(s), value: s }))
    );

    // Load owner profile
    this.ownerProfile.set(null);
    const ownerId = item.owner_id || item.ownerId;
    if (ownerId) {
      this.api.getFoundationUserDetail(ownerId).pipe(catchError(() => of(null))).subscribe(u => {
        if (u) {
          this.ownerProfile.set({
            name: (u as any).full_name || u.name || u.email,
            email: u.email,
            team: (u as any).team_name,
            department: (u as any).department_name,
            businessUnit: (u as any).business_unit_name,
          });
        }
      });
    }

    // Load status history
    this.statusHistory.set([]);
    const findingId = item.finding_id || item.findingId;
    if (findingId) {
      this.api.getFindingHistory(findingId).pipe(catchError(() => of([]))).subscribe(history => {
        this.statusHistory.set(
          (Array.isArray(history) ? history : []).map((h) => ({
            fromStatus: h.from_status || h.fromStatus || '',
            toStatus: h.to_status || h.toStatus || '',
            actor: h.actor_name || h.actor || h.changed_by || 'System',
            timestamp: h.changed_at || h.timestamp || h.created_at,
            reason: h.reason || h.notes || '',
          }))
        );
      });
    }
  }

  formatStatus(s: string): string {
    return s?.replace(/_/g, ' ') || '';
  }

  onOwnerChange(userId: string | null): void {
    if (!this.selectedItem?.finding_id || !userId) return;
    this.api.updateFindingAssignment(this.selectedItem.finding_id, { owner_id: userId } as any).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.ownerUpdated') });
        this.loadDetail(this.selectedItem.finding_id);
        this.loadDrawerContext({ ...this.selectedItem, owner_id: userId });
        this.load();
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('common.failedToUpdateOwner') })
    });
  }

  onTeamChange(teamId: string | null): void {
    if (!this.selectedItem?.finding_id || !teamId) return;
    this.api.updateFindingAssignment(this.selectedItem.finding_id, { team_id: teamId } as any).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.teamUpdated') });
        this.loadDetail(this.selectedItem.finding_id);
        this.selectedItem = { ...this.selectedItem, team_id: teamId };
        this.load();
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('common.failedToUpdateTeam') })
    });
  }

  onStatusTransition(newStatus: string | null): void {
    if (!newStatus || !this.selectedItem?.finding_id) return;
    this.api.updateFinding(this.selectedItem.finding_id, { status: newStatus }).subscribe({
      next: () => {
        this.pendingStatusChange = null;
        this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.statusUpdated') });
        this.selectedItem = { ...this.selectedItem, status: newStatus };
        this.loadDetail(this.selectedItem.finding_id);
        this.loadDrawerContext(this.selectedItem);
        this.load();
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('common.failedToUpdateStatus') })
    });
  }

  openCreateDialog() {
    this.editingFinding = false; this.editFindingId = '';
    this.findingForm = { title: '', description: '', severity: 'medium', status: 'open' };
    this.findingDialogVisible = true;
  }

  openEditDialog(f: GrcRecord) {
    this.editingFinding = true; this.editFindingId = f.finding_id;
    this.findingForm = { title: f.title, description: f.description || '', severity: f.severity, status: f.status };
    this.findingDialogVisible = true;
  }

  saveFinding() {
    const obs = this.editingFinding
      ? this.api.updateFinding(this.editFindingId, this.findingForm)
      : this.api.createFinding(this.findingForm as any);
    obs.subscribe({
      next: () => { this.findingDialogVisible = false; this.load(); this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.success') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('common.failedToSaveFinding') })
    });
  }

  deleteItem(id: string) {
    this.api.deleteFinding(id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.deleted') }); },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error') })
    });
  }

  saveRootCause() {
    this.api.addRootCause(this.selectedItem.finding_id, this.rootCauseForm as any).subscribe({
      next: () => { this.showRootCauseDialog = false; this.loadDetail(this.selectedItem.finding_id); this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.rootCauseAdded') }); this.rootCauseForm = { cause_type: '', description: '', analysis_method: '' }; },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error') })
    });
  }

  saveImpact() {
    this.api.addImpact(this.selectedItem.finding_id, this.impactForm as any).subscribe({
      next: () => { this.showImpactDialog = false; this.loadDetail(this.selectedItem.finding_id); this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.impactAdded') }); this.impactForm = { impact_type: '', severity: 'medium', description: '', financial_impact: null }; },
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error') })
    });
  }

  createCapaForFinding() {
    this.router.navigate(['/audit/capa'], { queryParams: { finding_id: this.selectedItem.finding_id, finding_title: this.selectedItem.title } });
  }

  navigateToCapa(id: string) { this.router.navigate(['/audit/capa'], { queryParams: { id } }); }

  syncing = false;
  showComplianceLinkDialog = false;
  complianceViolations = signal<GrcRecord[]>([]);
  selectedViolation: GrcRecord | null = null;
  linkingCompliance = false;

  syncToRisk() {
    if (!this.selectedItem?.finding_id) return;
    this.syncing = true;
    this.api.syncFindingToRisk(this.selectedItem.finding_id).subscribe({
      next: () => { this.syncing = false; this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.success'), detail: this.i18nSvc.translate('common.findingSyncedToRiskRegister') }); },
      error: () => { this.syncing = false; this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('common.failedToSyncToRiskRegister') }); }
    });
  }

  navigateToRisk() {
    this.router.navigate(['/risk/register'], { queryParams: { source: 'audit_finding', findingId: this.selectedItem?.finding_id } });
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  /** Opens the compliance violation picker dialog and loads available violations */
  openComplianceLinkDialog() {
    this.selectedViolation = null;
    this.showComplianceLinkDialog = true;
    this.complianceApi.getFindings({}, 1, 500).subscribe({
      next: (res) => this.complianceViolations.set(res?.items ?? []),
      error: () => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('common.failedToLoadComplianceViolations') })
    });
  }

  /** Links the currently selected audit finding to the chosen compliance violation */
  linkToCompliance() {
    if (!this.selectedItem?.finding_id || !this.selectedViolation?.violation_id) return;
    this.linkingCompliance = true;
    this.api.linkFindingToCompliance(this.selectedItem.finding_id, this.selectedViolation.violation_id).subscribe({
      next: () => {
        this.linkingCompliance = false;
        this.showComplianceLinkDialog = false;
        this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('common.success'), detail: this.i18nSvc.translate('common.findingLinkedToCompliance') });
        this.loadDetail(this.selectedItem.finding_id);
      },
      error: () => {
        this.linkingCompliance = false;
        this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('common.failedToLinkToCompliance') });
      }
    });
  }
}
