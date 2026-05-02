import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * Presentational component: displays policy-as-code rules
 * and allows executing them against the policy.
 */
@Component({
    selector: 'app-policy-rules-dialog',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, JsonPipe, DialogModule, ButtonModule],
    template: `
    <p-dialog [header]="i18n.translate('policies.policyRules')"
      [(visible)]="visible" [modal]="true" [style]="{width:'700px'}"
      (onHide)="visibleChange.emit(false)">
      <div *ngIf="loading" style="text-align:center; padding:24px;"><i class="pi pi-spin pi-spinner" style="font-size: var(--font-size-2xl);"></i></div>
      <div *ngIf="!loading && rules.length === 0" class="empty-state" style="padding:24px;">No rules defined for this policy</div>
      <div *ngIf="!loading && rules.length > 0" class="rules-list">
        <div *ngFor="let rule of rules; let idx = index" class="rule-card">
          <div class="rule-header">
            <span class="rule-idx">#{{ idx + 1 }}</span>
            <span class="rule-field">{{ rule.field }}</span>
            <span class="rule-op">{{ rule.operator }}</span>
            <span class="rule-val">{{ rule.value }}</span>
            <span class="rule-severity" [class]="'sev-' + rule.severity">{{ rule.severity }}</span>
          </div>
          <p class="rule-message" *ngIf="rule.message">{{ rule.message }}</p>
        </div>
      </div>
      <div *ngIf="executeResult" class="execute-result">
        <strong>{{ i18n.translate('policies.executionResult') }}</strong>
        <pre>{{ executeResult | json }}</pre>
      </div>
      <ng-template pTemplate="footer">
        <p-button [label]="i18n.translate('policies.executeRules')" icon="pi pi-play"
          (onClick)="execute.emit()" [disabled]="rules.length === 0" />
        <p-button [label]="i18n.translate('policies.close')" icon="pi pi-times" [text]="true" (onClick)="visibleChange.emit(false)" />
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .rules-list { display: flex; flex-direction: column; gap: 8px; }
    .rule-card { padding: 10px 14px; background: var(--surface-sunken, var(--surface-ice)); border-radius: var(--radius); border: 1px solid var(--border-subtle, var(--border-subtle)); }
    .rule-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: var(--font-size-sm); }
    .rule-idx { font-weight: 800; color: var(--text-muted, var(--text-muted)); font-size: var(--font-size-xs); }
    .rule-field { font-weight: 700; color: var(--text-heading, var(--text-heading)); font-family: monospace; }
    .rule-op { padding: 1px 6px; border-radius: var(--radius-xs); background: #eff6ff; color: var(--primary); font-size: var(--font-size-xs); font-weight: 600; }
    .rule-val { font-family: monospace; color: var(--success); font-weight: 600; }
    .rule-severity { padding: 1px 8px; border-radius: var(--radius-pill); font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; }
    .sev-critical { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .sev-high { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .sev-medium { background: #fefce8; color: #a16207; }
    .sev-low { background: var(--status-success-bg, #defbe6); color: #15803d; }
    .rule-message { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); margin: 4px 0 0; }
    .execute-result { margin-top: 12px; padding: 10px; background: var(--status-info-bg, #edf5ff); border: 1px solid #bae6fd; border-radius: var(--radius); font-size: var(--font-size-sm); }
    .execute-result pre { margin: 4px 0 0; font-size: var(--font-size-xs); white-space: pre-wrap; max-height: 200px; overflow: auto; }
    .empty-state { text-align: center; color: var(--text-muted); }
  `]
})
export class PolicyRulesDialogComponent {
  @Input() visible = false;
  @Input() loading = false;
  @Input() rules: GrcRecord[] = [];
  @Input() executeResult: GrcRecord | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() execute = new EventEmitter<void>();

  constructor(public i18n: I18nService) {}
}
