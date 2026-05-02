import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GrcLiveService } from '../../../core/interceptors/grc-live.service';
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
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-esg',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, StatusBadgeComponent, AiPanelComponent,
    TableModule, TagModule, ToolbarModule, ButtonModule, DialogModule,
    InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule, AppDatePipe,],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="leaf"
      [title]="i18n.translate('esg.title')"
      [subtitle]="i18n.translate('esg.subtitle')"
      [breadcrumbs]="['Dashboard', 'ESG']"
      [loading]="!loaded">

      <p-toast />

      <!-- KPI Row -->
      <div class="kpi-row" *ngIf="loaded">
        <div class="kpi-card">
          <span class="kpi-value">{{ controlsTotal }}</span>
          <span class="kpi-label">{{ i18n.translate('esg.totalControls') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">{{ controlsEffective }}</span>
          <span class="kpi-label">{{ i18n.translate('esg.effectiveControls') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">{{ complianceScore }}%</span>
          <span class="kpi-label">{{ i18n.translate('esg.complianceScore') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">{{ policiesApproved }}/{{ policiesTotal }}</span>
          <span class="kpi-label">{{ i18n.translate('esg.policiesApproved') }}</span>
        </div>
      </div>

      <!-- Remediations Section -->
      <h3 class="section-title" *ngIf="loaded">{{ i18n.translate('esg.remediations') }}</h3>

      <p-toolbar styleClass="mb-3" *ngIf="loaded">
        <ng-template pTemplate="start">
          <p-button
            [label]="i18n.translate('esg.addRemediation')"
            icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('esg.search')" [attr.aria-label]="i18n.translate('esg.search')"
                   (input)="filterItems()" class="search-input" />
          </span>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button label="Export" icon="pi pi-download" severity="secondary"
                    [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10"
               [rows]="10" styleClass="p-datatable-striped p-datatable-gridlines"
               *ngIf="filteredItems.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('esg.headerTitle') }}</th>
            <th>{{ i18n.translate('esg.priority') }}</th>
            <th>{{ i18n.translate('esg.status') }}</th>
            <th>{{ i18n.translate('esg.dueDate') }}</th>
            <th style="width:120px">{{ i18n.translate('esg.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><strong>{{ item.title ?? item.description ?? '—' }}</strong></td>
            <td><app-status-badge [status]="item.priority ?? 'medium'" /></td>
            <td><app-status-badge [status]="item.status ?? 'open'" /></td>
            <td>{{ item.due_date ? (item.due_date | appDate:'medium') : '—' }}</td>
            <td>
              <div class="action-btns">
                <button aria-label="Edit" class="icon-btn" (click)="openEditDialog(item)" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
                <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(item)" pTooltip="Delete"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="99" class="empty-msg">{{ i18n.translate('esg.noData') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('esg.noRemediations') }}</p>
        <p-button [label]="i18n.translate('esg.addRemediation')" icon="pi pi-plus"
                  (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <p-dialog
        [header]="editMode ? i18n.translate('esg.editRemediation') : i18n.translate('esg.newRemediation')"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('esg.headerTitle') }}</label>
            <input pInputText [(ngModel)]="form.title" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('esg.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('esg.priority') }}</label>
              <p-dropdown [(ngModel)]="form.priority" [options]="priorityOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('esg.status') }}</label>
              <p-dropdown [(ngModel)]="form.status" [options]="statusOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('esg.dueDate') }}</label>
            <input pInputText type="date" [(ngModel)]="form.due_date" class="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('esg.cancel')" icon="pi pi-times"
                    severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="i18n.translate('esg.save')" icon="pi pi-check"
                    (onClick)="saveItem()" [disabled]="!form.title" />
        </ng-template>
      </p-dialog>

      <p-dialog [header]="i18n.translate('esg.confirmDelete')"
                [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('esg.confirmDeleteMsg') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('esg.cancel')" severity="secondary" [text]="true"
                    (onClick)="showDeleteDialog = false" />
          <p-button [label]="i18n.translate('esg.delete')" icon="pi pi-trash"
                    severity="danger" (onClick)="deleteItem()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
    <app-ai-panel module="esg" />
  `,
  styles: [`
    .mb-3 { margin-bottom: var(--space-md); }
    .ms-3 { margin-inline-start: 12px; }
    .search-input { min-width: 220px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: var(--space-xl); }
    .empty-state { text-align: center; padding: var(--space-2xl); color: var(--text-muted); }
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
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-lg); padding: 20px; text-align: center; }
    .kpi-value { display: block; font-size: var(--font-size-3xl); font-weight: 600; color: var(--primary-color, var(--primary)); }
    .kpi-label { display: block; font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    .section-title { font-size: var(--font-size-lg); font-weight: 700; margin: 0 0 16px; }
  `]
})
export class ESGComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private operationsSvc = inject(GrcOperationsService);
  items: Record<string, unknown>[] = [];
  filteredItems: Record<string, unknown>[] = [];
  loaded = false;
  searchTerm = '';
  showDialog = false;
  showDeleteDialog = false;
  editMode = false;
  editingId: string | null = null;
  deleteTarget: Record<string, unknown> | null = null;
  form: Record<string, unknown> = { title: '', description: '', priority: 'medium', status: 'open', due_date: '' };

  // KPI data
  controlsTotal = 0;
  controlsEffective = 0;
  complianceScore = 0;
  policiesApproved = 0;
  policiesTotal = 0;

  statusOptions = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
  ];
  priorityOptions = [
    { label: 'Critical', value: 'critical' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(
    public i18n: I18nService,
    private msg: MessageService, private complianceSvc: GrcComplianceService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    forkJoin({
      compliance: this.complianceSvc.getComplianceOverview().pipe(catchError(() => of({}))),
      kpis: this.operationsSvc.getAnalyticsKPIs().pipe(catchError(() => of({}))),
      remediations: this.complianceSvc.getRemediations().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ compliance, kpis, remediations }: any) => {
        this.controlsTotal = compliance?.controls?.total ?? 0;
        this.controlsEffective = compliance?.controls?.effective ?? 0;
        this.policiesApproved = compliance?.policies?.approved ?? 0;
        this.policiesTotal = compliance?.policies?.total ?? 0;
        this.complianceScore = kpis?.complianceScore ?? 0;

        const remList = remediations?.remediations ?? (Array.isArray(remediations) ? remediations : (remediations?.data ?? []));
        this.items = remList;
        this.filterItems();
        this.loaded = true;
      },
      error: () => { this.loaded = true; }
    });
  }

  filterItems(): void {
    let r = this.items;
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter(i => (i.title ?? i.description ?? '').toLowerCase().includes(t));
    }
    this.filteredItems = r;
  }

  openCreateDialog(): void {
    this.editMode = false; this.editingId = null;
    this.form = { title: '', description: '', priority: 'medium', status: 'open', due_date: '' };
    this.showDialog = true;
  }

  openEditDialog(item: Record<string, unknown>): void {
    this.editMode = true; this.editingId = item.remediation_id ?? item.id;
    this.form = {
      title: item.title ?? item.description ?? '',
      description: item.description ?? '',
      priority: item.priority ?? 'medium',
      status: item.status ?? 'open',
      due_date: item.due_date ? item.due_date.slice(0, 10) : '',
    };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.title) return;
    const obs = this.editMode && this.editingId
      ? this.apiclientSvc.put('/compliance/remediations/' + this.editingId, this.form)
      : this.complianceSvc.createRemediation(this.form as any);
    obs.subscribe({
      next: () => {
        this.showDialog = false;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('esg.successSummary'),
          detail: this.editMode ? this.i18n.translate('esg.updated') : this.i18n.translate('esg.created'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('esg.errorSummary'), detail: this.i18n.translate('esg.operationFailed'), life: 4000 }); }
    });
  }

  confirmDelete(item: Record<string, unknown>): void { this.deleteTarget = item; this.showDeleteDialog = true; }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.remediation_id ?? this.deleteTarget.id;
    this.apiclientSvc.del('/compliance/remediations/' + id).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.deleteTarget = null;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('esg.deleted'), detail: this.i18n.translate('esg.recordRemoved'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('esg.errorSummary'), detail: this.i18n.translate('esg.deleteFailed'), life: 4000 }); }
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'esg-remediations.csv'; a.click();
  }
}
