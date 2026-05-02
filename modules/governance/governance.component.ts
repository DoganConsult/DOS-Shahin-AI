import { Component, OnInit, ChangeDetectorRef, DestroyRef, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { ToolbarModule } from 'primeng/toolbar';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { EntityDetailDrawerComponent } from '@app/shared/components/entity/entity-detail-drawer.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';
import { GrcOperationsService } from '@app/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-governance',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, GrcDataTableComponent, StatusBadgeComponent,
    GrcFormFieldComponent, TableModule, TabViewModule, ButtonModule, DialogModule,
    InputTextModule, InputTextarea, ToolbarModule,
    CardModule, ToastModule, TagModule, TooltipModule, EntityDetailDrawerComponent,
    AiPanelComponent, ToastModule, ExportButtonComponent,
  ],
  providers: [MessageService],
  templateUrl: './governance.component.html',
  styleUrls: ['./governance.component.scss'],
})
export class GovernanceComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  tabIndex = 0;
  policies: Record<string, unknown>[] = [];
  committees: Record<string, unknown>[] = [];
  loading = true;
  showPolicyDialog = false;
  showCommitteeDialog = false;
  newPolicy = { title: '', content: '' };
  newCommittee = { name: '', purpose: '' };

  // Edit state
  editingPolicy: Record<string, unknown> | null = null;
  editingCommittee: Record<string, unknown> | null = null;

  // Delete confirmation state
  showDeletePolicyDialog = false;
  showDeleteCommitteeDialog = false;
  deletePolicyTarget: Record<string, unknown> | null = null;
  deleteCommitteeTarget: Record<string, unknown> | null = null;

  // RACI panel state
  raciPanelVisible = false;
  raciLoading = false;
  raciMatrix: Record<string, unknown> | null = null;
  raciScopeLabel = '';

  constructor(
    public i18n: I18nService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef, private governanceSvc: GrcGovernanceService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadPolicies();
      this.loadCommittees();
    });
    this.loadPolicies();
    this.loadCommittees();
  }

  loadPolicies(): void {
    this.governanceSvc.getGovernancePolicies().subscribe({
      next: (r: Record<string, unknown>) => {
        this.policies = r.policies || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadPolicies'), life: 4000 });
      }
    });
  }

  loadCommittees(): void {
    this.governanceSvc.getCommittees().subscribe({
      next: (r: Record<string, unknown>) => {
        this.committees = r.committees || [];
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadCommittees'), life: 4000 });
      }
    });
  }

  // ── Policy CRUD ──────────────────────────────────────────────────────────

  openCreatePolicy(): void {
    this.editingPolicy = null;
    this.newPolicy = { title: '', content: '' };
    this.showPolicyDialog = true;
  }

  openEditPolicy(p: Record<string, unknown>): void {
    this.editingPolicy = p;
    this.newPolicy = { title: p.title || '', content: p.content || '' };
    this.showPolicyDialog = true;
  }

  savePolicy(): void {
    if (!this.newPolicy.title) return;
    const isEdit = !!this.editingPolicy;
    const obs = isEdit
      ? this.governanceSvc.updatePolicy(this.editingPolicy.policy_id || this.editingPolicy.id, this.newPolicy)
      : this.governanceSvc.createPolicy(this.newPolicy);
    obs.subscribe({
      next: () => {
        this.showPolicyDialog = false;
        this.editingPolicy = null;
        this.newPolicy = { title: '', content: '' };
        this.loadPolicies();
        this.messageService.add({
          severity: 'success',
          summary: this.i18n.translate('common.success'),
          detail: isEdit ? this.i18n.translate('governance.policyUpdated') : this.i18n.translate('governance.policyCreated'),
          life: 3000
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.operationFailed'), life: 4000 });
      }
    });
  }

  confirmDeletePolicy(p: Record<string, unknown>): void {
    this.deletePolicyTarget = p;
    this.showDeletePolicyDialog = true;
  }

  deletePolicy(): void {
    if (!this.deletePolicyTarget) return;
    this.governanceSvc.deletePolicy(this.deletePolicyTarget.policy_id || this.deletePolicyTarget.id).subscribe({
      next: () => {
        this.showDeletePolicyDialog = false;
        this.deletePolicyTarget = null;
        this.loadPolicies();
        this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.deleted'), detail: this.i18n.translate('common.policyRemoved'), life: 3000 });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.deleteFailed'), life: 4000 });
      }
    });
  }

  approve(id: string): void {
    this.governanceSvc.approvePolicy(id).subscribe({
      next: () => {
        this.loadPolicies();
        this.messageService.add({
          severity: 'success',
          summary: this.i18n.translate('common.success'),
          detail: this.i18n.translate('governance.policyApproved'),
          life: 3000
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToApprovePolicy'), life: 4000 });
      }
    });
  }

  // ── Committee CRUD ───────────────────────────────────────────────────────

  openCreateCommittee(): void {
    this.editingCommittee = null;
    this.newCommittee = { name: '', purpose: '' };
    this.showCommitteeDialog = true;
  }

  openEditCommittee(c: Record<string, unknown>): void {
    this.editingCommittee = c;
    this.newCommittee = { name: c.name || '', purpose: c.purpose || '' };
    this.showCommitteeDialog = true;
  }

  saveCommittee(): void {
    if (!this.newCommittee.name) return;
    const isEdit = !!this.editingCommittee;
    const obs = isEdit
      ? this.governanceSvc.updateCommittee(this.editingCommittee.committee_id || this.editingCommittee.id, this.newCommittee)
      : this.governanceSvc.createCommittee(this.newCommittee);
    obs.subscribe({
      next: () => {
        this.showCommitteeDialog = false;
        this.editingCommittee = null;
        this.newCommittee = { name: '', purpose: '' };
        this.loadCommittees();
        this.messageService.add({
          severity: 'success',
          summary: this.i18n.translate('common.success'),
          detail: isEdit ? this.i18n.translate('governance.committeeUpdated') : this.i18n.translate('governance.committeeCreated'),
          life: 3000
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.operationFailed'), life: 4000 });
      }
    });
  }

  confirmDeleteCommittee(c: Record<string, unknown>): void {
    this.deleteCommitteeTarget = c;
    this.showDeleteCommitteeDialog = true;
  }

  deleteCommittee(): void {
    if (!this.deleteCommitteeTarget) return;
    this.governanceSvc.deleteCommittee(this.deleteCommitteeTarget.committee_id || this.deleteCommitteeTarget.id).subscribe({
      next: () => {
        this.showDeleteCommitteeDialog = false;
        this.deleteCommitteeTarget = null;
        this.loadCommittees();
        this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.deleted'), detail: this.i18n.translate('common.committeeRemoved'), life: 3000 });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.deleteFailed'), life: 4000 });
      }
    });
  }

  // ── RACI ─────────────────────────────────────────────────────────────────

  viewRaci(scopeType: string, scopeId: string, label: string): void {
    this.raciScopeLabel = label || scopeId;
    this.raciMatrix = null;
    this.raciLoading = true;
    this.raciPanelVisible = true;
    this.operationsSvc.getRACIMatrix(scopeType, scopeId).subscribe({
      next: (data: any) => { this.raciMatrix = data; this.raciLoading = false; this.cdr.detectChanges(); },
      error: () => { this.raciMatrix = { responsible: [], accountable: [], consulted: [], informed: [] }; this.raciLoading = false; this.cdr.detectChanges(); }
    });
  }

  raciLetter(role: string): string {
    return { responsible: 'R', accountable: 'A', consulted: 'C', informed: 'I' }[role] ?? role[0].toUpperCase();
  }

  raciSev(role: string): 'success' | 'info' | 'warning' | 'secondary' | 'danger' | 'contrast' {
    const m: Record<string, 'success' | 'info' | 'warning' | 'secondary'> = { responsible: 'success', accountable: 'info', consulted: 'warning', informed: 'secondary' };
    return m[role] ?? 'secondary';
  }

}
