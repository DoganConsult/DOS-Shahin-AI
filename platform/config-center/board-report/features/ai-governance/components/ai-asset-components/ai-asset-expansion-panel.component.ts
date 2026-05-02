import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChipModule } from 'primeng/chip';
import { ButtonModule } from 'primeng/button';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-ai-asset-expansion-panel',
    imports: [
        CommonModule,
        ChipModule,
        ButtonModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="expansion-panel">

      <!-- Description -->
      <div class="detail-section" *ngIf="asset?.description">
        <label class="detail-label">{{ i18n.translate('ai.assets.description') }}</label>
        <p class="detail-text">{{ asset.description }}</p>
      </div>

      <!-- Metadata -->
      <div class="detail-section" *ngIf="asset?.metadata && hasKeys(asset.metadata)">
        <label class="detail-label">{{ i18n.translate('ai.assets.metadata') }}</label>
        <pre class="metadata-pre">{{ asset.metadata | json }}</pre>
      </div>

      <!-- Tags -->
      <div class="detail-section" *ngIf="asset?.tags?.length">
        <label class="detail-label">{{ i18n.translate('ai.assets.tags') }}</label>
        <div class="tags-row">
          <p-chip *ngFor="let tag of asset.tags" [label]="tag" styleClass="tag-chip" />
        </div>
      </div>

      <!-- Ownership -->
      <div class="detail-section ownership-grid">
        <div *ngIf="asset?.business_owner">
          <label class="detail-label">{{ i18n.translate('ai.assets.businessOwner') }}</label>
          <span>{{ asset.business_owner }}</span>
        </div>
        <div *ngIf="asset?.technical_owner">
          <label class="detail-label">{{ i18n.translate('ai.assets.technicalOwner') }}</label>
          <span>{{ asset.technical_owner }}</span>
        </div>
        <div *ngIf="asset?.governance_owner">
          <label class="detail-label">{{ i18n.translate('ai.assets.governanceOwner') }}</label>
          <span>{{ asset.governance_owner }}</span>
        </div>
      </div>

      <!-- Lifecycle Transition Buttons -->
      <div class="detail-section" *ngIf="!isSeededGlobal && asset?.allowed_transitions?.length">
        <label class="detail-label">{{ i18n.translate('ai.assets.transitions') }}</label>
        <div class="transition-buttons">
          <button
            *ngFor="let target of asset.allowed_transitions"
            pButton
            [label]="target"
            class="p-button-sm p-button-outlined"
            [loading]="transitioning"
            (click)="transition.emit({ asset: asset, target: target })">
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .expansion-panel {
      padding: 1rem 1.5rem;
      background: var(--surface-ground);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .detail-section {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .detail-label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-color-secondary);
    }
    .detail-text {
      margin: 0;
      font-size: var(--font-size-base);
      color: var(--text-color);
    }
    .metadata-pre {
      margin: 0;
      padding: 0.75rem;
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-caption);
      font-family: var(--font-family-monospace, monospace);
      max-height: 200px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .tags-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
    :host .tag-chip { font-size: var(--font-size-sm); }
    .ownership-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
    }
    .ownership-grid > div {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .transition-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
  `]
})
export class AiAssetExpansionPanelComponent {
  readonly i18n = inject(I18nService);

  /** The asset whose details are shown in the expansion panel. */
  @Input() asset: any;

  /** Whether the asset is a seeded global (disables transitions). */
  @Input() isSeededGlobal = false;

  /** Whether a lifecycle transition is currently in progress. */
  @Input() transitioning = false;

  /** Emitted when a lifecycle transition button is clicked. */
  @Output() transition = new EventEmitter<{ asset: any; target: string }>();

  /** Check if an object has any own keys. */
  hasKeys(obj: Record<string, unknown> | null | undefined): boolean {
    return !!obj && Object.keys(obj).length > 0;
  }
}
