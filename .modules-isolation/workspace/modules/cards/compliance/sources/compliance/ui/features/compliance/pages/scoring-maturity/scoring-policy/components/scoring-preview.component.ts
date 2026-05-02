/**
 * ScoringPreviewComponent — Dumb presentational component
 * "Apply to Assessment" dialog that lets the user select an assessment
 * and displays the resulting score.
 * Parent: ScoringPolicyComponent
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule, DialogModule, InputModule } from 'carbon-components-angular';

@Component({
  selector: 'app-scoring-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, FormsModule, DialogModule, ButtonModule, InputModule],
  template: `
    <cds-modal
      [header]="i18n.translate('scoringPolicy.applyToAssessment')"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '480px' }"
      [closable]="true"
      (onHide)="closed.emit()"
    >
      <div class="dialog-form">
        <p class="apply-policy-name">
          Policy: <strong>{{ policyName }}</strong>
        </p>
        <div class="field">
          <label>{{ i18n.translate('scoringPolicy.assessmentId') }}</label>
          <input pInputText [(ngModel)]="assessmentId"
                 [placeholder]="i18n.translate('scoringPolicy.assessmentIdPlaceholder')" class="w-full" />
        </div>

        <!-- Result display -->
        <div class="apply-result" *ngIf="result">
          <div class="result-card">
            <div class="result-label">Assessment Score</div>
            <div class="result-score">{{ result.score | number:'1.2-2' }}</div>
            <div class="result-meta">
              Policy: {{ result.policyId }}<br />
              Assessment: {{ result.assessmentId }}
            </div>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button cdsButton [label]="i18n.translate('common.cancel')" icon="" severity="secondary" [text]="true" (onClick)="closed.emit()" />
        <button cdsButton [label]="i18n.translate('scoringPolicy.apply')" icon=""
                  (onClick)="applied.emit(assessmentId)" [disabled]="!assessmentId.trim()" [loading]="loading" />
      </ng-template>
    </cds-modal>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm, 0.875rem); font-weight: 600; color: var(--text-muted, #94a3b8); }
    .w-full { width: 100%; }
    .apply-policy-name { font-size: var(--font-size-sm, 0.875rem); color: var(--text-muted, #94a3b8); margin: 0; }
    .apply-result { margin-top: 8px; }
    .result-card {
      background: var(--surface-ice, #f0f9ff); border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: var(--radius-md, 8px); padding: 16px; text-align: center;
    }
    .result-label { font-size: var(--font-size-sm, 0.875rem); color: var(--text-muted, #94a3b8); margin-bottom: 4px; }
    .result-score { font-size: var(--font-size-4xl); font-weight: 700; color: var(--primary, #2563eb); }
    .result-meta { font-size: var(--font-size-xs, 0.75rem); color: var(--text-muted, #94a3b8); margin-top: 8px; }
  `],
})
export class ScoringPreviewComponent {
  i18n = inject(I18nService);

  @Input() visible = false;
  @Input() policyName = '';
  @Input() loading = false;
  @Input() result: { assessmentId: string; policyId: string; score: number } | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() applied = new EventEmitter<string>();

  assessmentId = '';
}
