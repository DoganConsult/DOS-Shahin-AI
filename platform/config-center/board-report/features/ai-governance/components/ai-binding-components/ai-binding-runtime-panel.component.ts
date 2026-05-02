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

import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface DropdownOption {
  label: string;
  value: string;
}

export interface RuntimeAllowlistItem {
  asset_id: string;
  asset_type: string;
  display_name?: string;
}

/**
 * Presentational component for the Runtime Inspection panel at the
 * bottom of the AI Bindings page. Provides two lookup sections:
 * (1) tools enabled for a selected agent, (2) active allowlist entries.
 */
@Component({
    selector: 'app-ai-binding-runtime-panel',
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        DropdownModule,
        TagModule,
        ProgressSpinnerModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="runtime-panel">
      <h4 class="runtime-title">{{ i18n.translate('ai.bindings.runtimeInspection') }}</h4>

      <div class="runtime-sections">
        <!-- Tools for Agent -->
        <div class="runtime-section">
          <label class="runtime-label">{{ i18n.translate('ai.bindings.toolsForAgent') }}</label>
          <div class="runtime-form">
            <p-dropdown
              [options]="agentOptions"
              [(ngModel)]="runtimeAgentId"
              [placeholder]="i18n.translate('ai.bindings.selectAgent')"
              [showClear]="true"
              optionLabel="label"
              optionValue="value"
              styleClass="runtime-dropdown">
            </p-dropdown>
            <button
              pButton
              icon="pi pi-search"
              class="p-button-sm p-button-outlined"
              [loading]="runtimeToolsLoading"
              [disabled]="!runtimeAgentId"
              (click)="loadTools.emit(runtimeAgentId)">
            </button>
          </div>
          <div *ngIf="runtimeTools" class="runtime-result">
            <div *ngIf="runtimeTools.length === 0" class="text-muted">{{ i18n.translate('ai.bindings.noRuntimeTools') }}</div>
            <div *ngFor="let t of runtimeTools" class="runtime-item">
              <i class="pi pi-wrench"></i> {{ t }}
            </div>
          </div>
        </div>

        <!-- Active Allowlist -->
        <div class="runtime-section">
          <label class="runtime-label">{{ i18n.translate('ai.bindings.activeAllowlist') }}</label>
          <div class="runtime-form">
            <p-dropdown
              [options]="allowlistTypeOptions"
              [(ngModel)]="runtimeAllowlistType"
              [placeholder]="i18n.translate('ai.bindings.filterAssetType')"
              [showClear]="true"
              optionLabel="label"
              optionValue="value"
              styleClass="runtime-dropdown">
            </p-dropdown>
            <button
              pButton
              icon="pi pi-search"
              class="p-button-sm p-button-outlined"
              [loading]="runtimeAllowlistLoading"
              (click)="loadAllowlist.emit(runtimeAllowlistType || undefined)">
            </button>
          </div>
          <div *ngIf="runtimeAllowlist" class="runtime-result">
            <div *ngIf="runtimeAllowlist.length === 0" class="text-muted">{{ i18n.translate('ai.bindings.noRuntimeAllowlist') }}</div>
            <div *ngFor="let e of runtimeAllowlist" class="runtime-item">
              <p-tag [value]="e.asset_type" [severity]="e.asset_type === 'provider' ? 'info' : 'warning'" styleClass="runtime-tag" />
              {{ e.display_name || e.asset_id }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .runtime-panel {
      border-top: 1px solid var(--surface-border);
      padding: 1rem 0;
    }
    .runtime-title {
      margin: 0 0 0.75rem 0;
      font-size: var(--font-size-body-sm);
      font-weight: 600;
      color: var(--text-color);
    }
    .runtime-sections {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .runtime-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .runtime-label {
      font-size: var(--font-size-tag);
      font-weight: 500;
      color: var(--text-color-secondary);
    }
    .runtime-form {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .runtime-dropdown {
      flex: 1;
      max-width: 320px;
    }
    .runtime-result {
      padding: 0.75rem;
      background: var(--surface-ground);
      border-radius: var(--radius-sm);
      border: 1px solid var(--surface-border);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-height: 200px;
      overflow-y: auto;
    }
    .runtime-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: var(--font-size-tag);
      padding: 0.125rem 0;
    }
    .runtime-tag { font-size: var(--font-size-xs); }
    .text-muted {
      color: var(--text-color-secondary);
      font-size: var(--font-size-tag);
    }
    @media (max-width: 768px) {
      .runtime-sections { grid-template-columns: 1fr; }
      .runtime-dropdown { max-width: 100%; }
    }
  `]
})
export class AiBindingRuntimePanelComponent {
  readonly i18n = inject(I18nService);

  // ── Inputs ───────────────────────────────────────────────────────────────────

  @Input() agentOptions: DropdownOption[] = [];
  @Input() allowlistTypeOptions: DropdownOption[] = [];

  @Input() runtimeToolsLoading = false;
  @Input() runtimeTools: string[] | null = null;

  @Input() runtimeAllowlistLoading = false;
  @Input() runtimeAllowlist: RuntimeAllowlistItem[] | null = null;

  // ── Outputs ──────────────────────────────────────────────────────────────────

  @Output() loadTools = new EventEmitter<string>();
  @Output() loadAllowlist = new EventEmitter<string | undefined>();

  // ── Local state ──────────────────────────────────────────────────────────────

  runtimeAgentId = '';
  runtimeAllowlistType = '';
}
