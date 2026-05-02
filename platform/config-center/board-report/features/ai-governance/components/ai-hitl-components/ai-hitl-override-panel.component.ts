import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface HitlDetailItem {
  state_id: string;
  entity_type: string;
  entity_id: string;
  hitl_state: string;
  confidence: number;
  review_decision?: string;
  updated_at: string;
}

export interface SlaConfig {
  entity_type: string;
  warn_hours: number;
  breach_hours: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Displays the selected item detail panel with inline review form,
 * plus the SLA configuration table.
 */
@Component({
    selector: 'app-ai-hitl-override-panel',
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        TagModule,
        ButtonModule,
        DropdownModule,
        InputTextModule,
        InputTextarea,
        TooltipModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- Selected Item Detail -->
    @if (selectedDetail) {
      <div class="detail-panel">
        <h3 class="section-title">{{ i18n.translate('ai.hitl.itemDetail') }}</h3>
        <div class="detail-grid">
          <div class="detail-field">
            <span class="detail-label">{{ i18n.translate('ai.hitl.entityType') }}</span>
            <span class="detail-value">{{ selectedDetail.entity_type }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">{{ i18n.translate('ai.hitl.entityId') }}</span>
            <span class="detail-value mono">{{ selectedDetail.entity_id }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">{{ i18n.translate('ai.hitl.state') }}</span>
            <span class="detail-value">
              <p-tag [value]="selectedDetail.hitl_state" [severity]="stateSeverity(selectedDetail.hitl_state)" />
            </span>
          </div>
          <div class="detail-field">
            <span class="detail-label">{{ i18n.translate('ai.hitl.confidence') }}</span>
            <span class="detail-value">{{ selectedDetail.confidence | number:'1.0-1' }}%</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">{{ i18n.translate('ai.hitl.reviewDecision') }}</span>
            <span class="detail-value">{{ selectedDetail.review_decision ?? '--' }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">{{ i18n.translate('ai.hitl.updatedAt') }}</span>
            <span class="detail-value">{{ selectedDetail.updated_at | date:'medium' }}</span>
          </div>
        </div>

        <!-- Inline review form for pending items -->
        @if (selectedDetail.hitl_state === 'pending_review' || selectedDetail.hitl_state === 'ai_draft') {
          <h4 class="section-title">{{ i18n.translate('ai.hitl.reviewForm') }}</h4>
          <div class="review-form">
            <div class="detail-field" style="max-width:300px;">
              <label class="detail-label">{{ i18n.translate('ai.hitl.decision') }}</label>
              <p-dropdown
                [options]="decisionOptions"
                [(ngModel)]="reviewDecision"
                optionLabel="label"
                optionValue="value"
                [placeholder]="i18n.translate('ai.hitl.selectDecision')"
                styleClass="w-full">
              </p-dropdown>
            </div>
            <div class="detail-field">
              <label class="detail-label">{{ i18n.translate('ai.hitl.notes') }}</label>
              <textarea
                pInputTextarea
                [(ngModel)]="reviewNotes"
                [rows]="3"
                class="w-full"
                [placeholder]="i18n.translate('ai.hitl.notesPlaceholder')">
              </textarea>
            </div>
            <button
              pButton
              [label]="i18n.translate('ai.hitl.submitReview')"
              icon="pi pi-send"
              class="p-button-sm"
              [loading]="reviewLoading"
              [disabled]="!reviewDecision"
              (click)="submitReview.emit({ decision: reviewDecision, notes: reviewNotes })">
            </button>
          </div>
        }
      </div>
    }

    <!-- SLA Configuration Section -->
    <div class="detail-panel">
      <h3 class="section-title">{{ i18n.translate('ai.hitl.slaConfig') }}</h3>
      <p-table
        [value]="slaConfigs"
        styleClass="p-datatable-sm p-datatable-striped"
        responsiveLayout="scroll"
        [paginator]="false">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('ai.hitl.entityType') }}</th>
            <th>{{ i18n.translate('ai.hitl.warnHours') }}</th>
            <th>{{ i18n.translate('ai.hitl.breachHours') }}</th>
            <th>{{ i18n.translate('common.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-cfg>
          <tr>
            <td>{{ cfg.entity_type }}</td>
            <td>
              <input pInputText type="number" [(ngModel)]="cfg.warn_hours" style="width:80px;" min="1" />
            </td>
            <td>
              <input pInputText type="number" [(ngModel)]="cfg.breach_hours" style="width:80px;" min="1" />
            </td>
            <td>
              <button pButton icon="pi pi-save"
                class="p-button-sm p-button-text p-button-success"
                [pTooltip]="i18n.translate('common.save')"
                (click)="saveSla.emit(cfg)">
              </button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="4" class="empty-state-cell">
              {{ i18n.translate('ai.hitl.noSlaConfigs') }}
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
    styles: [`
    .section-title { font-size:var(--font-size-lg); font-weight:700; color:var(--text-heading); margin:16px 0 8px; }
    .detail-panel { margin-top:16px; background:var(--surface-card); border:1px solid var(--surface-border); border-radius:var(--radius-lg); padding:20px 24px; }
    .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 20px; margin-bottom:16px; }
    .detail-field { display:flex; flex-direction:column; gap:2px; }
    .detail-label { font-size:var(--font-size-xs); font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:var(--text-muted); }
    .detail-value { font-size:var(--font-size-sm); font-weight:500; color:var(--text-heading); }
    .mono { font-family:monospace; font-size:0.85rem; }
    .review-form { display:flex; flex-direction:column; gap:12px; }
    .w-full { width:100%; }
    .empty-state-cell { text-align:center; padding:2rem !important; color:var(--text-muted); }
    @media(max-width:768px) { .detail-grid { grid-template-columns:1fr; } }
  `]
})
export class AiHitlOverridePanelComponent {
  readonly i18n = inject(I18nService);

  /** The currently selected HITL item for detail view. */
  @Input() selectedDetail: HitlDetailItem | null = null;

  /** Whether a review submission is in progress. */
  @Input() reviewLoading = false;

  /** SLA configuration entries. */
  @Input() slaConfigs: SlaConfig[] = [];

  /** Decision dropdown options. */
  @Input() decisionOptions: { label: string; value: string }[] = [];

  /** Emitted when inline review is submitted. */
  @Output() submitReview = new EventEmitter<{ decision: string; notes: string }>();

  /** Emitted when an SLA config row is saved. */
  @Output() saveSla = new EventEmitter<SlaConfig>();

  /** Inline review form state. */
  reviewDecision = '';
  reviewNotes = '';

  /** Map HITL state to PrimeNG tag severity. */
  stateSeverity(state: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
    switch (state) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'pending_review': return 'warning';
      case 'ai_draft': return 'info';
      case 'escalated': return 'warning';
      default: return 'secondary';
    }
  }
}
