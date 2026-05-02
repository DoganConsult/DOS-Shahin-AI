import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
// Wave D-2 (Roadmap §2 P0 #16) — adopt DosDesktopDialog (Wave H).
// Class name says "drawer" but the chrome was a centered <p-dialog>
// modal. The right target is the desktop dialog primitive, not the
// mobile-drawer primitive that the original roadmap suggested.
import { DosDesktopDialogComponent } from '@dos/ui-system';
import { RaciPanelComponent } from '@app/shared/components/domain-panels/raci-panel.component';
import { EvidenceTableItem } from './evidence-table.component';

/**
 * Presentational component: evidence detail dialog showing
 * metadata, hash chain info, and attached files.
 */
@Component({
    selector: 'app-evidence-detail-drawer',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, AppDatePipe, AppNumberPipe, DosDesktopDialogComponent, RaciPanelComponent],
    template: `
    <dos-desktop-dialog
      [open]="visible"
      title="Evidence Detail"
      width="md"
      (closed)="visibleChange.emit(false)">
      <div *ngIf="item" class="detail-content">
        <app-raci-panel entityType="evidence" [entityId]="item.evidence_id || ''" [canEdit]="true" />
        <div class="detail-row"><strong>Title:</strong> {{ item.title }}</div>
        <div class="detail-row"><strong>Control:</strong> {{ item.control_id }}</div>
        <div class="detail-row"><strong>Version:</strong> {{ item.version }}</div>
        <div class="detail-row"><strong>Chain Position:</strong> {{ item.chain_position }}</div>
        <div class="detail-row"><strong>Content Hash:</strong> <code>{{ item.content_hash }}</code></div>
        <div class="detail-row"><strong>Previous Hash:</strong> <code>{{ item.previous_hash || 'genesis' }}</code></div>
        <div class="detail-row"><strong>Submitted By:</strong> {{ item.submitted_by }}</div>
        <div class="detail-row"><strong>Created:</strong> {{ item.created_at | appDate:'medium' }}</div>
        <div class="detail-row" *ngIf="item.expiry_date"><strong>Expires:</strong> {{ item.expiry_date | appDate:'medium' }}</div>
        <div class="detail-row" *ngIf="item.file_path"><strong>File:</strong> {{ item.file_path }}</div>
        <div class="detail-row" *ngIf="item.file_size_bytes"><strong>Size:</strong> {{ (item.file_size_bytes / 1024) | appNumber:'decimal':'1.0-0' }} KB</div>
        <div class="detail-row" *ngIf="item.description"><strong>Description:</strong> {{ item.description }}</div>
        <div class="detail-files" *ngIf="files.length > 0">
          <h5>Attached Files ({{ files.length }})</h5>
          <div *ngFor="let f of files" class="file-row">
            <i class="pi pi-file"></i> {{ f.originalFilename || f.filename }} ({{ (f.fileSizeBytes / 1024) | appNumber:'decimal':'1.0-0' }} KB)
          </div>
        </div>
      </div>
    </dos-desktop-dialog>
  `,
    styles: [`
    .detail-content { display: flex; flex-direction: column; gap: 8px; }
    .detail-row { font-size: var(--font-size-sm); }
    .detail-row strong { color: var(--text-heading); }
    .detail-row code { font-size: var(--font-size-xs); word-break: break-all; }
    .detail-files { margin-top: 12px; border-top: 1px solid var(--surface-border); padding-top: 8px; }
    .detail-files h5 { margin: 0 0 6px; font-size: var(--font-size-sm); }
    .file-row { font-size: var(--font-size-sm); padding: 3px 0; display: flex; align-items: center; gap: 6px; }
  `]
})
export class EvidenceDetailDrawerComponent {
  @Input() visible = false;
  @Input() item: EvidenceTableItem | null = null;
  @Input() files: Record<string, any>[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();

  constructor(public i18n: I18nService) {}
}
