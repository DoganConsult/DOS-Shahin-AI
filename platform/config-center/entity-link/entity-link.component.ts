import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '../../core/interceptors/grc-live.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
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
import { GrcOperationsService } from '@app/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-entity-link',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, StatusBadgeComponent, AiPanelComponent,
    TableModule, TagModule, ToolbarModule, ButtonModule, DialogModule,
    InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule, AppDatePipe,],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="link"
      [title]="i18n.translate('entityLink.title')"
      [subtitle]="i18n.translate('entityLink.subtitle')"
      [breadcrumbs]="['Dashboard', 'Entity Links']"
      [loading]="!loaded">

      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button
            [label]="i18n.translate('entityLink.add')"
            icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('entityLink.search')" [attr.aria-label]="i18n.translate('entityLink.search')"
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
            <th>{{ i18n.translate('entityLink.sourceType') }}</th>
            <th>{{ i18n.translate('entityLink.sourceId') }}</th>
            <th>{{ i18n.translate('entityLink.targetType') }}</th>
            <th>{{ i18n.translate('entityLink.targetId') }}</th>
            <th>{{ i18n.translate('entityLink.linkType') }}</th>
            <th>{{ i18n.translate('entityLink.created') }}</th>
            <th style="width:80px">{{ i18n.translate('entityLink.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><p-tag [value]="item.source_entity_type ?? item.source_type" severity="info" /></td>
            <td>{{ item.source_entity_id ?? item.source_id }}</td>
            <td><p-tag [value]="item.target_entity_type ?? item.target_type" severity="success" /></td>
            <td>{{ item.target_entity_id ?? item.target_id }}</td>
            <td><app-status-badge [status]="item.link_type ?? 'related'" /></td>
            <td>{{ item.created_at | appDate:'medium' }}</td>
            <td>
              <div class="action-btns">
                <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(item)" pTooltip="Delete"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="empty-msg">{{ i18n.translate('entityLink.noData') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('entityLink.noLinks') }}</p>
        <p-button [label]="i18n.translate('entityLink.add')" icon="pi pi-plus"
                  (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <p-dialog
        [header]="i18n.translate('entityLink.newLink')"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('entityLink.sourceType') }}</label>
              <p-dropdown [(ngModel)]="form.source_entity_type" [options]="entityTypeOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full"
                          [placeholder]="i18n.translate('entityLink.select')" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('entityLink.sourceId') }}</label>
              <input pInputText [(ngModel)]="form.source_entity_id" class="w-full" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('entityLink.targetType') }}</label>
              <p-dropdown [(ngModel)]="form.target_entity_type" [options]="entityTypeOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full"
                          [placeholder]="i18n.translate('entityLink.select')" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('entityLink.targetId') }}</label>
              <input pInputText [(ngModel)]="form.target_entity_id" class="w-full" />
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('entityLink.linkType') }}</label>
            <p-dropdown [(ngModel)]="form.link_type" [options]="linkTypeOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('entityLink.cancel')" icon="pi pi-times"
                    severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="i18n.translate('entityLink.create')" icon="pi pi-check"
                    (onClick)="saveItem()" [disabled]="!form.source_entity_type || !form.source_entity_id || !form.target_entity_type || !form.target_entity_id" />
        </ng-template>
      </p-dialog>

      <p-dialog [header]="i18n.translate('entityLink.confirmDelete')"
                [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('entityLink.confirmDeleteMsg') }}</p>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('entityLink.cancel')" severity="secondary" [text]="true"
                    (onClick)="showDeleteDialog = false" />
          <p-button [label]="i18n.translate('entityLink.delete')" icon="pi pi-trash"
                    severity="danger" (onClick)="deleteItem()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
    <app-ai-panel module="entity-links" />
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
export class EntityLinkComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  items: Record<string, unknown>[] = [];
  filteredItems: Record<string, unknown>[] = [];
  loaded = false;
  searchTerm = '';
  showDialog = false;
  showDeleteDialog = false;
  deleteTarget: Record<string, unknown> | null = null;
  form: Record<string, unknown> = { source_entity_type: '', source_entity_id: '', target_entity_type: '', target_entity_id: '', link_type: 'related' };

  entityTypeOptions = [
    { label: 'Risk', value: 'risk' },
    { label: 'Control', value: 'control' },
    { label: 'Policy', value: 'policy' },
    { label: 'Framework', value: 'framework' },
    { label: 'Evidence', value: 'evidence' },
    { label: 'Incident', value: 'incident' },
  ];

  linkTypeOptions = [
    { label: 'Related', value: 'related' },
    { label: 'Depends On', value: 'depends_on' },
    { label: 'Mitigates', value: 'mitigates' },
    { label: 'Implements', value: 'implements' },
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
    this.apiclientSvc.get('/entity-links').subscribe({
      next: (res: Record<string, unknown>) => {
        const data = res.links ?? res.entity_links ?? res;
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
        (i.source_entity_type ?? i.source_type ?? '').toLowerCase().includes(t) ||
        (i.target_entity_type ?? i.target_type ?? '').toLowerCase().includes(t) ||
        (i.link_type ?? '').toLowerCase().includes(t) ||
        (i.source_entity_id ?? i.source_id ?? '').toLowerCase().includes(t) ||
        (i.target_entity_id ?? i.target_id ?? '').toLowerCase().includes(t)
      );
    }
    this.filteredItems = r;
  }

  openCreateDialog(): void {
    this.form = { source_entity_type: '', source_entity_id: '', target_entity_type: '', target_entity_id: '', link_type: 'related' };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.source_entity_type || !this.form.source_entity_id || !this.form.target_entity_type || !this.form.target_entity_id) return;
    this.operationsSvc.createEntityLink(this.form as any).subscribe({
      next: () => {
        this.showDialog = false;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.entityLinkCreated'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToCreateLink'), life: 4000 }); }
    });
  }

  confirmDelete(item: Record<string, unknown>): void { this.deleteTarget = item; this.showDeleteDialog = true; }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.link_id ?? this.deleteTarget.id;
    this.operationsSvc.deleteEntityLink(id).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.deleteTarget = null;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted'), detail: this.i18n.translate('common.linkRemoved'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.deleteFailed'), life: 4000 }); }
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'entity-links.csv'; a.click();
  }
}
