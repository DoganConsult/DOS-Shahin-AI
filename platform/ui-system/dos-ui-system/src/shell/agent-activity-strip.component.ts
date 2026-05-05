/**
 * Phase WS-2 + Carbon-Wiring — workspace.agent-strip wrapper.
 * Selector: dos-agent-activity-strip
 * Carbon primitive: tiles (TilesModule → cds-clickable-tile) + tag (TagModule)
 * DB: dos.dynamic_ui_component_registry component_key=workspace.agent-strip carbon_key=tiles
 *
 * Token stack:
 *   --cds-tile-*          (Carbon tile tokens)
 *   breathing-glow        (running agent tile — design-tokens.css)
 *   premium-pulse-ring    (awaiting-approval tag — design-tokens.css)
 *   premium-fade-up       (strip mount entry — design-tokens.css)
 *
 * Visual differentiator: running agent tiles have a continuous breathing-glow
 * border — the "agentic GRC OS" UI signature vs all GRC competitors.
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TilesModule } from 'carbon-components-angular';
import { DosCarbonTagComponent, type DosCarbonTagType } from '../carbon/dos-carbon-tag.component';
import { DosIconComponent } from '../components/icon.component';
import type { AgentActivity } from './workspace-shell.contracts';

type AgentState = AgentActivity['state'];

const STATE_TAG: Record<AgentState, DosCarbonTagType> = {
  running:           'blue',
  'awaiting-approval': 'magenta',
  done:              'green',
  error:             'red',
  idle:              'gray',
};

const STATE_LABEL: Record<AgentState, string> = {
  running:           'Running',
  'awaiting-approval': 'Approval needed',
  done:              'Done',
  error:             'Error',
  idle:              'Idle',
};

@Component({
  selector: 'dos-agent-activity-strip',
  standalone: true,
  imports: [CommonModule, TilesModule, DosCarbonTagComponent, DosIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="dos-agent-strip"
         [class.dos-agent-strip--mobile]="mobileMode"
         [attr.aria-label]="ariaLabel || null"
         data-testid="dos-agent-activity-strip">

      @if (agents.length) {
        <ul class="dos-agent-strip__list" role="list">
          @for (a of agents; track a.agentId; let i = $index) {
            <li class="dos-agent-strip__item"
                [class.dos-agent-strip__item--running]="a.state === 'running'"
                [class.dos-agent-strip__item--awaiting]="a.state === 'awaiting-approval'"
                [class.dos-agent-strip__item--error]="a.state === 'error'"
                role="listitem"
                [style.animation-delay]="(i * 60) + 'ms'">
              <!-- cds-clickable-tile (carbon_key=tiles) -->
              <cds-clickable-tile
                class="dos-agent-strip__tile"
                [attr.data-agent-id]="a.agentId"
                [attr.data-state]="a.state"
                (click)="select.emit(a)">

                <!-- Agent avatar / icon -->
                <div class="dos-agent-tile__avatar"
                     [class.dos-agent-tile__avatar--running]="a.state === 'running'">
                  @if (a.avatarUri) {
                    <img [src]="a.avatarUri"
                         [alt]="a.agentName?.fallback ?? a.agentName?.i18nKey ?? ''"
                         width="32" height="32"
                         class="dos-agent-tile__img" />
                  } @else {
                    <dos-icon name="bot" [size]="20" class="dos-agent-tile__icon"></dos-icon>
                  }
                  <!-- Live pulse ring on running agents -->
                  @if (a.state === 'running') {
                    <span class="dos-agent-tile__pulse" aria-hidden="true"></span>
                  }
                </div>

                <!-- Agent name + step -->
                <div class="dos-agent-tile__body">
                  <span class="dos-agent-tile__name">
                    {{ a.agentName?.fallback ?? a.agentName?.i18nKey ?? '' }}
                  </span>
                  @if (a.step) {
                    <span class="dos-agent-tile__step">
                      {{ a.step?.fallback ?? a.step?.i18nKey ?? '' }}
                    </span>
                  }
                </div>

                <!-- State tag -->
                <dos-carbon-tag
                  [type]="stateTag(a.state)"
                  size="sm"
                  class="dos-agent-tile__state"
                  [class.dos-agent-tile__state--awaiting]="a.state === 'awaiting-approval'">
                  {{ STATE_LABEL[a.state] }}
                </dos-carbon-tag>
              </cds-clickable-tile>
            </li>
          }
        </ul>
      } @else if (!loading) {
        <div class="dos-agent-strip__empty">
          <dos-icon name="bot" [size]="20" class="dos-agent-strip__empty-icon"></dos-icon>
          <span>{{ emptyText || 'No active agents.' }}</span>
        </div>
      }
    </nav>
  `,
  styles: [`
    :host { display: block; }

    /* ── Strip container ─────────────────────────────── */
    .dos-agent-strip {
      display: flex;
      flex-direction: column;
      gap: 0;
      animation: premium-fade-up 0.25s ease-out both;
    }

    .dos-agent-strip__list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    /* ── Per-item wrapper ────────────────────────────── */
    .dos-agent-strip__item {
      animation: premium-fade-up 0.22s ease-out both;
    }

    .dos-agent-strip__tile {
      width: 100%;
      display: block;
    }

    :host ::ng-deep .dos-agent-strip__tile .cds--tile {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-04);
      padding: var(--cds-spacing-04) var(--cds-spacing-05);
      border-block-end: 1px solid var(--cds-border-subtle-00);
      transition: background 0.12s;
    }

    :host ::ng-deep .dos-agent-strip__tile .cds--tile:hover {
      background: var(--cds-layer-hover);
    }

    /* ══ The signature differentiator: running agent breathing glow ══ */
    .dos-agent-strip__item--running :host ::ng-deep .cds--tile {
      border-inline-start: var(--dos-sidebar-active-border-width, 3px) solid var(--cds-support-info);
      animation: running-tile-glow 2.4s ease-in-out infinite;
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--cds-support-info) 4%, transparent) 0%,
        transparent 100%
      );
    }

    /* Awaiting approval: magenta accent */
    .dos-agent-strip__item--awaiting :host ::ng-deep .cds--tile {
      border-inline-start: var(--dos-sidebar-active-border-width, 3px) solid var(--cds-support-warning);
    }

    /* Error: red accent */
    .dos-agent-strip__item--error :host ::ng-deep .cds--tile {
      border-inline-start: var(--dos-sidebar-active-border-width, 3px) solid var(--cds-support-error);
    }

    /* ── Agent avatar ────────────────────────────────── */
    .dos-agent-tile__avatar {
      position: relative;
      flex: 0 0 auto;
      width: var(--cds-spacing-07);
      height: var(--cds-spacing-07);
      border-radius: 50%;
      background: var(--cds-layer-02);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dos-agent-tile__avatar--running {
      background: color-mix(in srgb, var(--cds-support-info) 10%, transparent);
      border: 1.5px solid color-mix(in srgb, var(--cds-support-info) 30%, transparent);
    }

    .dos-agent-tile__img {
      border-radius: 50%;
      object-fit: cover;
      width: var(--cds-spacing-07);
      height: var(--cds-spacing-07);
    }

    .dos-agent-tile__icon {
      color: var(--cds-icon-secondary);
    }

    /* Pulse ring for running state */
    .dos-agent-tile__pulse {
      position: absolute;
      inset: calc(-1 * var(--cds-spacing-01));
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--cds-support-info) 50%, transparent);
      animation: premium-pulse-ring 1.8s ease-out infinite;
    }

    /* ── Tile body ───────────────────────────────────── */
    .dos-agent-tile__body {
      display: flex;
      flex-direction: column;
      gap: 0;
      flex: 1;
      min-width: 0;
    }

    .dos-agent-tile__name {
      font-size: var(--cds-body-short-01-font-size);
      font-weight: 600;
      color: var(--cds-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dos-agent-tile__step {
      font-size: var(--cds-caption-01-font-size);
      color: var(--cds-text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* State tag — awaiting-approval gets pulse animation */
    .dos-agent-tile__state { flex: 0 0 auto; }
    .dos-agent-tile__state--awaiting { animation: subtle-pulse 2s ease-in-out infinite; }

    /* ── Mobile: horizontal scroll-snap ─────────────── */
    .dos-agent-strip--mobile .dos-agent-strip__list {
      display: flex;
      flex-direction: row;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
      gap: var(--cds-spacing-02, 0.25rem);
      padding-inline: var(--cds-spacing-03, 0.5rem);
    }

    .dos-agent-strip--mobile .dos-agent-strip__item {
      flex: 0 0 auto;
      scroll-snap-align: start;
      min-inline-size: 12rem;
    }

    /* ── Empty state ──────────────────────────────────── */
    .dos-agent-strip__empty {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03, 0.5rem);
      padding: var(--cds-spacing-05, 1rem);
      color: var(--cds-text-secondary);
      font-size: var(--cds-body-short-01-font-size);
    }

    .dos-agent-strip__empty-icon {
      flex: 0 0 auto;
      color: var(--cds-icon-secondary);
    }

    /* ── Keyframes ─────────────────────────────────────── */
    @keyframes running-tile-glow {
      0%, 100% { box-shadow: inset var(--dos-sidebar-active-border-width, 3px) 0 12px color-mix(in srgb, var(--cds-support-info) 8%, transparent); }
      50%      { box-shadow: inset var(--dos-sidebar-active-border-width, 3px) 0 20px color-mix(in srgb, var(--cds-support-info) 20%, transparent); }
    }
    @keyframes premium-fade-up {
      0%   { opacity: 0; transform: translateY(10px) scale(0.99); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes premium-pulse-ring {
      0%   { transform: scale(1); opacity: 0.7; }
      70%  { transform: scale(1.5); opacity: 0; }
      100% { transform: scale(1.5); opacity: 0; }
    }
    @keyframes subtle-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.7; }
    }
  `],
})
export class DosAgentActivityStripComponent {
  protected readonly STATE_LABEL = STATE_LABEL;

  @Input() agents: AgentActivity[] = [];
  @Input() mobileMode = false;
  @Input() loading = false;
  @Input() ariaLabel: string | null = null;
  @Input() emptyText = '';
  @Output() select = new EventEmitter<AgentActivity>();

  stateTag(state: AgentState): DosCarbonTagType {
    return STATE_TAG[state] ?? 'gray';
  }
}
