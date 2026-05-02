import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '@app/runtime/interceptors/grc-live.service';
import { I18nService } from '@app/infrastructure';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { ApiClientService } from "@app/core/services/api-client.service";
import { GrcOperationsService } from '@app/api';
import { ButtonModule, DialogModule, DropdownModule, InputModule, NotificationModule, TableModule, TagModule, TooltipModule, UIShellModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-mapping',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent, AiPanelComponent,
        TableModule, TagModule, UIShellModule, ButtonModule, DialogModule,
        InputModule, DropdownModule, TooltipModule, NotificationModule, AppDatePipe,
    ],
    providers: [],
    template: `
    <app-page-shell
      icon="arrows-alt-h"
      [title]="i18n.translate('mapping.title')"
      [subtitle]="i18n.translate('mapping.subtitle')"
      [breadcrumbs]="['Dashboard', 'Mappings']"
      [loading]="!loaded">

      <cds-notification></cds-notification>

      <section cdsToolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <button cdsButton
            [label]="i18n.translate('mapping.add')"
            icon="" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class=""></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('mapping.search')" [attr.aria-label]="i18n.translate('mapping.search')"
                   (input)="filterItems()" class="search-input" />
          </span>
        </ng-template>
        <ng-template pTemplate="end">
          <button cdsButton [label]="i18n.translate('mapping.export')" icon="" severity="secondary"
                    [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </section>

      <table cdsTable aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10"
               [rows]="10" styleClass="p-datatable-striped p-datatable-gridlines"
               *ngIf="filteredItems.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('mapping.sourceType') }}</th>
            <th>{{ i18n.translate('mapping.sourceId') }}</th>
            <th>{{ i18n.translate('mapping.targetType') }}</th>
            <th>{{ i18n.translate('mapping.targetId') }}</th>
            <th>{{ i18n.translate('mapping.created') }}</th>
            <th style="width:80px">{{ i18n.translate('mapping.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><cds-tag [value]="item.source_type" severity="info" /></td>
            <td>{{ (item.source_id ?? '') | slice:0:12 }}</td>
            <td><cds-tag [value]="item.target_type" severity="success" /></td>
            <td>{{ (item.target_id ?? '') | slice:0:12 }}</td>
            <td>{{ item.created_at | appDate:'medium' }}</td>
            <td>
              <div class="action-btns">
                <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete(item)" [cdsTooltip]="Delete"><i class=""></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="empty-msg">{{ i18n.translate('mapping.noData') }}</td></tr>
        </ng-template>
      </table>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class=" empty-icon"></i>
        <p>{{ i18n.translate('mapping.noMappings') }}</p>
        <button cdsButton [label]="i18n.translate('mapping.add')" icon=""
                  (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <cds-modal
        [header]="i18n.translate('mapping.newMapping')"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('mapping.sourceType') }}</label>
            <cds-dropdown [(ngModel)]="form.source_type" [options]="entityTypeOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full"
                        [placeholder]="i18n.translate('mapping.select')" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('mapping.sourceId') }}</label>
            <input pInputText [(ngModel)]="form.source_id" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('mapping.targetType') }}</label>
            <cds-dropdown [(ngModel)]="form.target_type" [options]="entityTypeOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full"
                        [placeholder]="i18n.translate('mapping.select')" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('mapping.targetId') }}</label>
            <input pInputText [(ngModel)]="form.target_id" class="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('mapping.cancel')" icon=""
                    severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <button cdsButton [label]="i18n.translate('mapping.create')" icon=""
                    (onClick)="saveItem()" [disabled]="!form.source_type || !form.source_id || !form.target_type || !form.target_id" />
        </ng-template>
      </cds-modal>

      <cds-modal [header]="i18n.translate('mapping.confirmDelete')"
                [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('mapping.confirmDeleteMsg') }}</p>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('mapping.cancel')" severity="secondary" [text]="true"
                    (onClick)="showDeleteDialog = false" />
          <button cdsButton [label]="i18n.translate('mapping.delete')" icon=""
                    severity="danger" (onClick)="deleteItem()" />
        </ng-template>
      </cds-modal>

    </app-page-shell>
    <app-ai-panel module="mappings" />
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
export class MappingComponent implements OnInit {
  private msg = inject(MessageService);

    private operationsSvc = inject(GrcOperationsService);
  items: Record<string, any>[] = [];
  filteredItems: Record<string, any>[] = [];
  loaded = false;
  searchTerm = '';
  showDialog = false;
  showDeleteDialog = false;
  deleteTarget: Record<string, any> | null = null;
  form: Record<string, any> = { source_type: '', source_id: '', target_type: '', target_id: '' };

  entityTypeOptions = [
    { label: 'Risk', value: 'risk' },
    { label: 'Control', value: 'control' },
    { label: 'Policy', value: 'policy' },
    { label: 'Framework', value: 'framework' },
    { label: 'Evidence', value: 'evidence' },
  ];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(
    public i18n: I18nService,
    private apiclientSvc: ApiClientService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.apiclientSvc.get('/mappings').subscribe({
      next: (res: Record<string, any>) => {
        const data = res.mappings ?? res;
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
        (i.source_type ?? '').toLowerCase().includes(t) ||
        (i.target_type ?? '').toLowerCase().includes(t) ||
        (i.source_id ?? '').toLowerCase().includes(t) ||
        (i.target_id ?? '').toLowerCase().includes(t)
      );
    }
    this.filteredItems = r;
  }

  openCreateDialog(): void {
    this.form = { source_type: '', source_id: '', target_type: '', target_id: '' };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.source_type || !this.form.source_id || !this.form.target_type || !this.form.target_id) return;
    this.operationsSvc.createMapping(this.form as any).subscribe({
      next: () => {
        this.showDialog = false;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('mapping.success'), detail: this.i18n.translate('mapping.mappingCreated'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('mapping.error'), detail: this.i18n.translate('mapping.createFailed'), life: 4000 }); }
    });
  }

  confirmDelete(item: Record<string, any>): void { this.deleteTarget = item; this.showDeleteDialog = true; }

  deleteItem(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.mapping_id ?? this.deleteTarget.id;
    this.operationsSvc.deleteMapping(id).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.deleteTarget = null;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('mapping.deleted'), detail: this.i18n.translate('mapping.mappingRemoved'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('mapping.error'), detail: this.i18n.translate('mapping.deleteFailed'), life: 4000 }); }
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mappings.csv'; a.click();
  }
}
