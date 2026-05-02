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
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-content-manager',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent, StatusBadgeComponent, AiPanelComponent,
        TableModule, TagModule, ToolbarModule, ButtonModule, DialogModule,
        InputTextModule, InputTextarea, DropdownModule, TooltipModule, ToastModule, AppDatePipe,
    ],
    providers: [MessageService],
    template: `
    <app-page-shell
      icon="archive"
      [title]="i18n.translate('contentManager.title')"
      [subtitle]="i18n.translate('contentManager.subtitle')"
      [breadcrumbs]="['Dashboard', 'Content Manager']"
      [loading]="!loaded">

      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button
            [label]="i18n.translate('contentManager.installPack')"
            icon="pi pi-plus" (onClick)="openCreateDialog()" />
          <span class="p-input-icon-left ms-3">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('contentManager.search')" [attr.aria-label]="i18n.translate('contentManager.search')"
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
            <th>{{ i18n.translate('contentManager.name') }}</th>
            <th>{{ i18n.translate('contentManager.version') }}</th>
            <th>{{ i18n.translate('contentManager.type') }}</th>
            <th>{{ i18n.translate('contentManager.installed') }}</th>
            <th>{{ i18n.translate('contentManager.status') }}</th>
            <th style="width:160px">{{ i18n.translate('contentManager.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><strong>{{ item.name ?? item.pack_name ?? item.pack_id }}</strong></td>
            <td><code>{{ item.version ?? item.current_version ?? '-' }}</code></td>
            <td>{{ item.pack_type ?? item.type ?? '-' }}</td>
            <td>{{ item.installed_at | appDate:'medium' }}</td>
            <td><app-status-badge [status]="item.status ?? 'installed'" /></td>
            <td>
              <div class="action-btns">
                <button aria-label="Upgrade" class="icon-btn" (click)="upgrade(item)" pTooltip="Upgrade"><i class="pi pi-arrow-up"></i></button>
                <button aria-label="Rollback" class="icon-btn" (click)="rollback(item)" pTooltip="Rollback"><i class="pi pi-undo"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="empty-msg">{{ i18n.translate('contentManager.noData') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('contentManager.noPacks') }}</p>
        <p-button [label]="i18n.translate('contentManager.installPack')" icon="pi pi-plus"
                  (onClick)="openCreateDialog()" [outlined]="true" />
      </div>

      <!-- Install Dialog -->
      <p-dialog
        [header]="i18n.translate('contentManager.installNewPack')"
        [(visible)]="showDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('contentManager.name') }}</label>
            <input pInputText [(ngModel)]="form.name" class="w-full" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ i18n.translate('contentManager.version') }}</label>
              <input pInputText [(ngModel)]="form.version" class="w-full" placeholder="1.0.0" aria-label="1.0.0" />
            </div>
            <div class="field">
              <label>{{ i18n.translate('contentManager.packType') }}</label>
              <p-dropdown [(ngModel)]="form.pack_type" [options]="packTypeOptions"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
          <div class="field">
            <label>{{ i18n.translate('contentManager.description') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('contentManager.cancel')" icon="pi pi-times"
                    severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button [label]="i18n.translate('contentManager.install')" icon="pi pi-check"
                    (onClick)="saveItem()" [disabled]="!form.name" />
        </ng-template>
      </p-dialog>

      <!-- Rollback Dialog -->
      <p-dialog
        [header]="i18n.translate('contentManager.rollbackToVersion')"
        [(visible)]="showRollbackDialog" [modal]="true" [style]="{width:'400px'}">
        <div class="dialog-form">
          <div class="field">
            <label>{{ i18n.translate('contentManager.targetVersion') }}</label>
            <input pInputText [(ngModel)]="rollbackVersion" class="w-full" placeholder="1.0.0" aria-label="1.0.0" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('contentManager.cancel')" severity="secondary" [text]="true"
                    (onClick)="showRollbackDialog = false" />
          <p-button [label]="i18n.translate('contentManager.rollback')" icon="pi pi-undo"
                    severity="warning" (onClick)="doRollback()" [disabled]="!rollbackVersion" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
    <app-ai-panel module="content-manager" />
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
    code { font-size: var(--font-size-sm); padding: 2px 6px; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius-xs); }
  `]
})
export class ContentManagerComponent implements OnInit {
  items: GrcRecord[] = [];
  filteredItems: GrcRecord[] = [];
  loaded = false;
  searchTerm = '';
  showDialog = false;
  showRollbackDialog = false;
  rollbackTarget: GrcRecord | null = null;
  rollbackVersion = '';
  form: GrcRecord = { name: '', version: '1.0.0', pack_type: 'framework', description: '' };

  packTypeOptions = [
    { label: 'Framework', value: 'framework' },
    { label: 'Controls', value: 'controls' },
    { label: 'Policies', value: 'policies' },
    { label: 'Templates', value: 'templates' },
    { label: 'Custom', value: 'custom' },
  ];

  statusOptions = [
    { label: 'Installed', value: 'installed' },
    { label: 'Outdated', value: 'outdated' },
    { label: 'Error', value: 'error' },
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
    this.operationsSvc.getInstalledPacks().subscribe({
      next: (res: any) => {
        const data = res.packs ?? res.installed_packs ?? res;
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
        (i.name ?? i.pack_name ?? i.pack_id ?? '').toLowerCase().includes(t) ||
        (i.pack_type ?? i.type ?? '').toLowerCase().includes(t) ||
        (i.description ?? '').toLowerCase().includes(t)
      );
    }
    this.filteredItems = r;
  }

  openCreateDialog(): void {
    this.form = { name: '', version: '1.0.0', pack_type: 'framework', description: '' };
    this.showDialog = true;
  }

  saveItem(): void {
    if (!this.form.name) return;
    this.operationsSvc.installContentPack(this.form as any).subscribe({
      next: () => {
        this.showDialog = false;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.contentPackInstalled'), life: 3000 });
      },
      error: (e) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e.error?.error ?? this.i18n.translate('common.installFailed'), life: 4000 }); }
    });
  }

  upgrade(item: GrcRecord): void {
    const id = item.pack_id ?? item.id;
    this.operationsSvc.upgradeContentPack(id, item as any).subscribe({
      next: () => {
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.packUpgraded'), life: 3000 });
      },
      error: (e) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e.error?.error ?? this.i18n.translate('common.upgradeFailed'), life: 4000 }); }
    });
  }

  rollback(item: GrcRecord): void {
    this.rollbackTarget = item;
    this.rollbackVersion = '';
    this.showRollbackDialog = true;
  }

  doRollback(): void {
    if (!this.rollbackTarget || !this.rollbackVersion) return;
    const id = this.rollbackTarget.pack_id ?? this.rollbackTarget.id;
    this.operationsSvc.rollbackContentPack(id, this.rollbackVersion).subscribe({
      next: () => {
        this.showRollbackDialog = false;
        this.rollbackTarget = null;
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.packRolledBack'), life: 3000 });
      },
      error: (e) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e.error?.error ?? this.i18n.translate('common.rollbackFailed'), life: 4000 }); }
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'content-packs.csv'; a.click();
  }
}
