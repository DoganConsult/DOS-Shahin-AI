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
import { GrcOperationsService } from '@app/api';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-raci-matrix',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent, StatusBadgeComponent, AiPanelComponent,
        TableModule, TagModule, ToolbarModule, ButtonModule, DialogModule,
        InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule,
    ],
    providers: [MessageService],
    template: `
    <app-page-shell
      icon="users"
      [title]="i18n.translate('raciMatrix.title')"
      [subtitle]="i18n.translate('raciMatrix.subtitle')"
      [breadcrumbs]="['Dashboard', 'RACI Matrix']"
      [loading]="!loaded">

      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button
            [label]="i18n.translate('raciMatrix.add')"
            icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('raciMatrix.search')" [attr.aria-label]="i18n.translate('raciMatrix.search')"
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
            <th>{{ i18n.translate('raciMatrix.scopeType') }}</th>
            <th>{{ i18n.translate('raciMatrix.scopeId') }}</th>
            <th>{{ i18n.translate('raciMatrix.role') }}</th>
            <th>{{ i18n.translate('raciMatrix.team') }}</th>
            <th>{{ i18n.translate('raciMatrix.platformRole') }}</th>
            <th style="width:90px">{{ i18n.translate('raciMatrix.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><p-tag [value]="item.scope_type" severity="info" /></td>
            <td>{{ item.scope_id }}</td>
            <td><app-status-badge [status]="item.raci_role ?? 'responsible'" /></td>
            <td>{{ item.team_id ?? '-' }}</td>
            <td>{{ item.platform_role ?? '-' }}</td>
            <td>
              <div class="action-btns">
                <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(item)" pTooltip="Delete"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="99" class="empty-msg">{{ i18n.translate('raciMatrix.noData') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('raciMatrix.noAssignments') }}</p>
        <p-button [label]="i18n.translate('raciMatrix.add')" icon="pi pi-plus"
                  (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <p-dialog
        [header]="i18n.translate('raciMatrix.addNewAssignment')"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('raciMatrix.scopeType') }}</label>
            <p-dropdown [(ngModel)]="form.scope_type" [options]="scopeTypeOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full"
                        [placeholder]="i18n.translate('common.select')" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('raciMatrix.scopeId') }}</label>
            <input pInputText [(ngModel)]="form.scope_id" class="w-full" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('raciMatrix.raciRole') }}</label>
              <p-dropdown [(ngModel)]="form.raci_role" [options]="raciRoleOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('raciMatrix.teamId') }}</label>
              <input pInputText [(ngModel)]="form.team_id" class="w-full" />
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('raciMatrix.platformRole') }}</label>
            <input pInputText [(ngModel)]="form.platform_role" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('raciMatrix.notes') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.notes" [rows]="3" class="w-full"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" icon="pi pi-times"
                    severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="i18n.translate('common.save')" icon="pi pi-check"
                    (onClick)="saveItem()" [disabled]="!form.scope_type || !form.scope_id || !form.raci_role" />
        </ng-template>
      </p-dialog>

      <p-dialog [header]="i18n.translate('raciMatrix.confirmDelete')"
                [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('raciMatrix.confirmDeleteMsg') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true"
                    (onClick)="showDeleteDialog = false" />
          <p-button [label]="i18n.translate('common.delete')" icon="pi pi-trash"
                    severity="danger" (onClick)="deleteItem()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
    <app-ai-panel module="raci-matrix" />
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
  `]
})
export class RACIMatrixComponent implements OnInit {
  items: Record<string, any>[] = [];
  filteredItems: Record<string, any>[] = [];
  loaded = false;
  searchTerm = '';
  showDialog = false;
  showDeleteDialog = false;
  deleteTarget: Record<string, any> | null = null;
  form: Record<string, any> = { scope_type: '', scope_id: '', raci_role: 'responsible', team_id: '', platform_role: '', notes: '' };

  scopeTypeOptions = [
    { label: 'Policy', value: 'policy' },
    { label: 'Workflow', value: 'workflow' },
    { label: 'Process', value: 'process' },
    { label: 'Control Group', value: 'control_group' },
  ];

  raciRoleOptions = [
    { label: 'Responsible', value: 'responsible' },
    { label: 'Accountable', value: 'accountable' },
    { label: 'Consulted', value: 'consulted' },
    { label: 'Informed', value: 'informed' },
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
    this.operationsSvc.getTenantRaci().subscribe({
      next: (res: Record<string, any>) => {
        const data = res.assignments ?? res.raci ?? res;
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
        (i.scope_type ?? '').toLowerCase().includes(t) ||
        (i.scope_id ?? '').toLowerCase().includes(t) ||
        (i.raci_role ?? '').toLowerCase().includes(t) ||
        (i.team_id ?? '').toLowerCase().includes(t) ||
        (i.platform_role ?? '').toLowerCase().includes(t)
      );
    }
    this.filteredItems = r;
  }

  openCreateDialog(): void {
    this.form = { scope_type: '', scope_id: '', raci_role: 'responsible', team_id: '', platform_role: '', notes: '' };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.scope_type || !this.form.scope_id || !this.form.raci_role) return;
    this.operationsSvc.setRACIRole(
      this.form.scope_type,
      this.form.scope_id,
      this.form.raci_role,
      this.form.team_id || undefined,
      this.form.platform_role || undefined,
      this.form.notes || undefined,
    ).subscribe({
      next: () => {
        this.showDialog = false;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('raciMatrix.assignmentCreated'), life: 3000 });
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('raciMatrix.operationFailed'), life: 4000 });
      }
    });
  }

  confirmDelete(item: Record<string, any>): void { this.deleteTarget = item; this.showDeleteDialog = true; }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.raci_id ?? this.deleteTarget.id;
    this.operationsSvc.removeRACIRole(id).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.deleteTarget = null;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('raciMatrix.deleted'), detail: this.i18n.translate('raciMatrix.assignmentRemoved'), life: 3000 });
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('raciMatrix.deleteFailed'), life: 4000 });
      }
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'raci-matrix.csv'; a.click();
  }
}
