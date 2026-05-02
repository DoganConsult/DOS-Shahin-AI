import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
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

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-subflows',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent, StatusBadgeComponent, AiPanelComponent,
        TableModule, TagModule, ToolbarModule, ButtonModule, DialogModule,
        InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule,
    ],
    providers: [MessageService],
    template: `
    <app-page-shell
      icon="sitemap"
      [title]="i18n.translate('subflows.title')"
      [subtitle]="i18n.translate('subflows.subtitle')"
      [breadcrumbs]="['Dashboard', 'Subflows']"
      [loading]="!loaded">

      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button
            [label]="i18n.translate('subflows.addSubflow')"
            icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('subflows.search')" [attr.aria-label]="i18n.translate('subflows.search')"
                   (input)="filterItems()" class="search-input" />
          </span>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('subflows.export')" icon="pi pi-download" severity="secondary"
                    [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10"
               [rows]="10" styleClass="p-datatable-striped p-datatable-gridlines"
               *ngIf="filteredItems.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('subflows.name') }}</th>
            <th>{{ i18n.translate('subflows.code') }}</th>
            <th>{{ i18n.translate('subflows.category') }}</th>
            <th>{{ i18n.translate('subflows.steps') }}</th>
            <th>{{ i18n.translate('subflows.status') }}</th>
            <th style="width:120px">{{ i18n.translate('subflows.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><strong>{{ item.name ?? item.title }}</strong></td>
            <td><code>{{ item.code ?? item.template_code ?? '—' }}</code></td>
            <td>{{ item.category ?? item.type ?? '—' }}</td>
            <td>{{ item.steps?.length ?? item.step_count ?? 0 }}</td>
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
          <tr><td colspan="6" class="empty-msg">{{ i18n.translate('subflows.noData') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('subflows.noSubflows') }}</p>
        <p-button [label]="i18n.translate('subflows.addSubflow')" icon="pi pi-plus"
                  (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <p-dialog
        [header]="editMode ? i18n.translate('subflows.editSubflow') : i18n.translate('subflows.addNewSubflow')"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('subflows.name') }}</label>
              <input pInputText [(ngModel)]="form.name" class="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('subflows.code') }}</label>
              <input pInputText [(ngModel)]="form.code" class="w-full" />
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('subflows.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('subflows.category') }}</label>
              <p-dropdown [(ngModel)]="form.category" [options]="categoryOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('subflows.status') }}</label>
              <p-dropdown [(ngModel)]="form.status" [options]="statusOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('subflows.cancel')" icon="pi pi-times"
                    severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="i18n.translate('subflows.save')" icon="pi pi-check"
                    (onClick)="saveItem()" [disabled]="!form.name" />
        </ng-template>
      </p-dialog>

      <p-dialog [header]="i18n.translate('subflows.confirmDelete')"
                [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('subflows.confirmDeleteMsg') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('subflows.cancel')" severity="secondary" [text]="true"
                    (onClick)="showDeleteDialog = false" />
          <p-button [label]="i18n.translate('subflows.delete')" icon="pi pi-trash"
                    severity="danger" (onClick)="deleteItem()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
    <app-ai-panel module="subflows" />
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
    code { background: var(--surface-hover, var(--surface-ice)); padding: 2px 6px; border-radius: var(--radius-xs); font-size: var(--font-size-sm); }
  `]
})
export class SubflowsComponent implements OnInit {
  items: Record<string, any>[] = [];
  allItems: Record<string, any>[] = [];
  filteredItems: Record<string, any>[] = [];
  loaded = false;
  searchTerm = '';
  showDialog = false;
  showDeleteDialog = false;
  editMode = false;
  editingId: string | null = null;
  deleteTarget: Record<string, any> | null = null;
  form: Record<string, any> = { name: '', code: '', description: '', category: 'subflow', status: 'draft' };
  statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
  ];
  categoryOptions = [
    { label: 'Subflow', value: 'subflow' },
    { label: 'Reusable', value: 'reusable' },
    { label: 'Utility', value: 'utility' },
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
    this.apiclientSvc.get('/workflows/templates').subscribe({
      next: (res: Record<string, any>) => {
        const raw = res.templates ?? res;
        this.allItems = Array.isArray(raw) ? raw : (raw.data ?? []);
        // Filter for subflow-type templates where possible
        this.items = this.allItems.filter(
          (t: Record<string, any>) => t.type === 'subflow' || t.category === 'subflow' || !t.type && !t.category
        );
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
      r = r.filter(i =>
        (i.name ?? i.title ?? '').toLowerCase().includes(t) ||
        (i.code ?? i.template_code ?? '').toLowerCase().includes(t) ||
        (i.description ?? '').toLowerCase().includes(t)
      );
    }
    this.filteredItems = r;
  }

  openCreateDialog(): void {
    this.editMode = false; this.editingId = null;
    this.form = { name: '', code: '', description: '', category: 'subflow', status: 'draft' };
    this.showDialog = true;
  }

  openEditDialog(item: Record<string, any>): void {
    this.editMode = true; this.editingId = item.template_id ?? item.id;
    this.form = {
      name: item.name ?? item.title ?? '',
      code: item.code ?? item.template_code ?? '',
      description: item.description ?? '',
      category: item.category ?? item.type ?? 'subflow',
      status: item.status ?? 'draft'
    };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.name) return;
    const obs = this.editMode && this.editingId
      ? this.apiclientSvc.put('/workflows/templates/' + this.editingId, this.form)
      : this.apiclientSvc.post('/workflows/templates', this.form);
    obs.subscribe({
      next: () => {
        this.showDialog = false;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('subflows.success'), detail: this.editMode ? this.i18n.translate('subflows.updated') : this.i18n.translate('subflows.created'), life: 3000 });
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('subflows.error'), detail: this.i18n.translate('subflows.operationFailed'), life: 4000 });
      }
    });
  }

  confirmDelete(item: Record<string, any>): void { this.deleteTarget = item; this.showDeleteDialog = true; }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.template_id ?? this.deleteTarget.id;
    this.apiclientSvc.del('/workflows/templates/' + id).subscribe({
      next: () => {
        this.showDeleteDialog = false; this.deleteTarget = null; this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('subflows.deleted'), detail: this.i18n.translate('subflows.recordRemoved'), life: 3000 });
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('subflows.error'), detail: this.i18n.translate('subflows.deleteFailed'), life: 4000 });
      }
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'subflows.csv'; a.click();
  }
}
