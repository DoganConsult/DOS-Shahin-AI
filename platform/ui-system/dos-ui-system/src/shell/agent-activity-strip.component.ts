/**
 * Phase WS-2 — workspace.agent-strip wrapper.
 * Selector: dos-agent-activity-strip
 * Carbon primitive: tiles.
 * Mobile_mode: scroll-snap horizontal at ≤480px.
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { AgentActivity } from './workspace-shell.contracts';

@Component({
  selector: 'dos-agent-activity-strip',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dos-agent-strip"
             [class.dos-agent-strip--mobile]="mobileMode"
             aria-label="Agent activity"
             data-testid="dos-agent-activity-strip">
      @for (a of activities; track a.id) {
        <article class="dos-agent-strip__cell"
                 [attr.data-state]="a.state"
                 [attr.data-agent-id]="a.agentId"
                 (click)="select.emit(a)"
                 data-cds-component="tile">
          <strong class="dos-agent-strip__name">{{ a.agentName.fallback ?? a.agentName.i18nKey }}</strong>
          <span class="dos-agent-strip__step">{{ a.step.fallback ?? a.step.i18nKey }}</span>
          <span class="dos-agent-strip__state" data-cds-component="tag">{{ a.state }}</span>
        </article>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .dos-agent-strip { display: flex; gap: .5rem; padding: .5rem; overflow-x: auto; }
    .dos-agent-strip__cell { display: flex; flex-direction: column; gap: .25rem; min-width: 12rem; padding: .5rem; border: 1px solid var(--cds-border-subtle, #e0e0e0); cursor: pointer; }
    .dos-agent-strip__cell[data-state=running] { border-color: var(--cds-support-info, #0f62fe); }
    .dos-agent-strip__cell[data-state=error] { border-color: var(--cds-support-error, #da1e28); }
    .dos-agent-strip__cell[data-state=awaiting-approval] { border-color: var(--cds-support-warning, #f1c21b); }
    .dos-agent-strip--mobile { scroll-snap-type: x mandatory; }
    .dos-agent-strip--mobile .dos-agent-strip__cell { scroll-snap-align: start; }
    .dos-agent-strip__step { color: var(--cds-text-secondary, #6f6f6f); font-size: .75rem; }
  `],
})
export class DosAgentActivityStripComponent {
  @Input() activities: AgentActivity[] = [];
  @Input() mobileMode = false;
  @Output() select = new EventEmitter<AgentActivity>();
}
