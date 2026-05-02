import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

export interface CatalogRow {
  csn: string;
  component_key: string;
  route_path: string;
  is_runtime_enabled: boolean;
  module_activation_source: string;
  rollout_group: string;
  status: string;
  is_tenant_overridden: boolean;
  tenant_override_enabled?: boolean;
}

@Component({
  selector: 'app-platform-registry',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule,
    InputTextModule, TagModule, DropdownModule, DialogModule, ToastModule
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="registry-container p-4">
      <p-toast></p-toast>
      <div class="header-row flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="text-2xl font-bold mb-1">Platform Object Registry</h1>
          <p class="text-color-secondary m-0">Manage tenant-level component activation overrides (Phase 5).</p>
        </div>
        <div class="actions">
          <p-button icon="pi pi-refresh" label="Refresh" (onClick)="loadCatalog()" outlined="true" size="small"></p-button>
        </div>
      </div>

      <p-table [value]="filteredRows()" [paginator]="true" [rows]="10" [globalFilterFields]="['csn', 'component_key', 'route_path']"
               #dt [loading]="loading()" styleClass="p-datatable-sm" dataKey="csn">
        
        <ng-template pTemplate="caption">
          <div class="flex">
            <span class="p-input-icon-left ml-auto">
              <i class="pi pi-search"></i>
              <input pInputText type="text" (input)="dt.filterGlobal($event.target.value, 'contains')" placeholder="Search keyword" />
            </span>
          </div>
        </ng-template>

        <ng-template pTemplate="header">
          <tr>
            <th>CSN</th>
            <th>Component Key</th>
            <th>Route Path</th>
            <th>Default Status</th>
            <th>Tenant Override</th>
            <th>Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono text-sm">{{row.csn}}</td>
            <td class="font-bold">{{row.component_key}}</td>
            <td class="text-color-secondary">{{row.route_path || 'N/A'}}</td>
            <td>
              <p-tag [severity]="row.status === 'active' ? 'success' : 'warning'" [value]="row.status"></p-tag>
              <br>
              <small class="text-color-secondary">Runtime: {{row.is_runtime_enabled}}</small>
            </td>
            <td>
              <p-tag *ngIf="row.is_tenant_overridden && row.tenant_override_enabled" severity="success" value="Enabled (Override)"></p-tag>
              <p-tag *ngIf="row.is_tenant_overridden && !row.tenant_override_enabled" severity="danger" value="Disabled (Override)"></p-tag>
              <span *ngIf="!row.is_tenant_overridden" class="text-color-secondary text-sm">Follows Master</span>
            </td>
            <td>
              <p-button *ngIf="!row.is_tenant_overridden || row.tenant_override_enabled" icon="pi pi-ban" severity="danger" 
                        size="small" outlined="true" (onClick)="disableComponent(row)" pTooltip="Disable for tenant"></p-button>
                        
              <p-button *ngIf="row.is_tenant_overridden && !row.tenant_override_enabled" icon="pi pi-check" severity="success" 
                        size="small" outlined="true" (onClick)="enableComponent(row)" pTooltip="Enable for tenant"></p-button>
                        
              <p-button icon="pi pi-history" severity="secondary" 
                        size="small" class="ml-2" outlined="true" (onClick)="viewAudit(row)" pTooltip="View Audit History"></p-button>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Audit History Modal -->
      <p-dialog header="Audit History: {{selectedComponent()?.csn}}" [(visible)]="showAudit" [modal]="true" [style]="{width: '50vw'}">
        <p-table [value]="auditLogs()" styleClass="p-datatable-sm" [loading]="auditLoading()">
          <ng-template pTemplate="header">
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Requested By</th>
              <th>Reason</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-log>
            <tr>
              <td>{{log.created_at | date:'short'}}</td>
              <td><p-tag [value]="log.action" [severity]="log.action === 'enable' ? 'success' : (log.action === 'disable' ? 'danger' : 'info')"></p-tag></td>
              <td>{{log.requested_by}}</td>
              <td>{{log.reason || '-'}}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="4" class="text-center">No audit history found for this component.</td></tr>
          </ng-template>
        </p-table>
      </p-dialog>
    </div>
  `,
  styles: [`
    .font-mono { font-family: monospace; }
  `]
})
export class PlatformRegistryComponent implements OnInit {
  private http = inject(HttpClient);
  private messageSvc = inject(MessageService);
  
  rows = signal<CatalogRow[]>([]);
  filteredRows = signal<CatalogRow[]>([]);
  loading = signal(false);

  // Audit State
  showAudit = false;
  selectedComponent = signal<CatalogRow | null>(null);
  auditLogs = signal<any[]>([]);
  auditLoading = signal(false);

  async ngOnInit() {
    await this.loadCatalog();
  }

  async loadCatalog() {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.http.get<CatalogRow[]>('/api/v1/registry/catalog?limit=500'));
      this.rows.set(data);
      this.filteredRows.set(data);
    } catch (err) {
      this.messageSvc.add({ severity: 'error', summary: 'Error', detail: 'Failed to load catalog' });
    } finally {
      this.loading.set(false);
    }
  }

  async disableComponent(row: CatalogRow) {
    try {
      await firstValueFrom(this.http.put(`/api/v1/registry/components/${row.csn}/disable`, {
        reason: 'Disabled via Admin UI',
        requestedBy: 'admin'
      }));
      this.messageSvc.add({ severity: 'success', summary: 'Success', detail: `Disabled ${row.csn}` });
      await this.loadCatalog();
    } catch {
      this.messageSvc.add({ severity: 'error', summary: 'Error', detail: 'Failed to disable component' });
    }
  }

  async enableComponent(row: CatalogRow) {
    try {
      await firstValueFrom(this.http.put(`/api/v1/registry/components/${row.csn}/enable`, {
        reason: 'Enabled via Admin UI',
        requestedBy: 'admin'
      }));
      this.messageSvc.add({ severity: 'success', summary: 'Success', detail: `Enabled ${row.csn}` });
      await this.loadCatalog();
    } catch {
      this.messageSvc.add({ severity: 'error', summary: 'Error', detail: 'Failed to enable component' });
    }
  }

  async viewAudit(row: CatalogRow) {
    this.selectedComponent.set(row);
    this.showAudit = true;
    this.auditLoading.set(true);
    try {
      // In a real scenario, there would be an endpoint returning audit_log for the CSN.
      // E.g.: GET /api/v1/registry/components/${row.csn}/audit
      // For now, if the endpoint doesn't exist, this will gracefully catch.
      const logs = await firstValueFrom(this.http.get<any[]>(`/api/v1/registry/components/${row.csn}/audit`));
      this.auditLogs.set(logs);
    } catch {
       this.auditLogs.set([]);
       // Silent swallow since endpoint may not exist yet in API phase 3
    } finally {
      this.auditLoading.set(false);
    }
  }
}
