/**
 * Platform Configuration Admin — View and edit platform configuration key-value pairs.
 *
 * Displays a PrimeNG table with inline editing on the value column.
 * Click a value cell to edit, press Enter or blur to save via PATCH.
 *
 * API endpoints:
 *   GET   /module-activation/platform-config
 *   PATCH /module-activation/platform-config/:key
 */

import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

interface PlatformConfigEntry {
  key: string;
  value: string;
  description: string;
  updated_at: string;
  /** Local-only: tracks the editing state */
  _editing?: boolean;
  _editValue?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-platform-config',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    TableModule, TagModule, ButtonModule,
    TooltipModule, ToastModule, InputTextModule, SkeletonModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell
      icon="sliders-h"
      [title]="i18n.translate('platformConfig.title')"
      [subtitle]="i18n.translate('platformConfig.subtitle')"
      [breadcrumbs]="['Admin', 'Platform Config']"
      [loading]="loading()">

      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="i18n.translate('Refresh')"
                  (onClick)="loadConfig()" [disabled]="loading()" styleClass="p-button-outlined" />
      </div>

      <p-table aria-label="Platform configuration" [value]="entries()" [paginator]="true" [rows]="25"
               [showCurrentPageReport]="true" currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
               [rowHover]="true" styleClass="p-datatable-sm p-datatable-striped"
               [globalFilterFields]="['key', 'description']">
        <ng-template pTemplate="caption">
          <div class="flex justify-content-end">
            <input pInputText type="text" (input)="filterTable($event)" placeholder="Search configs..."
                   class="p-inputtext-sm" style="width:250px" />
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="key" style="width:25%">Key <p-sortIcon field="key" /></th>
            <th style="width:30%">Value</th>
            <th style="width:30%">Description</th>
            <th pSortableColumn="updated_at" style="width:15%">Updated <p-sortIcon field="updated_at" /></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-semibold">
              <code class="text-sm">{{ row.key }}</code>
            </td>
            <td>
              <!-- Inline edit: click to enter edit mode -->
              <div *ngIf="!row._editing" class="cursor-pointer inline-edit-cell"
                   (click)="startEdit(row)" pTooltip="Click to edit">
                {{ row.value || '(empty)' }}
                <i class="pi pi-pencil text-xs text-color-secondary ml-2" aria-hidden="true"></i>
              </div>
              <div *ngIf="row._editing" class="flex align-items-center gap-2">
                <input pInputText [(ngModel)]="row._editValue" class="p-inputtext-sm flex-1"
                       (keyup.enter)="saveEdit(row)" (keyup.escape)="cancelEdit(row)" />
                <button pButton icon="pi pi-check" class="p-button-sm p-button-success p-button-text"
                        (click)="saveEdit(row)" pTooltip="Save"></button>
                <button pButton icon="pi pi-times" class="p-button-sm p-button-secondary p-button-text"
                        (click)="cancelEdit(row)" pTooltip="Cancel"></button>
              </div>
            </td>
            <td class="text-color-secondary text-sm">{{ row.description || '-' }}</td>
            <td>{{ row.updated_at | date:'short' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="4" class="text-center text-color-secondary p-4">No configuration entries found</td></tr>
        </ng-template>
      </p-table>

    </app-page-shell>
  `,
  styles: [`
    :host { display: block; }
    code { background: var(--surface-100); padding: 2px 6px; border-radius: var(--radius-xs); }
    .inline-edit-cell {
      padding: 4px 8px;
      border-radius: var(--radius-xs);
      transition: background 0.2s;
    }
    .inline-edit-cell:hover {
      background: var(--surface-100);
    }
  `],
})
export class PlatformConfigComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  readonly i18n = inject(I18nService);
  private readonly messageService = inject(MessageService);

  loading = signal(false);
  saving = signal(false);
  entries = signal<PlatformConfigEntry[]>([]);

  /** Snapshot of original entries for local filtering */
  private allEntries: PlatformConfigEntry[] = [];

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    this.loading.set(true);
    this.apiclientSvc.get('/module-activation/platform-config').subscribe({
      next: (data) => {
        const cleaned = (Array.isArray(data) ? data : []).map(e => ({ ...e, _editing: false, _editValue: e.value }));
        this.entries.set(cleaned);
        this.allEntries = cleaned;
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load configuration' }),
      complete: () => this.loading.set(false),
    });
  }

  /** Enter inline edit mode for a row */
  startEdit(row: PlatformConfigEntry): void {
    row._editing = true;
    row._editValue = row.value;
  }

  /** Cancel inline edit */
  cancelEdit(row: PlatformConfigEntry): void {
    row._editing = false;
    row._editValue = row.value;
  }

  /** Save the edited value via PATCH */
  saveEdit(row: PlatformConfigEntry): void {
    const newValue = row._editValue ?? '';
    if (newValue === row.value) {
      row._editing = false;
      return;
    }
    this.saving.set(true);
    this.apiclientSvc.patch(`/module-activation/platform-config/${encodeURIComponent(row.key)}`, { value: newValue }).subscribe({
      next: () => {
        row.value = newValue;
        row._editing = false;
        row.updated_at = new Date().toISOString();
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: `${row.key} updated` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: `Failed to update ${row.key}` });
      },
      complete: () => this.saving.set(false),
    });
  }

  /** Global filter handler for the search input */
  filterTable(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) {
      this.entries.set(this.allEntries);
      return;
    }
    const lower = value.toLowerCase();
    this.entries.set(this.allEntries.filter(e =>
      e.key.toLowerCase().includes(lower) || (e.description || '').toLowerCase().includes(lower)
    ));
  }
}
