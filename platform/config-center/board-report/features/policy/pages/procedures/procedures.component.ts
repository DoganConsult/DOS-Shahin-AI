import { Component, OnInit, inject, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { FoundationDataService } from '@app/grc';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { getModuleTabs } from '@app/shared/contracts/module-tab-registry';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-procedures',
    imports: [
        CommonModule, FormsModule, PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent,
        TableModule, TagModule, ButtonModule, DialogModule,
        InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule, ExportButtonComponent,
        ConfirmDialogModule, AppDatePipe, RaciPanelComponent
    ],
    providers: [MessageService, ConfirmationService],
    template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Procedures & Standards" titleAr="الإجراءات والمعايير"
        subtitleEn="Manage operational procedures, standards and guidelines linked to policies"
        subtitleAr="إدارة إجراءات التشغيل والمعايير والمبادئ التوجيهية المرتبطة بالسياسات"
        icon="list"
        [breadcrumbs]="[i18n.translate('procedures.dashboard'), i18n.translate('procedures.governance'), i18n.translate('procedures.procedures')]"
        [actions]="headerActions" [isAr]="i18n.isAr()" [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />
      <app-raci-panel entityType="policy" [entityId]="editId || ''" [canEdit]="true" />
      <div class="gov-body">
      <p-toast />

      <div class="health-strip" *ngIf="loaded">
        <div tabindex="0" role="button" (keyup.enter)="clearHealthFilter()" class="hs-card" (click)="clearHealthFilter()"><div class="hs-value">{{ procedures.length }}</div><div class="hs-label">{{ i18n.translate('procedures.total') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('approved')" class="hs-card" (click)="applyHealthFilter('approved')"><div class="hs-value" style="color:var(--success)">{{ approvedPct }}%</div><div class="hs-label">{{ i18n.translate('procedures.approved') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('draft')" class="hs-card" (click)="applyHealthFilter('draft')"><div class="hs-value" style="color:#d97706">{{ draftCount }}</div><div class="hs-label">{{ i18n.translate('procedures.drafts') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('unlinked')" class="hs-card" (click)="applyHealthFilter('unlinked')"><div class="hs-value" style="color:var(--warning)">{{ unlinkedCount }}</div><div class="hs-label">{{ i18n.translate('procedures.noPolicyLink') }}</div></div>
        <div tabindex="0" role="button" (keyup.enter)="applyHealthFilter('no_review')" class="hs-card" (click)="applyHealthFilter('no_review')"><div class="hs-value" style="color:var(--error)">{{ noReviewCount }}</div><div class="hs-label">{{ i18n.translate('procedures.noReviewDate') }}</div></div>
      </div>

      <div class="page-toolbar">
        <div class="toolbar-primary">
          <p-button [label]="i18n.translate('procedures.addProcedure')" icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <div class="search-wrap">
            <i class="pi pi-search search-icon"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('procedures.searchProcedures')" [attr.aria-label]="i18n.translate('procedures.searchProcedures')" (input)="filterList()" class="search-input" />
          </div>
        </div>
        <div class="toolbar-secondary">
          <p-dropdown [options]="statusFilterOptions" [(ngModel)]="statusFilter" optionLabel="label" optionValue="value"
                      [placeholder]="i18n.translate('procedures.status')" (onChange)="filterList()" [style]="{minWidth:'130px'}" />
          <p-dropdown [options]="sopTypeOptions" [(ngModel)]="sopTypeFilter" optionLabel="label" optionValue="value"
                      [placeholder]="i18n.translate('procedures.sopType')" (onChange)="filterList()" [style]="{minWidth:'140px'}" />
          <app-export-button module="governance-procedures" [data]="filteredList" />
        </div>
      </div>

      <!-- Standards Library type-filter chips (G11) -->
      <div class="type-chips" *ngIf="loaded">
        <span tabindex="0" role="button" (keyup.enter)="setTypeTab('')" class="type-chip" [class.active]="!typeTabFilter" (click)="setTypeTab('')">
          {{ i18n.translate('procedures.all') }} ({{ procedures.length }})
        </span>
        <span tabindex="0" role="button" (keyup.enter)="setTypeTab('standard')" class="type-chip" [class.active]="typeTabFilter==='standard'" (click)="setTypeTab('standard')">
          {{ i18n.translate('procedures.standards') }} ({{ standardsCount }})
        </span>
        <span tabindex="0" role="button" (keyup.enter)="setTypeTab('procedure')" class="type-chip" [class.active]="typeTabFilter==='procedure'" (click)="setTypeTab('procedure')">
          {{ i18n.translate('procedures.proceduresLabel') }} ({{ proceduresCount }})
        </span>
        <span tabindex="0" role="button" (keyup.enter)="setTypeTab('guideline')" class="type-chip" [class.active]="typeTabFilter==='guideline'" (click)="setTypeTab('guideline')">
          {{ i18n.translate('procedures.guidelines') }} ({{ guidelinesCount }})
        </span>
      </div>

      <div class="table-shell" *ngIf="filteredList.length > 0">
      <p-table aria-label="Filtered List table" [value]="filteredList" [paginator]="filteredList.length > 10" [rows]="10"
               styleClass="p-datatable-striped p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="title">{{ i18n.translate('procedures.procedureStandard') }}</th>
            <th>{{ i18n.translate('procedures.status') }}</th>
            <th>{{ i18n.translate('procedures.sopType') }}</th>
            <th pSortableColumn="version">{{ i18n.translate('procedures.version') }}</th>
            <th>{{ i18n.translate('procedures.linkedPolicy') }}</th>
            <th>{{ i18n.translate('procedures.linkedControls') }}</th>
            <th>{{ i18n.translate('procedures.owner') }}</th>
            <th>{{ i18n.translate('procedures.reviewDate') }}</th>
            <th style="width:140px">{{ i18n.translate('procedures.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-p>
          <tr>
            <td><strong>{{ p.title }}</strong></td>
            <td><app-status-badge [status]="p.approval_status || p.status" /></td>
            <td><p-tag [value]="p.sop_type || 'operational'" severity="info" /></td>
            <td>v{{ p.version }}</td>
            <td>{{ p.linked_policy_title || '—' }}</td>
            <td>
              <span *ngIf="p.control_count || p.linked_controls_count; else noControls">
                <p-tag [value]="(p.control_count || p.linked_controls_count) + ' ' + i18n.translate('procedures.controlsLabel')" severity="secondary" />
              </span>
              <ng-template #noControls><span class="text-muted-xs">—</span></ng-template>
            </td>
            <td>{{ p.owner || '—' }}</td>
            <td>{{ p.next_review_date | appDate:'medium' }}</td>
            <td>
              <div class="action-btns">
                <button aria-label="Edit" class="icon-btn" (click)="openEditDialog(p)" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
                <button aria-label="Approve" class="icon-btn approve" (click)="approve(p)" pTooltip="Approve" *ngIf="p.approval_status !== 'approved'"><i class="pi pi-check-circle"></i></button>
                <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(p)" pTooltip="Delete"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="empty-msg">{{ i18n.translate('procedures.noProcedures') }}</td></tr>
        </ng-template>
      </p-table>
      </div>

      <div *ngIf="loaded && filteredList.length === 0" class="empty-state">
        <i class="pi pi-list empty-icon"></i>
        <p>{{ i18n.translate('procedures.noProcedures') }}</p>
        <p-button [label]="i18n.translate('procedures.addProcedure')" icon="pi pi-plus" (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <p-dialog [header]="editMode ? i18n.translate('procedures.editProcedure') : i18n.translate('procedures.addProcedure')"
                [(visible)]="showDialog" [modal]="true" [style]="{width:'600px'}">
        <div class="flex flex-column gap-3 pt-2">
          <input pInputText [(ngModel)]="form.title" [placeholder]="i18n.translate('procedures.procedureTitle')" [attr.aria-label]="i18n.translate('procedures.procedureTitle')" class="w-full" />
          <textarea pInputTextarea [(ngModel)]="form.content" rows="5" class="w-full"
                    [placeholder]="i18n.translate('procedures.procedureContent')" [attr.aria-label]="i18n.translate('procedures.procedureContent')"></textarea>
          <input pInputText [(ngModel)]="form.description" [placeholder]="i18n.translate('procedures.description')" [attr.aria-label]="i18n.translate('procedures.description')" class="w-full" />
          <p-dropdown [options]="categoryOptions" [(ngModel)]="form.category" optionLabel="label" optionValue="value"
                      [placeholder]="i18n.translate('procedures.category')" class="w-full" />
          <p-dropdown [options]="sopTypeOptions" [(ngModel)]="form.sop_type" optionLabel="label" optionValue="value"
                      [placeholder]="i18n.translate('procedures.sopTypeLabel')" class="w-full" />
          <p-dropdown [options]="policyOptions" [(ngModel)]="form.linked_policy_id" optionLabel="label" optionValue="value"
                      [placeholder]="i18n.translate('procedures.linkToPolicy')"
                      [showClear]="true" class="w-full" filter="true" />
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('procedures.cancel')" icon="pi pi-times" (onClick)="showDialog=false" [text]="true" />
          <p-button [label]="editMode ? i18n.translate('procedures.save') : i18n.translate('procedures.create')"
                    icon="pi pi-check" (onClick)="save()" [disabled]="!form.title || !form.content" />
        </ng-template>
      </p-dialog>
      </div>
    </div>
    <p-confirmDialog />
  `,
    styles: [`
    :host { display: flex; flex-direction: column; min-height: 100%; }
    .gov-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ice, var(--surface-ice)); }
    .gov-body { flex: 1; padding: 16px 24px 32px; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
    @media (max-width: 768px) { .gov-body { padding: 12px; gap: 10px; } }
    .health-strip { display: flex; gap: 10px; flex-wrap: wrap; }
    .hs-card { flex: 1; min-width: 90px; text-align: center; padding: 10px 6px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); cursor: pointer; transition: box-shadow .15s; }
    .hs-card:hover { box-shadow: var(--shadow-card); }
    .hs-value { font-size: var(--font-size-lg); font-weight: 700; color: var(--text-heading, #111); }
    .hs-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); padding: 10px 14px; }
    .toolbar-primary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .toolbar-secondary { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .search-wrap { position: relative; display: inline-flex; align-items: center; }
    .search-icon { position: absolute; inset-inline-start: 10px; color: var(--text-muted, #9ca3af); font-size: var(--font-size-sm); z-index: var(--z-base); pointer-events: none; }
    .search-input { min-width: 200px; padding-inline-start: 32px; }
    @media (max-width: 768px) { .page-toolbar { flex-direction: column; align-items: stretch; } .toolbar-primary, .toolbar-secondary { width: 100%; justify-content: space-between; } .search-input { min-width: 0; flex: 1; } }
    .type-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .type-chip { padding: 6px 14px; border-radius: var(--radius-xl); font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); color: var(--text-muted, var(--text-muted)); transition: all .15s; }
    .type-chip:hover { border-color: var(--primary-300, #93c5fd); color: var(--primary-600, #2563eb); }
    .type-chip.active { background: var(--primary-500, var(--primary)); border-color: var(--primary-500, var(--primary)); color: #fff; }
    .table-shell { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; direction: ltr; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted, var(--text-muted)); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; color: var(--text-muted, #9ca3af); }
    .empty-msg { text-align: center; padding: 32px; color: var(--text-muted, var(--text-muted)); }
    .action-btns { display: flex; gap: 4px; align-items: center; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; border-radius: var(--radius-sm); border: 1px solid transparent; background: none; cursor: pointer; transition: all .15s; font-size: var(--font-size-base); color: var(--text-muted, var(--text-muted)); }
    .icon-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-300, #93c5fd); color: var(--primary-600, #2563eb); }
    .icon-btn.approve { color: var(--success); } .icon-btn.approve:hover { background: #ecfdf5; border-color: #6ee7b7; }
    .icon-btn.danger { color: var(--error); } .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); border-color: #fca5a5; }
    .text-muted-xs { font-size: var(--font-size-sm); color: var(--text-muted, #9ca3af); }
  `]
})
export class ProceduresComponent implements OnInit {
    private governanceSvc = inject(GrcGovernanceService);
  i18n = inject(I18nService);
  private confirmSvc = inject(ConfirmationService);
  private msg = inject(MessageService);
  private foundationData = inject(FoundationDataService);

  policyOptions: { label: string; value: string }[] = [];

  readonly tabs = getModuleTabs('governance');
  readonly headerActions: PageHeaderAction[] = [
    { id: 'add', labelEn: 'Add Procedure', labelAr: 'إضافة إجراء', icon: 'plus', primary: true },
    { id: 'export', labelEn: 'Export', labelAr: 'تصدير', icon: 'download' },
  ];
  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  onHeaderAction(id: string): void { if (id === 'add') this.openCreateDialog(); }

  loaded = false;
  procedures: Record<string, any>[] = [];
  filteredList: Record<string, any>[] = [];
  searchTerm = '';
  statusFilter = '';
  sopTypeFilter = '';
  healthFilter = '';
  typeTabFilter = '';

  standardsCount = 0;
  proceduresCount = 0;
  guidelinesCount = 0;

  setTypeTab(type: string): void {
    this.typeTabFilter = type;
    this.filterList();
  }
  showDialog = false;
  editMode = false;
  editId = '';
  form: Record<string, any> = { title: '', content: '', description: '', category: 'general', sop_type: 'operational', linked_policy_id: '' };

  approvedPct = 0;
  draftCount = 0;
  unlinkedCount = 0;
  noReviewCount = 0;

  statusFilterOptions = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Approved', value: 'approved' },
    { label: 'Review', value: 'review' },
  ];

  sopTypeOptions = [
    { label: 'All', value: '' },
    { label: 'Operational', value: 'operational' },
    { label: 'Security', value: 'security' },
    { label: 'Compliance', value: 'compliance' },
    { label: 'Incident Response', value: 'incident_response' },
    { label: 'Change Management', value: 'change_management' },
    { label: 'Access Control', value: 'access_control' },
    { label: 'Data Protection', value: 'data_protection' },
    { label: 'Business Continuity', value: 'business_continuity' },
  ];

  categoryOptions = [
    { label: 'General', value: 'general' },
    { label: 'IT', value: 'it' },
    { label: 'HR', value: 'hr' },
    { label: 'Finance', value: 'finance' },
    { label: 'Legal', value: 'legal' },
    { label: 'Operations', value: 'operations' },
    { label: 'Security', value: 'security' },
    { label: 'Privacy', value: 'privacy' },
  ];

  ngOnInit(): void {
    this.load();
    this.governanceSvc.getGovernancePolicies().subscribe({
      next: (res: Record<string, any>) => {
        const policies = res.policies || res || [];
        this.policyOptions = policies.map((p: Record<string, unknown>) => ({ label: p.title, value: p.policy_id }));
      },
      error: (e: unknown) => devError("[API]", e),
    });
  }

  load(): void {
    this.governanceSvc.getProcedures().subscribe({
      next: (res: Record<string, any>) => {
        this.procedures = res.procedures || [];
        this.computeHealth();
        this.filterList();
        this.loaded = true;
      },
      error: () => { this.procedures = []; this.filteredList = []; this.loaded = true; },
    });
  }

  computeHealth(): void {
    const total = this.procedures.length;
    const approved = this.procedures.filter(p => (p.approval_status || p.status) === 'approved').length;
    this.approvedPct = total ? Math.round((approved / total) * 100) : 0;
    this.draftCount = this.procedures.filter(p => (p.approval_status || p.status) === 'draft').length;
    this.unlinkedCount = this.procedures.filter(p => !p.linked_policy_id).length;
    this.noReviewCount = this.procedures.filter(p => !p.next_review_date).length;
    this.standardsCount  = this.procedures.filter(p => (p.sop_type || p.type) === 'standard').length;
    this.proceduresCount = this.procedures.filter(p => (p.sop_type || p.type) === 'procedure' || !(p.sop_type || p.type) || (p.sop_type || p.type) === 'operational').length;
    this.guidelinesCount = this.procedures.filter(p => (p.sop_type || p.type) === 'guideline').length;
  }

  applyHealthFilter(filter: string): void {
    this.healthFilter = filter;
    this.statusFilter = '';
    this.sopTypeFilter = '';
    this.filterList();
  }

  clearHealthFilter(): void {
    this.healthFilter = '';
    this.filterList();
  }

  filterList(): void {
    let list = [...this.procedures];

    if (this.healthFilter === 'approved') list = list.filter(p => (p.approval_status || p.status) === 'approved');
    else if (this.healthFilter === 'draft') list = list.filter(p => (p.approval_status || p.status) === 'draft');
    else if (this.healthFilter === 'unlinked') list = list.filter(p => !p.linked_policy_id);
    else if (this.healthFilter === 'no_review') list = list.filter(p => !p.next_review_date);

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(p => p.title?.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term));
    }
    if (this.statusFilter) list = list.filter(p => (p.approval_status || p.status) === this.statusFilter);
    if (this.sopTypeFilter) list = list.filter(p => p.sop_type === this.sopTypeFilter);
    if (this.typeTabFilter === 'standard')  list = list.filter(p => (p.sop_type || p.type) === 'standard');
    else if (this.typeTabFilter === 'procedure') list = list.filter(p => !p.sop_type || p.sop_type === 'procedure' || p.sop_type === 'operational');
    else if (this.typeTabFilter === 'guideline') list = list.filter(p => (p.sop_type || p.type) === 'guideline');
    this.filteredList = list;
  }

  openCreateDialog(): void {
    this.editMode = false;
    this.editId = '';
    this.form = { title: '', content: '', description: '', category: 'general', sop_type: 'operational', linked_policy_id: '' };
    this.showDialog = true;
  }

  openEditDialog(p: Record<string, any>): void {
    this.editMode = true;
    this.editId = p.procedure_id;
    this.form = { title: p.title, content: p.content, description: p.description || '', category: p.category || 'general', sop_type: p.sop_type || 'operational', linked_policy_id: p.linked_policy_id || '' };
    this.showDialog = true;
  }

  save(): void {
    const payload = { ...this.form };
    if (!payload.linked_policy_id) delete payload.linked_policy_id;
    const obs = this.editMode
      ? this.governanceSvc.updateProcedure(this.editId, payload as any)
      : this.governanceSvc.createProcedure(payload as any);
    obs.subscribe({
      next: () => { this.showDialog = false; this.load(); this.msg.add({ severity: 'success', summary: this.editMode ? this.i18n.translate('common.updated') : this.i18n.translate('common.created'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.saveFailed'), life: 4000 }); },
    });
  }

  approve(p: Record<string, any>): void {
    this.governanceSvc.approveProcedure(p.procedure_id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.approved'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.approveFailed'), life: 4000 }); },
    });
  }

  confirmDelete(p: Record<string, any>): void {
    this.confirmSvc.confirm({
      message: `Delete procedure "${p.title}"?`,
      header: "Confirm",
      icon: "pi pi-exclamation-triangle",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
      this.governanceSvc.deleteProcedure(p.procedure_id).subscribe({
      next: () => { this.load(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted'), life: 3000 }); },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.deleteFailed'), life: 4000 }); },
      });
      },
    });
  }
}
