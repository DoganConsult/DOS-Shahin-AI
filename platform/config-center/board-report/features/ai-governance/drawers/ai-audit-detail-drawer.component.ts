import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

// Wave D-2 (Roadmap §2 P0 #15) — adopt DosSideDrawer (Wave H-2).
// Original chrome was <p-dialog position="right" [modal]> at 700px,
// which is a right-side sliding panel pattern, not a centered modal.
// DosSideDrawer is the canonical replacement.
import { DosSideDrawerComponent } from '@dos/ui-system';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcRecord } from '@app/core/models/shared.types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AiSignalDetail {
  id: string;
  signal_type: string;
  severity: string;
  status: string;
  source_module: string;
  detected_at: string;
  events?: GrcRecord[];
  issues?: GrcRecord[];
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-ai-audit-detail-drawer',
    imports: [
        CommonModule,
        DosSideDrawerComponent,
        TagModule,
        ProgressSpinnerModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <dos-side-drawer
      [open]="visible"
      [title]="i18n.translate('ai.audit.signalDetail')"
      position="right"
      width="lg"
      (closed)="closed.emit()">

      <div *ngIf="loading" class="dialog-spinner">
        <p-progressSpinner strokeWidth="3" />
      </div>

      <div *ngIf="!loading && detail">
        <h4>{{ detail.signal_type }}</h4>
        <p>
          <strong>{{ i18n.translate('ai.audit.severity') }}:</strong>
          <p-tag [value]="detail.severity" [severity]="getSeverityTag(detail.severity)" class="ms-2" />
        </p>
        <p>
          <strong>{{ i18n.translate('ai.audit.status') }}:</strong>
          <p-tag [value]="detail.status" [severity]="getStatusTag(detail.status)" class="ms-2" />
        </p>

        <!-- Events -->
        <div *ngIf="detail.events?.length" class="detail-section">
          <h5>{{ i18n.translate('ai.audit.events') }}</h5>
          <ul class="detail-list">
            <li *ngFor="let evt of detail.events">
              <span class="mono">{{ evt.event_type || evt.type || 'event' }}</span>
              -- {{ evt.description || evt.message || (evt | json) }}
            </li>
          </ul>
        </div>

        <!-- Linked Issues -->
        <div *ngIf="detail.issues?.length" class="detail-section">
          <h5>{{ i18n.translate('ai.audit.linkedIssues') }}</h5>
          <ul class="detail-list">
            <li *ngFor="let iss of detail.issues">
              <p-tag [value]="iss.severity" [severity]="getSeverityTag(iss.severity)" class="me-2" />
              {{ iss.issue_type || iss.type }}: {{ iss.description || '--' }}
            </li>
          </ul>
        </div>
      </div>
    </dos-side-drawer>
  `,
    styles: [`
    .dialog-spinner { display: flex; justify-content: center; padding: 2rem; }
    .ms-2 { margin-inline-start: 0.5rem; }
    .me-2 { margin-inline-end: 0.5rem; }
    .mono { font-family: 'Fira Code', 'Consolas', monospace; font-size: var(--font-size-tag); }
    .detail-section { margin-top: 1rem; }
    .detail-section h5 { margin: 0 0 0.5rem; font-weight: 600; }
    .detail-list { list-style: disc; padding-inline-start: 1.25rem; margin: 0; }
    .detail-list li { margin-bottom: 0.35rem; line-height: 1.4; }
  `]
})
export class AiAuditDetailDrawerComponent {
  readonly i18n = inject(I18nService);

  /** Whether the drawer is visible. */
  @Input() visible = false;

  /** Whether detail data is loading. */
  @Input() loading = false;

  /** The signal detail data to display. */
  @Input() detail: AiSignalDetail | null = null;

  /** Emitted when the drawer is closed. */
  @Output() closed = new EventEmitter<void>();

  /** Map severity level to PrimeNG tag severity. */
  getSeverityTag(severity: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (severity) {
      case 'critical': case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      case 'info': return 'success';
      default: return undefined;
    }
  }

  /** Map status to PrimeNG tag severity. */
  getStatusTag(status: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (status) {
      case 'resolved': case 'accepted': return 'success';
      case 'open': case 'pending': return 'warning';
      case 'dismissed': case 'rejected': return 'danger';
      default: return 'info';
    }
  }
}
