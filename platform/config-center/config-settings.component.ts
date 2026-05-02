import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfigCenterService, type SettingRecord } from './config-center.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-config-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    TableModule, TagModule, ButtonModule, InputTextModule,
    DropdownModule, SkeletonModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell
      icon="pi pi-cog"
      [title]="i18n.translate('configCenter.settings')"
      [subtitle]="i18n.translate('configCenter.title')"
      [breadcrumbs]="['Admin', 'Config Center', 'Settings']"
      [loading]="loading()">

      <div headerActions class="flex gap-2">
        <p-dropdown [options]="scopes" [(ngModel)]="selectedScope" (onChange)="loadSettings()" placeholder="Scope" styleClass="p-inputtext-sm" />
        <p-button icon="pi pi-refresh" [label]="i18n.translate('Refresh')"
                  (onClick)="loadSettings()" [disabled]="loading()" styleClass="p-button-outlined" />
      </div>

      @if (!loading() && settings().length === 0) {
        <div class="p-4 text-center text-color-secondary">{{ i18n.translate('configCenter.noData') }}</div>
      }

      <p-table [value]="settings()" [paginator]="true" [rows]="25" [rowHover]="true"
               styleClass="p-datatable-sm p-datatable-striped"
               [globalFilterFields]="['key']">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="key" style="width:30%">{{ i18n.translate('configCenter.key') }} <p-sortIcon field="key" /></th>
            <th style="width:30%">{{ i18n.translate('configCenter.value') }}</th>
            <th style="width:15%">{{ i18n.translate('configCenter.scope') }}</th>
            <th style="width:25%">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>{{ row.key }}</td>
            <td>
              @if (row._editing) {
                <input pInputText [(ngModel)]="row._editValue" class="p-inputtext-sm w-full"
                       (keydown.enter)="saveSetting(row)" (blur)="saveSetting(row)" />
              } @else {
                {{ row.value }}
              }
            </td>
            <td><p-tag [value]="row.scope" /></td>
            <td class="flex gap-1">
              @if (!row._editing) {
                <p-button icon="pi pi-pencil" styleClass="p-button-text p-button-sm" (onClick)="startEdit(row)" />
              } @else {
                <p-button icon="pi pi-check" styleClass="p-button-text p-button-sm p-button-success" (onClick)="saveSetting(row)" />
                <p-button icon="pi pi-times" styleClass="p-button-text p-button-sm p-button-danger" (onClick)="cancelEdit(row)" />
              }
              <p-button icon="pi pi-trash" styleClass="p-button-text p-button-sm p-button-danger" (onClick)="deleteSetting(row)" />
            </td>
          </tr>
        </ng-template>
      </p-table>
    </app-page-shell>
  `,
})
export class ConfigSettingsComponent implements OnInit {
  i18n = inject(I18nService);
  private configService = inject(ConfigCenterService);
  private msg = inject(MessageService);

  loading = signal(false);
  settings = signal<(SettingRecord & { _editing?: boolean; _editValue?: string })[]>([]);
  selectedScope = 'tenant';
  scopes = [
    { label: 'Platform', value: 'platform' },
    { label: 'Product', value: 'product' },
    { label: 'Tenant', value: 'tenant' },
    { label: 'Workspace', value: 'workspace' },
    { label: 'Module', value: 'module' },
    { label: 'User', value: 'user' },
  ];

  ngOnInit() { this.loadSettings(); }

  loadSettings() {
    this.loading.set(true);
    this.configService.getSettings(this.selectedScope).subscribe({
      next: (r) => { this.settings.set(r.settings ?? []); this.loading.set(false); },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load settings' });
        this.loading.set(false);
      },
    });
  }

  startEdit(row: any) { row._editing = true; row._editValue = JSON.stringify(row.value); }
  cancelEdit(row: any) { row._editing = false; delete row._editValue; }

  saveSetting(row: any) {
    if (!row._editing) return;
    let val: unknown;
    try { val = JSON.parse(row._editValue); } catch { val = row._editValue; }
    this.configService.upsertSetting(row.key, { value: val, scope: this.selectedScope }).subscribe({
      next: () => {
        row.value = val;
        row._editing = false;
        this.msg.add({ severity: 'success', summary: 'Updated', detail: this.i18n.translate('configCenter.settingUpdated') });
      },
      error: () => { this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to update setting' }); },
    });
  }

  deleteSetting(row: any) {
    this.configService.deleteSetting(row.key, this.selectedScope).subscribe({
      next: () => {
        this.settings.update(s => s.filter(r => r.key !== row.key));
        this.msg.add({ severity: 'success', summary: 'Deleted', detail: this.i18n.translate('configCenter.settingDeleted') });
      },
      error: () => { this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete setting' }); },
    });
  }
}
