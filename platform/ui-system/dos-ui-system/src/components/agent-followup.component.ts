import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DosAgentFollowUpSeverity = 'critical' | 'warning' | 'info';
export interface DosAgentFollowUpInput {
  id: string;
  triggerEvent: string;
  agentId: string;
  actionKey: string;
  dueWithinHours?: number;
  permission?: string;
  severity?: DosAgentFollowUpSeverity;
  description?: string;
}

@Component({
  selector: 'dos-agent-followup',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rules?.length) {
      <section class="dos-afu" role="region" aria-label="Agent follow-up suggestions">
        <header class="dos-afu__head">
          <span class="dos-afu__eyebrow">Agent follow-ups</span>
          <span class="dos-afu__count">{{ rules.length }}</span>
        </header>
        <ul class="dos-afu__list">
          @for (r of rules; track r.id) {
            <li class="dos-afu__row" [attr.data-severity]="r.severity ?? 'info'">
              <div class="dos-afu__main">
                <span class="dos-afu__trigger">{{ r.triggerEvent }}</span>
                @if (r.description) { <span class="dos-afu__desc">{{ r.description }}</span> }
                <span class="dos-afu__agent">by {{ r.agentId }}</span>
              </div>
              <div class="dos-afu__meta">
                @if (r.dueWithinHours != null) {
                  <span class="dos-afu__due">due {{ r.dueWithinHours }}h</span>
                }
                <button type="button" class="dos-afu__btn"
                        (click)="invoke.emit({ ruleId: r.id, actionKey: r.actionKey })">
                  Run
                </button>
              </div>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: [`
    .dos-afu { padding: 1rem 1.25rem; border: 1px solid var(--dos-color-border, #e0e0e0);
      border-radius: var(--dos-radius-md, 8px); background: var(--dos-color-surface, #fff); }
    .dos-afu__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .dos-afu__eyebrow { font-size: 0.625rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--dos-color-text-subtle, #525252); }
    .dos-afu__count { font-size: 0.75rem; padding: 1px 8px; border-radius: 999px; background: var(--dos-color-surface-muted, #f4f4f4); }
    .dos-afu__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .dos-afu__row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 0.5rem 0.75rem; border-radius: 4px; background: var(--dos-color-surface-muted, #f4f4f4); border-left: 3px solid transparent; }
    .dos-afu__row[data-severity='critical'] { border-left-color: #da1e28; }
    .dos-afu__row[data-severity='warning']  { border-left-color: #f1c21b; }
    .dos-afu__row[data-severity='info']     { border-left-color: #0f62fe; }
    .dos-afu__main { display: flex; flex-direction: column; gap: 0.125rem; }
    .dos-afu__trigger { font-weight: 500; }
    .dos-afu__desc { font-size: 0.8125rem; color: var(--dos-color-text-subtle, #525252); }
    .dos-afu__agent { font-size: 0.6875rem; font-family: var(--dos-font-mono, monospace); color: var(--dos-color-text-subtle, #525252); }
    .dos-afu__meta { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
    .dos-afu__due { font-size: 0.75rem; color: var(--dos-color-text-subtle, #525252); }
    .dos-afu__btn { padding: 0.25rem 0.625rem; border: 1px solid var(--dos-color-border, #e0e0e0); background: var(--dos-color-surface, #fff); border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
  `],
})
export class DosAgentFollowupComponent {
  @Input() rules: DosAgentFollowUpInput[] = [];
  @Output() invoke = new EventEmitter<{ ruleId: string; actionKey: string }>();
}
