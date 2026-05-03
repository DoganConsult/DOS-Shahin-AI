import { Component, OnInit, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfigCenterService, type GatewayInventoryItem } from './config-center.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-config-gateway',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    TableModule, TagModule, ButtonModule, InputTextModule,
    SelectModule, SkeletonModule, ToastModule, DialogModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />
    <app-page-shell
      icon="pi pi-bolt"
      [title]="'Config Gateway — Super Seed'"
      [subtitle]="'Full platform configuration inventory with runtime override control'"
      [breadcrumbs]="['Admin', 'Config Center', 'Gateway']"
      [loading]="loading()">

      <div headerActions class="flex gap-2 align-items-center">
        <p-select [options]="ownerFilters" [(ngModel)]="selectedOwner" (onChange)="applyFilter()"
                    placeholder="All Owners" [showClear]="true" styleClass="p-inputtext-sm" />
        <p-select [options]="sourceFilters" [(ngModel)]="selectedSource" (onChange)="applyFilter()"
                    placeholder="All Sources" [showClear]="true" styleClass="p-inputtext-sm" />
        <input pInputText type="text" [(ngModel)]="searchText" (input)="applyFilter()"
               placeholder="Search keys..." class="p-inputtext-sm" style="width:200px" />
        <p-button icon="pi pi-refresh" label="Reload" (onClick)="loadInventory()" [disabled]="loading()" styleClass="p-button-outlined p-button-sm" />
        <p-button icon="pi pi-trash" label="Invalidate Cache" (onClick)="invalidateAll()" styleClass="p-button-outlined p-button-warning p-button-sm" />
      </div>

      <div class="grid mb-3">
        <div class="col-6 md:col-2">
          <div class="surface-card p-3 border-round shadow-1 text-center">
            <div class="text-sm text-color-secondary">Total Keys</div>
            <div class="text-2xl font-bold">{{ stats().total }}</div>
          </div>
        </div>
        <div class="col-6 md:col-2">
          <div class="surface-card p-3 border-round shadow-1 text-center">
            <div class="text-sm text-color-secondary">Bootstrap</div>
            <div class="text-2xl font-bold text-blue-500">{{ stats().bootstrap }}</div>
          </div>
        </div>
        <div class="col-6 md:col-2">
          <div class="surface-card p-3 border-round shadow-1 text-center">
            <div class="text-sm text-color-secondary">Overridden</div>
            <div class="text-2xl font-bold text-orange-500">{{ stats().overridden }}</div>
          </div>
        </div>
        <div class="col-6 md:col-2">
          <div class="surface-card p-3 border-round shadow-1 text-center">
            <div class="text-sm text-color-secondary">Mutable</div>
            <div class="text-2xl font-bold text-green-500">{{ stats().mutable }}</div>
          </div>
        </div>
        <div class="col-6 md:col-2">
          <div class="surface-card p-3 border-round shadow-1 text-center">
            <div class="text-sm text-color-secondary">Sensitive</div>
            <div class="text-2xl font-bold text-red-500">{{ stats().sensitive }}</div>
          </div>
        </div>
        <div class="col-6 md:col-2">
          <div class="surface-card p-3 border-round shadow-1 text-center">
            <div class="text-sm text-color-secondary">Filtered</div>
            <div class="text-2xl font-bold">{{ filteredItems().length }}</div>
          </div>
        </div>
      </div>

      <p-table [value]="filteredItems()" [paginator]="true" [rows]="50" [rowHover]="true"
               styleClass="p-datatable-sm p-datatable-striped"
               [globalFilterFields]="['key', 'owner', 'description']"
               [scrollable]="true" scrollHeight="600px">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="key" style="width:25%">Key <p-sortIcon field="key" /></th>
            <th style="width:20%">Value</th>
            <th pSortableColumn="currentSource" style="width:12%">Source <p-sortIcon field="currentSource" /></th>
            <th pSortableColumn="owner" style="width:10%">Owner <p-sortIcon field="owner" /></th>
            <th style="width:13%">Flags</th>
            <th style="width:20%">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr [class.bg-orange-50]="row.hasOverride" [class.bg-blue-50]="row.bootstrap">
            <td>
              <div class="font-semibold text-sm">{{ row.key }}</div>
              <div class="text-xs text-color-secondary">{{ row.description }}</div>
            </td>
            <td class="text-sm">
              @if (row._editing) {
                <input pInputText [(ngModel)]="row._editValue" class="p-inputtext-sm w-full"
                       (keydown.enter)="saveOverride(row)" />
              } @else {
                <span [class.text-color-secondary]="row.sensitive">{{ row.currentValue ?? '—' }}</span>
              }
            </td>
            <td>
              <p-tag [value]="row.currentSource" [severity]="sourceSeverity(row.currentSource)" />
            </td>
            <td>
              <p-tag [value]="row.owner" [severity]="ownerSeverity(row.owner)" />
            </td>
            <td>
              @if (row.bootstrap) { <p-tag value="Bootstrap" severity="info" styleClass="text-xs" style="margin-inline-end:0.25rem" /> }
              @if (row.sensitive) { <p-tag value="Secret" severity="danger" styleClass="text-xs" style="margin-inline-end:0.25rem" /> }
              @if (row.mutable) { <p-tag value="Mutable" severity="success" styleClass="text-xs" style="margin-inline-end:0.25rem" /> }
              @if (row.hasOverride) { <p-tag value="Override" severity="warning" styleClass="text-xs" /> }
            </td>
            <td class="flex gap-1 flex-wrap">
              @if (!row.bootstrap && !row._editing) {
                <p-button icon="pi pi-pencil" styleClass="p-button-text p-button-sm" pTooltip="Set Override"
                          (onClick)="startEdit(row)" [disabled]="!row.mutable && !row.hasOverride" />
              }
              @if (row._editing) {
                <p-button icon="pi pi-check" styleClass="p-button-text p-button-sm p-button-success" (onClick)="saveOverride(row)" />
                <p-button icon="pi pi-times" styleClass="p-button-text p-button-sm p-button-danger" (onClick)="cancelEdit(row)" />
              }
              @if (row.hasOverride && !row._editing) {
                <p-button icon="pi pi-undo" styleClass="p-button-text p-button-sm p-button-warning" pTooltip="Clear Override"
                          (onClick)="confirmClearOverride(row)" />
              }
              @if (row.bootstrap) {
                <span class="text-xs text-color-secondary p-2">Bootstrap — env only</span>
              }
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td [attr.colspan]="6" class="text-center text-color-secondary p-4">No configuration keys match the current filter.</td></tr>
        </ng-template>
      </p-table>
    </app-page-shell>
  `,
})
export class ConfigGatewayComponent implements OnInit {
  i18n = inject(I18nService);
  private configService = inject(ConfigCenterService);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);

  loading = signal(false);
  allItems = signal<(GatewayInventoryItem & { _editing?: boolean; _editValue?: string })[]>([]);

  searchText = '';
  selectedOwner: string | null = null;
  selectedSource: string | null = null;

  ownerFilters = [
    { label: 'Environment', value: 'environment' },
    { label: 'Deployment', value: 'deployment' },
    { label: 'Workspace', value: 'workspace' },
    { label: 'Tenant', value: 'tenant' },
    { label: 'Product', value: 'product' },
    { label: 'AI Provider', value: 'ai_provider' },
    { label: 'Deprecated', value: 'deprecated' },
  ];

  sourceFilters = [
    { label: 'Bootstrap/Env', value: 'bootstrap/env' },
    { label: 'Environment', value: 'environment' },
    { label: 'Runtime Override', value: 'runtime_override' },
    { label: 'Tenant', value: 'tenant' },
    { label: 'Product', value: 'product' },
    { label: 'Platform', value: 'platform' },
  ];

  filteredItems = computed(() => {
    let items = this.allItems();
    if (this.selectedOwner) items = items.filter(i => i.owner === this.selectedOwner);
    if (this.selectedSource) items = items.filter(i => i.currentSource === this.selectedSource);
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      items = items.filter(i => i.key.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    return items;
  });

  stats = computed(() => {
    const all = this.allItems();
    return {
      total: all.length,
      bootstrap: all.filter(i => i.bootstrap).length,
      overridden: all.filter(i => i.hasOverride).length,
      mutable: all.filter(i => i.mutable).length,
      sensitive: all.filter(i => i.sensitive).length,
    };
  });

  ngOnInit() { this.loadInventory(); }

  loadInventory() {
    this.loading.set(true);
    this.configService.getGatewayInventory().subscribe({
      next: (r) => { this.allItems.set(r.items ?? []); this.loading.set(false); },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load gateway inventory' });
        this.loading.set(false);
      },
    });
  }

  applyFilter() {
    this.allItems.update(items => [...items]);
  }

  startEdit(row: GatewayInventoryItem & { _editing?: boolean; _editValue?: string }) {
    row._editing = true;
    row._editValue = row.currentValue !== undefined ? JSON.stringify(row.currentValue) : '';
  }

  cancelEdit(row: GatewayInventoryItem & { _editing?: boolean; _editValue?: string }) {
    row._editing = false;
    delete row._editValue;
  }

  saveOverride(row: GatewayInventoryItem & { _editing?: boolean; _editValue?: string }) {
    if (!row._editing) return;
    let val: unknown;
    try { val = JSON.parse(row._editValue!); } catch { val = row._editValue; }
    this.configService.setGatewayOverride(row.key, val).subscribe({
      next: () => {
        row.currentValue = val;
        row.currentSource = 'runtime_override';
        row.hasOverride = true;
        row._editing = false;
        this.msg.add({ severity: 'success', summary: 'Override Set', detail: `${row.key} overridden successfully` });
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: err?.error?.error || 'Failed to set override' });
      },
    });
  }

  confirmClearOverride(row: GatewayInventoryItem) {
    this.confirm.confirm({
      message: `Clear runtime override for '${row.key}'? The value will revert to its original source.`,
      header: 'Clear Override',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.clearOverride(row),
    });
  }

  clearOverride(row: GatewayInventoryItem & { hasOverride: boolean; currentSource: string }) {
    this.configService.clearGatewayOverride(row.key).subscribe({
      next: () => {
        row.hasOverride = false;
        this.msg.add({ severity: 'success', summary: 'Override Cleared', detail: `${row.key} reverted to original source` });
        this.loadInventory();
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to clear override' });
      },
    });
  }

  invalidateAll() {
    this.configService.invalidateGatewayCache().subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Cache Invalidated', detail: 'All cached config values cleared' });
        this.loadInventory();
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to invalidate cache' });
      },
    });
  }

  sourceSeverity(source: string): string {
    switch (source) {
      case 'bootstrap/env': return 'info';
      case 'environment': return 'secondary';
      case 'runtime_override': return 'warning';
      case 'tenant': case 'tenant:tenant': return 'success';
      case 'product': case 'product:settings': return 'contrast';
      default: return 'secondary';
    }
  }

  ownerSeverity(owner: string): string {
    switch (owner) {
      case 'environment': return 'info';
      case 'deployment': return 'secondary';
      case 'tenant': return 'success';
      case 'ai_provider': return 'warning';
      case 'deprecated': return 'danger';
      default: return 'contrast';
    }
  }
}
