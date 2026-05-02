import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { GrcLiveService } from '../../core/interceptors/grc-live.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { PageShellComponent } from '../../shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '../../shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '../../shared/ai-panel/ai-panel.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-governance-os',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, StatusBadgeComponent, AiPanelComponent,
    TableModule, TagModule, ToolbarModule, ButtonModule, DialogModule,
    InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="landmark"
      [title]="i18n.translate('governanceOs.title')"
      [subtitle]="i18n.translate('governanceOs.subtitle')"
      [breadcrumbs]="['Dashboard', 'Governance OS']"
      [loading]="!loaded">

      <p-toast />

      <!-- ===== COMMITTEES SECTION (CRUD) ===== -->
      <h3 class="section-title">{{ i18n.translate('governanceOs.committees') }}</h3>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button
            [label]="i18n.translate('governanceOs.addCommittee')"
            icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('governanceOs.search')" [attr.aria-label]="i18n.translate('governanceOs.search')"
                   (input)="filterCommittees()" class="search-input" />
          </span>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('common.export')" icon="pi pi-download" severity="secondary"
                    [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Filtered Committees table" [value]="filteredCommittees" [paginator]="filteredCommittees.length > 10"
               [rows]="10" styleClass="p-datatable-striped p-datatable-gridlines"
               *ngIf="filteredCommittees.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('common.name') }}</th>
            <th>{{ i18n.translate('governanceOs.chair') }}</th>
            <th>{{ i18n.translate('governanceOs.members') }}</th>
            <th>{{ i18n.translate('common.status') }}</th>
            <th style="width:120px">{{ i18n.translate('common.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><strong>{{ item.name ?? item.title }}</strong></td>
            <td>{{ item.chair ?? item.chairperson ?? '-' }}</td>
            <td>{{ item.member_count ?? item.members?.length ?? 0 }}</td>
            <td><app-status-badge [status]="item.status ?? 'active'" /></td>
            <td>
              <div class="action-btns">
                <button aria-label="Edit" class="icon-btn" (click)="openEditDialog(item)" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
                <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(item)" pTooltip="Delete"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="99" class="empty-msg">{{ i18n.translate('common.noData') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && filteredCommittees.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('governanceOs.noCommittees') }}</p>
        <p-button [label]="i18n.translate('governanceOs.addCommittee')" icon="pi pi-plus"
                  (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <!-- ===== POLICIES SECTION (Read-Only) ===== -->
      <h3 class="section-title mt-4">{{ i18n.translate('governanceOs.policies') }}</h3>

      <p-table aria-label="Policies table" [value]="policies" [paginator]="policies.length > 10"
               [rows]="10" styleClass="p-datatable-striped p-datatable-gridlines"
               *ngIf="policies.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('common.name') }}</th>
            <th>{{ i18n.translate('governanceOs.category') }}</th>
            <th>{{ i18n.translate('common.owner') }}</th>
            <th>{{ i18n.translate('common.status') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-p>
          <tr>
            <td><strong>{{ p.name ?? p.title ?? p.policy_name }}</strong></td>
            <td>{{ p.category ?? p.policy_type ?? '-' }}</td>
            <td>{{ p.owner ?? p.policy_owner ?? '-' }}</td>
            <td><app-status-badge [status]="p.status ?? 'draft'" /></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="99" class="empty-msg">{{ i18n.translate('governanceOs.noPolicies') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && policies.length === 0" class="empty-state-sm">
        <p>{{ i18n.translate('governanceOs.noPolicies') }}</p>
      </div>

      <!-- Committee Create/Edit Dialog -->
      <p-dialog
        [header]="editMode
          ? i18n.translate('governanceOs.editCommittee')
          : i18n.translate('governanceOs.addNewCommittee')"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('common.name') }}</label>
            <input pInputText [(ngModel)]="form.name" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('common.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('governanceOs.chair') }}</label>
              <input pInputText [(ngModel)]="form.chair" class="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('governanceOs.meetingFrequency') }}</label>
              <p-dropdown [(ngModel)]="form.meeting_frequency" [options]="frequencyOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('common.status') }}</label>
            <p-dropdown [(ngModel)]="form.status" [options]="statusOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times"
                    severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="i18n.translate('common.save')" icon="pi pi-check"
                    (onClick)="saveItem()" [disabled]="!form.name" />
        </ng-template>
      </p-dialog>

      <!-- Confirm Delete Dialog -->
      <p-dialog [header]="i18n.translate('governanceOs.confirmDelete')"
                [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('governanceOs.confirmDeleteMessage') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true"
                    (onClick)="showDeleteDialog = false" />
          <p-button [label]="i18n.translate('common.delete')" icon="pi pi-trash"
                    severity="danger" (onClick)="deleteItem()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
    <app-ai-panel module="governance-os" />
  `,
  styles: [`
    .mb-3 { margin-bottom: var(--space-md); }
    .ms-3 { margin-inline-start: 12px; }
    .mt-4 { margin-top: 2rem; }
    .search-input { min-width: 220px; }
    .section-title { font-size: var(--font-size-xl); font-weight: 600; color: var(--text-heading); margin: 0 0 12px 0; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: var(--space-xl); }
    .empty-state { text-align: center; padding: var(--space-2xl); color: var(--text-muted); }
    .empty-state-sm { text-align: center; padding: var(--space-lg); color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: var(--space-md); display: block; }
    .action-btns { display: flex; gap: 4px; }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 6px; border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .w-full { width: 100%; }
  `]
})
export class GovernanceOSComponent implements OnInit {
    private governanceSvc = inject(GrcGovernanceService);
  committees: Record<string, unknown>[] = [];
  filteredCommittees: Record<string, unknown>[] = [];
  policies: Record<string, unknown>[] = [];
  loaded = false;
  searchTerm = '';
  showDialog = false;
  showDeleteDialog = false;
  editMode = false;
  editingId: string | null = null;
  deleteTarget: Record<string, unknown> | null = null;
  form: Record<string, unknown> = { name: '', description: '', chair: '', meeting_frequency: 'monthly', status: 'active' };
  statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];
  frequencyOptions = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Annual', value: 'annual' },
  ];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(
    public i18n: I18nService,
    private msg: MessageService, private apiclientSvc: ApiClientService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    forkJoin({
      committees: this.apiclientSvc.get('/governance/committees'),
      policies: this.governanceSvc.getGovernancePolicies(),
    }).subscribe({
      next: (res: Record<string, unknown>) => {
        const cData = res.committees?.committees ?? res.committees;
        this.committees = Array.isArray(cData) ? cData : (cData?.items ?? cData?.data ?? []);
        const pData = res.policies?.policies ?? res.policies;
        this.policies = Array.isArray(pData) ? pData : (pData?.items ?? pData?.data ?? []);
        this.filterCommittees();
        this.loaded = true;
      },
      error: () => { this.loaded = true; }
    });
  }

  filterCommittees(): void {
    let r = this.committees;
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter(i =>
        (i.name ?? i.title ?? '').toLowerCase().includes(t) ||
        (i.chair ?? i.chairperson ?? '').toLowerCase().includes(t)
      );
    }
    this.filteredCommittees = r;
  }

  openCreateDialog(): void {
    this.editMode = false; this.editingId = null;
    this.form = { name: '', description: '', chair: '', meeting_frequency: 'monthly', status: 'active' };
    this.showDialog = true;
  }

  openEditDialog(item: Record<string, unknown>): void {
    this.editMode = true; this.editingId = item.committee_id ?? item.id;
    this.form = {
      name: item.name ?? item.title,
      description: item.description ?? '',
      chair: item.chair ?? item.chairperson ?? '',
      meeting_frequency: item.meeting_frequency ?? 'monthly',
      status: item.status ?? 'active',
    };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.name) return;
    const obs = this.editMode && this.editingId
      ? this.apiclientSvc.put('/governance/committees/' + this.editingId, this.form)
      : this.apiclientSvc.post('/governance/committees', this.form);
    obs.subscribe({
      next: () => {
        this.showDialog = false; this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.editMode ? this.i18n.translate('governanceOs.updated') : this.i18n.translate('governanceOs.created'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('governanceOs.operationFailed'), life: 4000 }); }
    });
  }

  confirmDelete(item: Record<string, unknown>): void { this.deleteTarget = item; this.showDeleteDialog = true; }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.committee_id ?? this.deleteTarget.id;
    this.apiclientSvc.del('/governance/committees/' + id).subscribe({
      next: () => {
        this.showDeleteDialog = false; this.deleteTarget = null; this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('governanceOs.deleted'), detail: this.i18n.translate('governanceOs.recordRemoved'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('governanceOs.deleteFailed'), life: 4000 }); }
    });
  }

  exportCSV(): void {
    if (!this.filteredCommittees.length) return;
    const headers = Object.keys(this.filteredCommittees[0]);
    const csv = [headers.join(','), ...this.filteredCommittees.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'committees.csv'; a.click();
  }
}
