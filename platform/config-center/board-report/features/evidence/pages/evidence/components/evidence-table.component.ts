import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

/** Evidence item interface used by the table. */
export interface EvidenceTableItem {
  evidence_id: string;
  control_id: string;
  title: string;
  description: string | null;
  content_hash: string | null;
  previous_hash: string | null;
  submitted_by: string;
  version: number;
  chain_position: number;
  file_path: string | null;
  file_size_bytes: number | null;
  expiry_date: string | null;
  created_at: string;
  status: string;
  type?: string;
}

/**
 * Presentational component: evidence items data table.
 * Displays title, control, version, hash, submitter, date, expiry,
 * and per-row action buttons.
 */
@Component({
    selector: 'app-evidence-table',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, AppDatePipe, TableModule, ButtonModule, TagModule, TooltipModule],
    template: `
    <p-table aria-label="Filtered table" [value]="items" [paginator]="true" [rows]="15"
      [rowsPerPageOptions]="[15,30,50]"
      styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true"
      *ngIf="items.length > 0">
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="title">Title <p-sortIcon field="title" /></th>
          <th class="col-medium">Control</th>
          <th pSortableColumn="version" class="col-xs">Version <p-sortIcon field="version" /></th>
          <th class="col-narrow">Hash</th>
          <th pSortableColumn="submitted_by" class="col-medium">Submitted By <p-sortIcon field="submitted_by" /></th>
          <th pSortableColumn="created_at" class="col-date">Date <p-sortIcon field="created_at" /></th>
          <th class="col-narrow">Expiry</th>
          <th class="col-actions">Actions</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-item>
        <tr>
          <td>
            <span class="item-title-cell">{{ item.title }}</span>
            <span *ngIf="item.file_path" class="file-indicator"><i class="pi pi-paperclip"></i></span>
          </td>
          <td><code>{{ item.control_id | slice:0:8 }}</code></td>
          <td><p-tag [value]="'v' + item.version" severity="info" [rounded]="true" /></td>
          <td><code class="hash-cell" *ngIf="item.content_hash">{{ item.content_hash | slice:0:10 }}...</code></td>
          <td>{{ item.submitted_by | slice:0:12 }}</td>
          <td>{{ item.created_at | appDate:'medium' }}</td>
          <td>
            <p-tag *ngIf="isExpiringSoon(item)" value="Expiring" severity="warning" [rounded]="true" />
            <span *ngIf="item.expiry_date && !isExpiringSoon(item)">{{ item.expiry_date | appDate:'medium' }}</span>
          </td>
          <td class="flex gap-1">
            <p-button icon="pi pi-eye" [text]="true" severity="info" pTooltip="View Details" (onClick)="viewDetail.emit(item)" />
            <p-button icon="pi pi-upload" [text]="true" severity="secondary" pTooltip="Upload File" (onClick)="uploadFile.emit(item)" />
            <p-button icon="pi pi-download" [text]="true" severity="secondary" pTooltip="Download" (onClick)="downloadFile.emit(item)" *ngIf="item.file_path" />
            <p-button icon="pi pi-plus" [text]="true" severity="success" pTooltip="New Version" (onClick)="newVersion.emit(item)" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="8" class="text-center text-muted">No evidence found</td></tr>
      </ng-template>
    </p-table>
  `,
    styles: [`
    .col-narrow { width: 100px; }
    .col-xs { width: 80px; }
    .col-medium { width: 120px; }
    .col-date { width: 130px; }
    .col-actions { width: 160px; }
    .item-title-cell { font-weight: 600; }
    .file-indicator { margin-inline-start: 6px; color: var(--primary); font-size: var(--font-size-sm); }
    .hash-cell { font-size: var(--font-size-xs); color: var(--text-muted); }
    .text-center { text-align: center; }
    .text-muted { color: var(--text-muted, #9ca3af); }
    .flex { display: flex; }
    .gap-1 { gap: 4px; }
  `]
})
export class EvidenceTableComponent {
  @Input() items: EvidenceTableItem[] = [];

  @Output() viewDetail = new EventEmitter<EvidenceTableItem>();
  @Output() uploadFile = new EventEmitter<EvidenceTableItem>();
  @Output() downloadFile = new EventEmitter<EvidenceTableItem>();
  @Output() newVersion = new EventEmitter<EvidenceTableItem>();

  constructor(public i18n: I18nService) {}

  isExpiringSoon(item: EvidenceTableItem): boolean {
    if (!item.expiry_date) return false;
    const diff = new Date(item.expiry_date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  }
}
