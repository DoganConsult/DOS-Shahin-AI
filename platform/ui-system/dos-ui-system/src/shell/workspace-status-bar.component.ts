/**
 * Phase WS-2 + Carbon-Wiring — workspace.status-bar wrapper.
 * Selector: dos-workspace-status-bar
 * Carbon primitive: tag (TagModule → cds-tag)
 * Runtime: componentKey=workspace.status-bar (carbon=tag) — DB schema reference removed (resolved by UI-OS service).
 *
 * Token stack:
 *   --cds-tag-*           (Carbon tag tokens per level)
 *   --shell-status-*-bg   (structural alias — carbon-shell-tokens.scss)
 *   --shell-z-sticky      (z-index)
 *   breathing-glow        (critical signal — design-tokens.css)
 *   premium-pulse-ring    (live dot — design-tokens.css)
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'carbon-components-angular';
import type { DosCarbonTagType } from '../carbon/dos-carbon-tag.component';
import type { StatusBarSignal } from './workspace-shell.contracts';

type SignalLevel = StatusBarSignal['level'];

const LEVEL_TAG_TYPE: Record<SignalLevel, DosCarbonTagType> = {
  ok:       'green',
  info:     'blue',
  warn:     'magenta',
  error:    'red',
  critical: 'red',
};

@Component({
  selector: 'dos-workspace-status-bar',
  standalone: true,
  imports: [CommonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-status-bar"
         [class.dos-status-bar--mobile]="mobileMode"
         role="status"
         aria-live="polite"
         data-testid="dos-workspace-status-bar">
      @for (s of signals; track s.id) {
        <button type="button"
                class="dos-status-bar__chip"
                [class.dos-status-bar__chip--critical]="s.level === 'critical'"
                [class.dos-status-bar__chip--error]="s.level === 'error'"
                [class.dos-status-bar__chip--warn]="s.level === 'warn'"
                [class.dos-status-bar__chip--ok]="s.level === 'ok'"
                [attr.data-level]="s.level"
                [attr.data-signal-id]="s.id"
                (click)="signalClick.emit(s)">

          <!-- Live dot indicator -->
          <span class="dos-status-bar__dot"
                [class.dos-status-bar__dot--critical]="s.level === 'critical'"
                [class.dos-status-bar__dot--error]="s.level === 'error' || s.level === 'critical'"
                [class.dos-status-bar__dot--warn]="s.level === 'warn'"
                [class.dos-status-bar__dot--ok]="s.level === 'ok'"
                aria-hidden="true">
          </span>

          <!-- cds-tag for the label (carbon_key=tag) -->
          <cds-tag
            [type]="levelTagType(s.level)"
            size="sm"
            class="dos-status-bar__tag">
            {{ s.label?.fallback ?? s.label?.i18nKey ?? '' }}
            @if (s.value) { <span class="dos-status-bar__value">{{ s.value }}</span> }
          </cds-tag>
        </button>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Bar container ───────────────────────────────── */
    .dos-status-bar {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-02);
      padding: var(--cds-spacing-02) var(--cds-spacing-05);
      min-block-size: 2rem;
      background: var(--cds-layer-01);
      border-block-start: 1px solid var(--cds-border-subtle-01);
      overflow-x: auto;
      scrollbar-width: none;
    }

    .dos-status-bar::-webkit-scrollbar { display: none; }

    /* ── Chip (button wrapper around cds-tag) ────────── */
    .dos-status-bar__chip {
      display: inline-flex;
      align-items: center;
      gap: var(--cds-spacing-02);
      background: none;
      border: none;
      cursor: pointer;
      padding: var(--cds-spacing-01) var(--cds-spacing-02);
      border-radius: var(--cds-spacing-02);
      transition: background 0.12s;
      white-space: nowrap;
    }

    .dos-status-bar__chip:hover {
      background: var(--cds-layer-hover);
    }

    .dos-status-bar__chip:focus-visible {
      outline: 2px solid var(--cds-focus);
      outline-offset: 1px;
    }

    .dos-status-bar__chip--critical {
      animation: breathing-glow 2s ease-in-out infinite;
      border-radius: 2px;
    }

    /* ── Status dot ──────────────────────────────────── */
    .dos-status-bar__dot {
      display: inline-block;
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      flex: 0 0 auto;
      background: var(--cds-support-info);
      transition: background 0.2s;
    }

    .dos-status-bar__dot--ok     { background: var(--cds-support-success); }
    .dos-status-bar__dot--warn   { background: var(--cds-support-warning); }
    .dos-status-bar__dot--error  { background: var(--cds-support-error); }
    .dos-status-bar__dot--critical {
      background: var(--cds-support-error);
      animation: premium-pulse-ring 1.4s ease-out infinite;
    }

    /* ── Tag (value) ─────────────────────────────────── */
    .dos-status-bar__tag {
      pointer-events: none; /* chip button handles the click */
    }

    .dos-status-bar__value {
      font-weight: 700;
      margin-inline-start: var(--cds-spacing-02);
    }

    /* ── Mobile: hide labels, show dots only ─────────── */
    .dos-status-bar--mobile .dos-status-bar__tag {
      display: none;
    }

    /* ── Keyframes ─────────────────────────────────────── */
    @keyframes breathing-glow {
      0%, 100% { box-shadow: 0 0 8px rgba(218,30,40,0.10); }
      50%      { box-shadow: 0 0 18px rgba(218,30,40,0.24); }
    }

    @keyframes premium-pulse-ring {
      0%   { transform: scale(1); opacity: 0.8; }
      70%  { transform: scale(1.6); opacity: 0; }
      100% { transform: scale(1.6); opacity: 0; }
    }
  `],
})
export class DosWorkspaceStatusBarComponent {
  @Input() signals: StatusBarSignal[] = [];
  @Input() mobileMode = false;
  @Output() signalClick = new EventEmitter<StatusBarSignal>();

  levelTagType(level: SignalLevel): DosCarbonTagType {
    return LEVEL_TAG_TYPE[level] ?? 'blue';
  }
}
