import { Component, ChangeDetectionStrategy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { TableModule } from 'primeng/table';
import { GrcRecord } from '@app/core/models/shared.types';

/** Tab 2: Vendor documents table with download links */
@Component({
    selector: 'app-vendor-documents-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, StatusBadgeComponent, AppDatePipe, TableModule],
    template: `
    <p-table [value]="documents" [paginator]="documents.length > 10" [rows]="10"
             styleClass="p-datatable-sm p-datatable-striped" [loading]="loading">
      <ng-template pTemplate="header">
        <tr>
          <th>Document Type</th>
          <th>Status</th>
          <th>Expiry Date</th>
          <th>Upload</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-d>
        <tr>
          <td>{{ d.document_type ?? d.type ?? '\u2014' }}</td>
          <td><app-status-badge [status]="d.status ?? 'pending'" /></td>
          <td>{{ d.expiry_date ?? d.expires_at | appDate }}</td>
          <td>
            <a *ngIf="d.download_url || d.file_url" [href]="d.download_url ?? d.file_url"
               target="_blank" class="doc-link">
              <i class="pi pi-download"></i> Download
            </a>
            <span *ngIf="!d.download_url && !d.file_url" class="text-muted">\u2014</span>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="4" class="empty-msg">No documents found</td></tr>
      </ng-template>
    </p-table>
  `,
    styles: [`
    .empty-msg {
      text-align: center; color: var(--text-color-secondary, #9ca3af);
      padding: var(--space-xl, 32px);
    }
    .doc-link {
      color: var(--primary-500, #3b82f6); text-decoration: none;
      font-size: var(--font-size-sm, 13px);
    }
    .doc-link:hover { text-decoration: underline; }
    .text-muted { color: var(--text-color-secondary, #9ca3af); }
  `]
})
export class VendorDocumentsTabComponent {
  readonly i18n = inject(I18nService);

  @Input() documents: GrcRecord[] = [];
  @Input() loading = false;
}
