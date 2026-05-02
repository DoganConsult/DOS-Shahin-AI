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
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcRiskService } from '@app/grc/services/grc-risk.service';
import { ApiClientService } from "@app/core/services/api-client.service";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

interface VendorItem extends Record<string, unknown> {
  vendor_id?: string;
  id?: string;
  name?: string;
  vendor_name?: string;
  category?: string;
  risk_level?: string;
  contact_email?: string;
  status?: string;
  description?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vendors',
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
      icon="building"
      [title]="i18n.translate('vendorsPage.title')"
      [subtitle]="i18n.translate('vendorsPage.subtitle')"
      [breadcrumbs]="breadcrumbs()"
      [loading]="!loaded">

      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button
            [label]="i18n.translate('vendorsPage.add')"
            icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('vendorsPage.search')" [attr.aria-label]="i18n.translate('vendorsPage.search')"
                   (input)="filterItems()" class="search-input" />
          </span>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('vendorsPage.export')" icon="pi pi-download" severity="secondary"
                    [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10"
               [rows]="10" styleClass="p-datatable-striped p-datatable-gridlines"
               *ngIf="filteredItems.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('vendorsPage.name') }}</th>
            <th>{{ i18n.translate('vendorsPage.category') }}</th>
            <th>{{ i18n.translate('vendorsPage.riskLevel') }}</th>
            <th>{{ i18n.translate('vendorsPage.contact') }}</th>
            <th>{{ i18n.translate('vendorsPage.status') }}</th>
            <th style="width:120px">{{ i18n.translate('vendorsPage.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><strong>{{ item.name ?? item.vendor_name }}</strong></td>
            <td>{{ item.category ?? '—' }}</td>
            <td><app-status-badge [status]="item.risk_level ?? 'low'" /></td>
            <td>{{ item.contact_email ?? '—' }}</td>
            <td><app-status-badge [status]="item.status ?? 'active'" /></td>
            <td>
              <div class="action-btns">
                <button aria-label="Edit" class="icon-btn" (click)="openEditDialog(item)" [pTooltip]="i18n.translate('vendorsPage.edit')"><i class="pi pi-pencil"></i></button>
                <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(item)" [pTooltip]="i18n.translate('common.delete')"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="empty-msg">{{ i18n.translate('vendorsPage.noData') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('vendorsPage.noData') }}</p>
        <p-button [label]="i18n.translate('vendorsPage.add')" icon="pi pi-plus"
                  (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <p-dialog
        [header]="editMode ? i18n.translate('vendorsPage.edit') : i18n.translate('vendorsPage.addNew')"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('vendorsPage.name') }}</label>
            <input pInputText [(ngModel)]="form.name" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('vendorsPage.category') }}</label>
            <input pInputText [(ngModel)]="form.category" class="w-full" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('vendorsPage.riskLevel') }}</label>
              <p-dropdown [(ngModel)]="form.risk_level" [options]="riskLevelOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('vendorsPage.status') }}</label>
              <p-dropdown [(ngModel)]="form.status" [options]="statusOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('vendorsPage.contactEmail') }}</label>
            <input pInputText [(ngModel)]="form.contact_email" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('vendorsPage.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times"
                    severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="i18n.translate('common.save')" icon="pi pi-check"
                    (onClick)="saveItem()" [disabled]="!form.name" />
        </ng-template>
      </p-dialog>

      <p-dialog [header]="i18n.translate('vendorsPage.confirmDelete')"
                [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('vendorsPage.confirmDeleteMessage') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true"
                    (onClick)="showDeleteDialog = false" />
          <p-button [label]="i18n.translate('common.delete')" icon="pi pi-trash"
                    severity="danger" (onClick)="deleteItem()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
    <app-ai-panel module="vendors" />
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
    .empty-icon { font-size: 48px; margin-bottom: var(--space-md); display: block; }
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
export class VendorsComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  items: Record<string, any>[] = [];
  filteredItems: Record<string, any>[] = [];
  loaded = false;
  searchTerm = '';
  showDialog = false;
  showDeleteDialog = false;
  editMode = false;
  editingId: string | null = null;
  deleteTarget: Record<string, any> | null = null;
  form: Record<string, any> = { name: '', category: '', risk_level: 'low', contact_email: '', status: 'active', description: '' };

  statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Terminated', value: 'terminated' },
  ];

  riskLevelOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
  ];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(
    public i18n: I18nService,
    private msg: MessageService, private riskSvc: GrcRiskService
  ) {}

  breadcrumbs(): string[] {
    return [
      this.i18n.translate('vendorsPage.breadcrumbVendors'),
      this.i18n.translate('vendorsPage.breadcrumbVendorMgmt'),
      this.i18n.translate('vendorsPage.breadcrumbDashboard'),
    ];
  }

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.riskSvc.getVendors().subscribe({
      next: (res: Record<string, any>) => {
        const payload = asRecord(res);
        const vendors = asRecordArray(payload['vendors']);
        this.items = (vendors.length > 0 ? vendors : asRecordArray(res)) as VendorItem[];
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
      r = r.filter(i => asString(i.name ?? i.vendor_name).toLowerCase().includes(t)
        || asString(i.category).toLowerCase().includes(t)
        || asString(i.contact_email).toLowerCase().includes(t));
    }
    this.filteredItems = r;
  }

  openCreateDialog(): void {
    this.editMode = false; this.editingId = null;
    this.form = { name: '', category: '', risk_level: 'low', contact_email: '', status: 'active', description: '' };
    this.showDialog = true;
  }

  openEditDialog(item: Record<string, any>): void {
    this.editMode = true; this.editingId = asString(item.vendor_id) || asString(item.id) || null;
    this.form = {
      name: asString(item.name) || asString(item.vendor_name),
      category: asString(item.category),
      risk_level: asString(item.risk_level, 'low'),
      contact_email: asString(item.contact_email),
      status: asString(item.status, 'active'),
      description: asString(item.description),
    };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.name) return;
    const obs = this.editMode && this.editingId
      ? this.apiclientSvc.put('/vendors/' + this.editingId, this.form)
      : this.riskSvc.createVendor(this.form);
    obs.subscribe({
      next: () => {
        this.showDialog = false;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('vendorsPage.success'), detail: this.editMode ? this.i18n.translate('vendorsPage.updated') : this.i18n.translate('vendorsPage.created'), life: 3000 });
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('vendorsPage.operationFailed'), life: 4000 });
      }
    });
  }

  confirmDelete(item: VendorItem): void { this.deleteTarget = item; this.showDeleteDialog = true; }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.asText(this.deleteTarget.vendor_id ?? this.deleteTarget.id);
    if (!id) return;
    this.apiclientSvc.del('/vendors/' + id).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.deleteTarget = null;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('vendorsPage.deleted'), detail: this.i18n.translate('vendorsPage.recordRemoved'), life: 3000 });
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('vendorsPage.deleteFailed'), life: 4000 });
      }
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const rows = this.filteredItems.map(i => ({
      Name: this.asText(i.name ?? i.vendor_name),
      Category: this.asText(i.category),
      'Risk Level': this.asText(i.risk_level),
      'Contact Email': this.asText(i.contact_email),
      Status: this.asText(i.status),
      Description: this.asText(i.description),
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String((r as GrcRecord)[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vendors-export.csv'; a.click();
    this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('vendorsPage.exported'), life: 3000 });
  }

  private asText(value: unknown): string {
    return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
  }
}

export { VendorsComponent as WorkflowTemplatesComponent };
