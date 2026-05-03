/**
 * Phase WS-2 — workspace.action-queue wrapper (SHELL strip variant).
 * Selector: dos-action-queue
 * Carbon primitive: tiles.
 * Mobile_mode: card-list (vertical stack at ≤480px).
 *
 * NOTE: This is the LIGHT SHELL strip — distinct from the full
 * page-archetype `dos-module-workqueue-list` template.
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ActionQueueItem } from './workspace-shell.contracts';

@Component({
  selector: 'dos-action-queue',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="dos-action-queue"
           [class.dos-action-queue--mobile]="mobileMode"
           aria-label="Action queue"
           data-testid="dos-action-queue">
      <header class="dos-action-queue__hdr">
        <strong>Action queue</strong>
        <span class="dos-action-queue__count" data-cds-component="tag">{{ items.length }}</span>
      </header>
      @if (items.length) {
        <ul class="dos-action-queue__list">
          @for (item of items; track item.id) {
            <li class="dos-action-queue__item"
                [attr.data-status]="item.status"
                [attr.data-severity]="item.severity ?? ''"
                [attr.data-action-id]="item.id"
                (click)="open.emit(item)"
                data-cds-component="tile">
              <span class="dos-action-queue__title">{{ item.title.fallback ?? item.title.i18nKey }}</span>
              @if (item.dueAt) { <time class="dos-action-queue__due">{{ item.dueAt | date:'shortDate' }}</time> }
            </li>
          }
        </ul>
      } @else {
        <p class="dos-action-queue__empty">No pending actions.</p>
      }
    </aside>
  `,
  styles: [`
    :host { display: block; }
    .dos-action-queue { display: flex; flex-direction: column; gap: .5rem; padding: .5rem; }
    .dos-action-queue__hdr { display: flex; gap: .5rem; align-items: center; }
    .dos-action-queue__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .25rem; }
    .dos-action-queue__item { display: flex; gap: .5rem; align-items: center; padding: .5rem; cursor: pointer; border: 1px solid var(--cds-border-subtle, #e0e0e0); }
    .dos-action-queue__item[data-severity=critical] { border-inline-start: 3px solid var(--cds-support-error, #da1e28); }
    .dos-action-queue__item[data-severity=high]     { border-inline-start: 3px solid var(--cds-support-warning, #f1c21b); }
    .dos-action-queue__due { margin-inline-start: auto; color: var(--cds-text-secondary, #6f6f6f); font-size: .75rem; }
    .dos-action-queue__empty { color: var(--cds-text-secondary, #6f6f6f); padding: .5rem; }
  `],
})
export class DosActionQueueComponent {
  @Input() items: ActionQueueItem[] = [];
  @Input() mobileMode = false;
  @Output() open = new EventEmitter<ActionQueueItem>();
}
