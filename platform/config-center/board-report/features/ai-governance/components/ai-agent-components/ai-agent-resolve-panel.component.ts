import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface GovernedResolution {
  mismatch_details?: string;
  action_taken?: string;
  allowlist_advisory?: string;
  resolved_version_id?: string;
  asset_id?: string;
  agent_config?: Record<string, unknown>;
  capabilities?: string[];
  [key: string]: unknown;
}

/**
 * Presentational component for the governed agent resolution panel.
 * Allows users to enter an agent ID, trigger resolution, and view results
 * including mismatch details, actions taken, and allowlist advisories.
 */
@Component({
    selector: 'app-ai-agent-resolve-panel',
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        JsonPipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="resolve-panel">
      <h4 class="resolve-title">{{ i18n.translate('ai.agents.resolveTitle') }}</h4>
      <div class="resolve-form">
        <input
          pInputText
          type="text"
          [placeholder]="i18n.translate('ai.agents.agentIdPlaceholder')"
          [ngModel]="agentId"
          (ngModelChange)="agentIdChange.emit($event)"
          class="resolve-input" />
        <button
          pButton
          [label]="i18n.translate('ai.agents.resolve')"
          icon="pi pi-search"
          class="p-button-sm"
          [disabled]="!agentId || loading"
          [loading]="loading"
          (click)="resolve.emit()">
        </button>
      </div>
      <!-- Resolution result -->
      <div *ngIf="result" class="resolve-result">
        <div class="resolve-row">
          <span class="resolve-label">{{ i18n.translate('ai.agents.resolvedVersion') }}:</span>
          <span>{{ result.resolved_version_id || '-' }}</span>
        </div>
        <div class="resolve-row" *ngIf="result.agent_config">
          <span class="resolve-label">{{ i18n.translate('ai.agents.agentConfig') }}:</span>
          <code class="config-preview">{{ result.agent_config | json }}</code>
        </div>
        <div *ngIf="result.mismatch_details" class="resolve-row resolve-warn">
          <span class="resolve-label">{{ i18n.translate('ai.agents.mismatch') }}:</span>
          <span>{{ result.mismatch_details }}</span>
        </div>
        <div *ngIf="result.action_taken" class="resolve-row">
          <span class="resolve-label">{{ i18n.translate('ai.agents.actionTaken') }}:</span>
          <span>{{ result.action_taken }}</span>
        </div>
        <div *ngIf="result.allowlist_advisory" class="resolve-row">
          <span class="resolve-label">{{ i18n.translate('ai.agents.allowlistAdvisory') }}:</span>
          <span>{{ result.allowlist_advisory }}</span>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .resolve-panel {
      border-top: 1px solid var(--surface-border);
      padding: 1rem;
      margin-top: auto;
    }

    .resolve-title {
      margin: 0 0 0.75rem 0;
      font-size: var(--font-size-body-sm);
      font-weight: 600;
      color: var(--text-color);
    }

    .resolve-form {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .resolve-input {
      flex: 1;
      max-width: 320px;
    }

    .resolve-result {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: var(--surface-ground);
      border-radius: var(--radius-sm);
      border: 1px solid var(--surface-border);
    }

    .resolve-row {
      display: flex;
      gap: 0.5rem;
      padding: 0.25rem 0;
      font-size: var(--font-size-tag);
    }

    .resolve-label {
      font-weight: 600;
      min-width: 120px;
      color: var(--text-color-secondary);
    }

    .resolve-warn {
      color: #ea580c;
    }

    .config-preview {
      font-size: var(--font-size-caption);
      background: var(--surface-ground);
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-xs);
      word-break: break-all;
      max-width: 300px;
      display: inline-block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .resolve-form {
        flex-direction: column;
        align-items: stretch;
      }

      .resolve-input {
        max-width: 100%;
      }
    }
  `]
})
export class AiAgentResolvePanelComponent {
  readonly i18n = inject(I18nService);

  // ── Inputs ────────────────────────────────────────────────────────────────
  @Input() agentId = '';
  @Input() loading = false;
  @Input() result: GovernedResolution | null = null;

  // ── Outputs ───────────────────────────────────────────────────────────────
  @Output() agentIdChange = new EventEmitter<string>();
  @Output() resolve = new EventEmitter<void>();
}
