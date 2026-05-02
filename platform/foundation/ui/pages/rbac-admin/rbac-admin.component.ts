import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '@app/grc/services/grc-governance.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { FoundationPageShellStubComponent as PageShellComponent } from '../shared/foundation-shared-components';
import { FoundationStatusBadgeComponent as StatusBadgeComponent } from '../shared/foundation-shared-components';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { RaciPanelComponent } from '@app/shared/components/raci-panel.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcOperationsService } from '@app/grc/services/grc-governance.service';
import { ApiClientService } from '@app/core/services/api-client.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rbac-admin',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, StatusBadgeComponent, AiPanelComponent, RaciPanelComponent,
    TableModule, TagModule, ToolbarModule, ButtonModule, DialogModule,
    InputTextModule, InputTextarea, DropdownModule, CheckboxModule,
    TooltipModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="shield"
      [title]="i18n.translate('rbacAdmin.title')"
      [subtitle]="i18n.translate('rbacAdmin.subtitle')"
      [breadcrumbs]="breadcrumbs"
      [loading]="!loaded">
      <app-raci-panel entityType="control" [entityId]="editingId || ''" [canEdit]="true" />

      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button [label]="i18n.translate('rbacAdmin.createRole')" icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('rbacAdmin.search')" [attr.aria-label]="i18n.translate('rbacAdmin.search')"
                   (input)="filterItems()" class="search-input" />
          </span>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('common.export')" icon="pi pi-download"
                    severity="secondary" [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10"
               [rows]="10" styleClass="p-datatable-striped p-datatable-gridlines"
               *ngIf="filteredItems.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('rbacAdmin.name') }}</th>
            <th>{{ i18n.translate('rbacAdmin.description') }}</th>
            <th>{{ i18n.translate('rbacAdmin.permissions') }}</th>
            <th>{{ i18n.translate('rbacAdmin.canApprove') }}</th>
            <th>{{ i18n.translate('rbacAdmin.maxRisk') }}</th>
            <th>{{ i18n.translate('rbacAdmin.system') }}</th>
            <th style="width:120px">{{ i18n.translate('rbacAdmin.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td>
              <strong>{{ i18n.localize(item.name_en || item.name || item.role_id, item.name_ar || item.name_en || item.role_id) }}</strong>
            </td>
            <td class="desc-cell">{{ i18n.localize(item.description_en || item.description || '-', item.description_ar || '-') }}</td>
            <td>
              <p-tag [value]="(item.permissions?.length || 0) + ' permissions'" severity="info" />
            </td>
            <td>
              <i class="pi" [ngClass]="item.can_approve ? 'pi-check-circle text-green' : 'pi-times-circle text-muted'"></i>
            </td>
            <td>
              <p-tag [value]="item.max_risk_level || 'medium'" [severity]="$any(getRiskSeverity(item.max_risk_level))" />
            </td>
            <td>
              <p-tag *ngIf="item.is_system" value="System" severity="secondary" />
            </td>
            <td>
              <div class="action-btns">
                <button aria-label="Edit" class="icon-btn" (click)="openEditDialog(item)" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
                <button aria-label="Delete" class="icon-btn danger" *ngIf="!item.is_system" (click)="confirmDelete(item)" pTooltip="Delete"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="empty-msg">{{ i18n.translate('rbacAdmin.noRolesFound') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('rbacAdmin.noRolesYet') }}</p>
        <p-button [label]="i18n.translate('rbacAdmin.createRole')" icon="pi pi-plus" (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <!-- Create/Edit Dialog -->
      <p-dialog
        [header]="editMode ? i18n.translate('rbacAdmin.editRole') : i18n.translate('rbacAdmin.createRole')"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('rbacAdmin.roleId') }}</label>
            <input pInputText [(ngModel)]="form.role_id" class="w-full" [disabled]="editMode" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('rbacAdmin.nameEn') }}</label>
              <input pInputText [(ngModel)]="form.name_en" class="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('rbacAdmin.nameAr') }}</label>
              <input pInputText [(ngModel)]="form.name_ar" class="w-full" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('rbacAdmin.descriptionEn') }}</label>
              <textarea pInputTextarea [(ngModel)]="form.description_en" [rows]="2" class="w-full"></textarea>
            </div>
            <div class="field">
              <label>{{ i18n.translate('rbacAdmin.descriptionAr') }}</label>
              <textarea pInputTextarea [(ngModel)]="form.description_ar" [rows]="2" class="w-full"></textarea>
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('rbacAdmin.permissionsLabel') }}</label>
            <input pInputText [(ngModel)]="form.permissionsStr" class="w-full" placeholder="risks:read, risks:write, controls:read" aria-label="risks:read, risks:write, controls:read" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('rbacAdmin.maxRiskLevel') }}</label>
              <p-dropdown [(ngModel)]="form.max_risk_level" [options]="riskLevelOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
            <div class="field" style="justify-content: center;">
              <p-checkbox [(ngModel)]="form.can_approve" [binary]="true"
                          [label]="i18n.translate('rbacAdmin.canApprove')" />
            </div>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="i18n.translate('common.save')" icon="pi pi-check" (onClick)="saveItem()" [disabled]="!form.role_id || !form.name_en" />
        </ng-template>
      </p-dialog>

      <!-- Delete Confirmation -->
      <p-dialog [header]="i18n.translate('rbacAdmin.confirmDelete')"
                [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('rbacAdmin.confirmDeleteMsg') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="showDeleteDialog = false" />
          <p-button [label]="i18n.translate('common.delete')" icon="pi pi-trash" severity="danger" (onClick)="deleteItem()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
    <app-ai-panel module="rbac-admin" />
  `,
  styles: [`
    .mb-3 { margin-bottom: var(--space-md); }
    .ms-3 { margin-inline-start: 12px; }
    .search-input { min-width: 220px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .desc-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .text-green { color: var(--success); }
    .text-muted { color: var(--text-muted); }
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
export class RBACAdminComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  private router = inject(Router);
  breadcrumbs = this.router.url.startsWith('/foundation') ? ['Foundation', 'Roles & Permissions'] : ['Admin', 'RBAC'];
  items: Record<string, unknown>[] = [];
  filteredItems: Record<string, unknown>[] = [];
  loaded = false;
  searchTerm = '';
  showDialog = false;
  showDeleteDialog = false;
  editMode = false;
  editingId: string | null = null;
  deleteTarget: Record<string, unknown> | null = null;
  form: Record<string, unknown> = {
    role_id: '', name_en: '', name_ar: '', description_en: '', description_ar: '',
    permissionsStr: '', can_approve: false, max_risk_level: 'medium',
  };

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
    private msg: MessageService, private operationsSvc: GrcOperationsService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.operationsSvc.getRoles().subscribe({
      next: (res: Record<string, unknown>) => {
        this.items = res.roles || (Array.isArray(res) ? res : []);
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
      r = r.filter(d =>
        (d.name_en || d.name || d.role_id || '').toLowerCase().includes(t) ||
        (d.description_en || d.description || '').toLowerCase().includes(t)
      );
    }
    this.filteredItems = r;
  }

  openCreateDialog(): void {
    this.editMode = false;
    this.editingId = null;
    this.form = { role_id: '', name_en: '', name_ar: '', description_en: '', description_ar: '', permissionsStr: '', can_approve: false, max_risk_level: 'medium' };
    this.showDialog = true;
  }

  openEditDialog(item: Record<string, unknown>): void {
    this.editMode = true;
    this.editingId = item.role_id || item.id;
    this.form = {
      role_id: item.role_id || item.id || '',
      name_en: item.name_en || item.name || '',
      name_ar: item.name_ar || '',
      description_en: item.description_en || item.description || '',
      description_ar: item.description_ar || '',
      permissionsStr: (item.permissions || []).join(', '),
      can_approve: item.can_approve || false,
      max_risk_level: item.max_risk_level || 'medium',
    };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.role_id || !this.form.name_en) return;
    const payload = {
      ...this.form,
      permissions: this.form.permissionsStr.split(',').map((p: string) => p.trim()).filter(Boolean),
    };
    delete payload.permissionsStr;

    const obs = this.editMode && this.editingId
      ? this.operationsSvc.updateRole(this.editingId, payload)
      : this.operationsSvc.createRole(payload);
    obs.subscribe({
      next: () => {
        this.showDialog = false;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.editMode ? this.i18n.translate('common.roleUpdated') : this.i18n.translate('common.roleCreated'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.operationFailed'), life: 4000 }); }
    });
  }

  confirmDelete(item: Record<string, unknown>): void {
    this.deleteTarget = item;
    this.showDeleteDialog = true;
  }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.role_id || this.deleteTarget.id;
    this.apiclientSvc.del(`/profiles/roles/${id}`).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.deleteTarget = null;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted'), detail: this.i18n.translate('common.roleRemoved'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.deleteFailed'), life: 4000 }); }
    });
  }

  getRiskSeverity(level: string): string {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'info';
    }
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = ['role_id', 'name_en', 'name_ar', 'description_en', 'can_approve', 'max_risk_level', 'permissions'];
    const csv = [headers.join(','), ...this.filteredItems.map(d =>
      [
        `"${d.role_id || ''}"`, `"${d.name_en || ''}"`, `"${d.name_ar || ''}"`,
        `"${(d.description_en || '').replace(/"/g, '""')}"`,
        `"${d.can_approve || false}"`, `"${d.max_risk_level || ''}"`,
        `"${(d.permissions || []).join('; ')}"`,
      ].join(',')
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'rbac-roles-export.csv'; a.click();
  }
}
