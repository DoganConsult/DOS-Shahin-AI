import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '../../core/interceptors/grc-live.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
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
import { ApiClientService } from '@app/core/services/api-client.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-locations',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent, StatusBadgeComponent, AiPanelComponent,
        TableModule, TagModule, ToolbarModule, ButtonModule, DialogModule,
        InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule,
    ],
    providers: [MessageService],
    template: `
    <app-page-shell
      icon="map-marker"
      [title]="i18n.translate('locations.title')"
      [subtitle]="i18n.translate('locations.subtitle')"
      [breadcrumbs]="breadcrumbs"
      [loading]="!loaded">

      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button
            [label]="i18n.translate('locations.add')"
            icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('locations.search')" [attr.aria-label]="i18n.translate('locations.search')"
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
            <th>{{ i18n.translate('locations.name') }}</th>
            <th>{{ i18n.translate('locations.type') }}</th>
            <th>{{ i18n.translate('locations.city') }}</th>
            <th>{{ i18n.translate('locations.country') }}</th>
            <th>{{ i18n.translate('locations.status') }}</th>
            <th style="width:120px">{{ i18n.translate('locations.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><strong>{{ item.name ?? item.title ?? item.location_name }}</strong></td>
            <td>{{ item.location_type ?? item.type ?? '-' }}</td>
            <td>{{ item.city ?? '-' }}</td>
            <td>{{ item.country ?? '-' }}</td>
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
          <tr><td colspan="99" class="empty-msg">{{ i18n.translate('locations.noData') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('locations.noData') }}</p>
        <p-button [label]="i18n.translate('locations.add')" icon="pi pi-plus"
                  (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <p-dialog
        [header]="editMode
          ? i18n.translate('locations.editLocation')
          : i18n.translate('locations.addNewLocation')"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'720px','max-width':'95vw'}">
        <div class="dialog-form">
          <div class="field" style="grid-column:1/-1">
            <label>{{ i18n.translate('locations.name') }} *</label>
            <input pInputText [(ngModel)]="form.name" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('locations.type') }}</label>
            <p-dropdown [(ngModel)]="form.location_type" [options]="typeOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('locations.status') }}</label>
            <p-dropdown [(ngModel)]="form.status" [options]="statusOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('locations.city') }}</label>
            <input pInputText [(ngModel)]="form.city" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('locations.country') }}</label>
            <input pInputText [(ngModel)]="form.country" class="w-full" />
          </div>
          <div class="field" style="grid-column:1/-1">
            <label>{{ i18n.translate('locations.address') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.address" [rows]="3" class="w-full"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times"
                    severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="i18n.translate('common.save')" icon="pi pi-check"
                    (onClick)="saveItem()" [disabled]="!form.name" />
        </ng-template>
      </p-dialog>

      <p-dialog [header]="i18n.translate('locations.confirmDelete')"
                [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('locations.confirmDeleteMsg') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true"
                    (onClick)="showDeleteDialog = false" />
          <p-button [label]="i18n.translate('common.delete')" icon="pi pi-trash"
                    severity="danger" (onClick)="deleteItem()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
    <app-ai-panel module="locations" />
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
    .dialog-form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; grid-column: 1 / -1; }
    @media(max-width:768px) { .dialog-form { grid-template-columns: 1fr; } .field-row { grid-template-columns: 1fr; } }
    .w-full { width: 100%; }
  `]
})
export class LocationsComponent implements OnInit {
  private router = inject(Router);
  breadcrumbs = this.router.url.startsWith('/foundation') ? ['Foundation', 'Locations'] : ['Dashboard', 'Locations'];
  items: Record<string, unknown>[] = [];
  filteredItems: Record<string, unknown>[] = [];
  loaded = false;
  searchTerm = '';
  showDialog = false;
  showDeleteDialog = false;
  editMode = false;
  editingId: string | null = null;
  deleteTarget: Record<string, unknown> | null = null;
  form: Record<string, unknown> = { name: '', location_type: 'headquarters', city: '', country: '', address: '', status: 'active' };
  statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Decommissioned', value: 'decommissioned' },
  ];
  typeOptions = [
    { label: 'Headquarters', value: 'headquarters' },
    { label: 'Branch', value: 'branch' },
    { label: 'Data Center', value: 'data_center' },
    { label: 'Remote', value: 'remote' },
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
    this.apiclientSvc.get('/locations').subscribe({
      next: (res: Record<string, unknown>) => {
        const data = res.locations ?? res;
        this.items = Array.isArray(data) ? data : (data.items ?? data.data ?? []);
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
        (i.name ?? i.title ?? i.location_name ?? '').toLowerCase().includes(t) ||
        (i.city ?? '').toLowerCase().includes(t) ||
        (i.country ?? '').toLowerCase().includes(t)
      );
    }
    this.filteredItems = r;
  }

  openCreateDialog(): void {
    this.editMode = false; this.editingId = null;
    this.form = { name: '', location_type: 'headquarters', city: '', country: '', address: '', status: 'active' };
    this.showDialog = true;
  }

  openEditDialog(item: Record<string, unknown>): void {
    this.editMode = true; this.editingId = item.location_id ?? item.id;
    this.form = {
      name: item.name ?? item.title ?? item.location_name,
      location_type: item.location_type ?? item.type ?? 'headquarters',
      city: item.city ?? '',
      country: item.country ?? '',
      address: item.address ?? '',
      status: item.status ?? 'active',
    };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.name) return;
    const obs = this.editMode && this.editingId
      ? this.apiclientSvc.put('/locations/' + this.editingId, this.form)
      : this.apiclientSvc.post('/locations', this.form);
    obs.subscribe({
      next: () => {
        this.showDialog = false; this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.editMode ? this.i18n.translate('locations.updated') : this.i18n.translate('locations.created'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('locations.operationFailed'), life: 4000 }); }
    });
  }

  confirmDelete(item: Record<string, unknown>): void { this.deleteTarget = item; this.showDeleteDialog = true; }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.location_id ?? this.deleteTarget.id;
    this.apiclientSvc.del('/locations/' + id).subscribe({
      next: () => {
        this.showDeleteDialog = false; this.deleteTarget = null; this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('locations.deleted'), detail: this.i18n.translate('locations.recordRemoved'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('locations.deleteFailed'), life: 4000 }); }
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'locations.csv'; a.click();
  }
}
