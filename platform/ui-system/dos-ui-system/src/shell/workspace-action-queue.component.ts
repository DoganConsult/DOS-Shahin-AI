/**
 * Phase WS-2 + Carbon-Wiring — workspace.action-queue wrapper (SHELL strip).
 * Selector: dos-action-queue
 * Carbon primitive: tiles (TilesModule → cds-tile clickable) + tag (TagModule)
 * DB: dos.dynamic_ui_component_registry component_key='workspace.action-queue' carbon_key='tiles'
 *
 * Token stack:
 *   --cds-tile-*          (Carbon tile tokens)
 *   --shell-status-*-bg   (structural aliases)
 *   premium-data-flash    (overdue item highlight — design-tokens.css)
 *   kpi-count-enter       (count badge pop — design-tokens.css)
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TilesModule } from 'carbon-components-angular';
import { DosCarbonTagComponent, type DosCarbonTagType } from '../carbon/dos-carbon-tag.component';
import type { ActionQueueItem } from './workspace-shell.contracts';

type ItemSeverity = Exclude<ActionQueueItem['severity'], undefined>;
type ItemStatus   = ActionQueueItem['status'];

const SEVERITY_TAG: Record<ItemSeverity, DosCarbonTagType> = {
  critical: 'red',
  high:     'magenta',
  med:      'warm-gray',
  low:      'gray',
};

@Component({
  selector: 'dos-action-queue',
  standalone: true,
  imports: [CommonModule, DatePipe, TilesModule, DosCarbonTagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="dos-action-queue"
           [class.dos-action-queue--mobile]="mobileMode"
           [attr.aria-label]="ariaLabel || null"
           data-testid="dos-action-queue">

      <!-- Queue header -->
      <header class="dos-action-queue__hdr">
        <strong class="dos-action-queue__title">{{ title }}</strong>
        @if (items.length > 0) {
          <dos-carbon-tag type="blue" size="sm" class="dos-action-queue__count">
            {{ items.length }}
          </dos-carbon-tag>
        }
        @if (overdueCount > 0) {
          <dos-carbon-tag type="red" size="sm" class="dos-action-queue__overdue">
            {{ overdueCount }} overdue
          </dos-carbon-tag>
        }
      </header>

      @if (items.length) {
        <ul class="dos-action-queue__list" role="list">
          @for (item of items; track item.id) {
            <li class="dos-action-queue__item"
                [class.dos-action-queue__item--overdue]="isOverdue(item)"
                role="listitem">
              <!-- cds-tile clickable (carbon_key=tiles) -->
              <cds-clickable-tile
                class="dos-action-queue__tile"
                [attr.data-action-id]="item.id"
                [attr.data-status]="item.status"
                [attr.data-severity]="item.severity ?? ''"
                (click)="open.emit(item)">

                <div class="dos-aq-tile-inner">
                  <!-- Severity accent + title -->
                  <div class="dos-aq-tile-header">
                    @if (item.severity) {
                      <span class="dos-aq-severity-bar"
                            [attr.data-severity]="item.severity"
                            aria-hidden="true"></span>
                    }
                    <span class="dos-aq-title">
                      {{ item.title?.fallback ?? item.title?.i18nKey ?? '' }}
                    </span>
                  </div>

                  <!-- Meta row: origin + due + severity tag -->
                  <div class="dos-aq-tile-meta">
                    @if (item.origin) {
                      <span class="dos-aq-origin">
                        {{ item.origin?.fallback ?? item.origin?.i18nKey ?? '' }}
                      </span>
                    }

                    @if (item.dueAt) {
                      <time class="dos-aq-due"
                            [class.dos-aq-due--overdue]="isOverdue(item)"
                            [attr.datetime]="item.dueAt">
                        @if (isOverdue(item)) {
                          <dos-carbon-tag type="red" size="sm">
                            {{ daysLabel(item.dueAt) }}
                          </dos-carbon-tag>
                        } @else {
                          {{ item.dueAt | date:'shortDate' }}
                        }
                      </time>
                    }

                    @if (item.severity) {
                      <dos-carbon-tag
                        [type]="severityTag(item.severity)"
                        size="sm"
                        class="dos-aq-severity-tag">
                        {{ item.severity }}
                      </dos-carbon-tag>
                    }
                  </div>
                </div>
              </cds-clickable-tile>
            </li>
          }
        </ul>
      } @else {
        <div class="dos-action-queue__empty">
          <p>{{ emptyText || 'No pending actions.' }}</p>
        </div>
      }
    </aside>
  `,
  styles: [`
    :host { display: block; }

    /* ── Queue container ─────────────────────────────── */
    .dos-action-queue {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-03, 0.5rem);
      padding: var(--cds-spacing-03, 0.5rem) 0;
    }

    /* ── Header ──────────────────────────────────────── */
    .dos-action-queue__hdr {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03, 0.5rem);
      padding-inline: var(--cds-spacing-05, 1rem);
    }

    .dos-action-queue__title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--cds-text-primary, #161616);
    }

    .dos-action-queue__count,
    .dos-action-queue__overdue {
      animation: kpi-count-enter 0.2s ease-out both;
    }

    /* ── List ─────────────────────────────────────────── */
    .dos-action-queue__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* ── Tile ─────────────────────────────────────────── */
    .dos-action-queue__tile {
      width: 100%;
      display: block;
    }

    :host ::ng-deep .dos-action-queue__tile .cds--tile {
      padding: var(--cds-spacing-03, 0.5rem) var(--cds-spacing-05, 1rem);
      border-block-end: 1px solid var(--cds-border-subtle-00, #e0e0e0);
    }

    :host ::ng-deep .dos-action-queue__tile .cds--tile:hover {
      background: var(--cds-layer-hover, #e8e8e8);
    }

    /* Overdue tile: data-flash + error border */
    .dos-action-queue__item--overdue :host ::ng-deep .cds--tile {
      border-inline-start: 3px solid var(--cds-support-error, #da1e28);
      animation: premium-data-flash 1.5s ease-out 1;
    }

    /* ── Tile inner ─────────────────────────────────── */
    .dos-aq-tile-inner {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-02, 0.25rem);
    }

    .dos-aq-tile-header {
      display: flex;
      align-items: flex-start;
      gap: var(--cds-spacing-03, 0.5rem);
    }

    .dos-aq-severity-bar {
      flex: 0 0 3px;
      align-self: stretch;
      border-radius: 2px;
      background: var(--cds-border-subtle, #e0e0e0);
    }
    .dos-aq-severity-bar[data-severity='critical'] { background: var(--cds-support-error, #da1e28); }
    .dos-aq-severity-bar[data-severity='high']     { background: var(--cds-support-warning, #f1c21b); }
    .dos-aq-severity-bar[data-severity='med']      { background: var(--cds-support-info, #0f62fe); }

    .dos-aq-title {
      font-size: 0.875rem;
      font-weight: 400;
      color: var(--cds-text-primary, #161616);
      flex: 1;
      min-width: 0;
    }

    .dos-aq-tile-meta {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03, 0.5rem);
      flex-wrap: wrap;
    }

    .dos-aq-origin {
      font-size: 0.75rem;
      color: var(--cds-text-secondary, #6f6f6f);
    }

    .dos-aq-due {
      font-size: 0.75rem;
      color: var(--cds-text-secondary, #6f6f6f);
      margin-inline-start: auto;
    }

    .dos-aq-due--overdue { color: var(--cds-support-error, #da1e28); font-weight: 600; }

    /* ── Empty state ─────────────────────────────────── */
    .dos-action-queue__empty {
      padding: var(--cds-spacing-05, 1rem);
      color: var(--cds-text-secondary, #6f6f6f);
      font-size: 0.875rem;
    }

    /* ── Keyframes ─────────────────────────────────────── */
    @keyframes premium-data-flash {
      0%   { background-color: rgba(218,30,40,0.06); }
      50%  { background-color: rgba(218,30,40,0.12); }
      100% { background-color: transparent; }
    }
    @keyframes kpi-count-enter {
      0%   { opacity: 0; transform: translateY(8px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class DosActionQueueComponent {
  @Input() items: ActionQueueItem[] = [];
  @Input() mobileMode = false;
  @Input() ariaLabel = '';
  @Input() title = 'Action Queue';
  @Input() emptyText = '';
  @Output() open = new EventEmitter<ActionQueueItem>();

  get overdueCount(): number {
    return this.items.filter(i => this.isOverdue(i)).length;
  }

  isOverdue(item: ActionQueueItem): boolean {
    if (!item.dueAt) return false;
    return new Date(item.dueAt) < new Date();
  }

  daysLabel(dueAt: string): string {
    const diff = Math.round((new Date(dueAt).getTime() - Date.now()) / 86_400_000);
    if (diff === 0) return 'due today';
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    return `due in ${diff}d`;
  }

  severityTag(severity: ItemSeverity): DosCarbonTagType {
    return SEVERITY_TAG[severity] ?? 'gray';
  }
}
