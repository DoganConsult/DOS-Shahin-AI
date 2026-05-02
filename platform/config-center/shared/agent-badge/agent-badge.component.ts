import { Component, Input, computed, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { getAgent } from '../agrc-os-agent-registry';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-agent-badge',
    imports: [CommonModule, RouterModule],
    template: `
    @if (meta(); as m) {
      <div class="ab-wrap">
        <button class="ab-chip" (click)="expanded.set(!expanded())"
          [title]="m.name + ' — ' + m.domain"
          [attr.aria-expanded]="expanded()">
          <span class="ab-dot" [style.background]="m.color"></span>
          <span class="ab-id" [style.background]="m.color + '18'" [style.color]="m.color">{{ m.id }}</span>
          <span class="ab-name">{{ m.name }}</span>
          <i class="pi pi-chevron-down ab-chevron" [class.ab-chevron-open]="expanded()"></i>
        </button>

        @if (expanded()) {
          <div tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="ab-popover" (click)="$event.stopPropagation()">
            <div class="ab-pop-header">
              <i class="pi ab-pop-icon" [ngClass]="m.icon" [style.color]="m.color"></i>
              <div class="ab-pop-title">
                <span class="ab-pop-name">{{ m.name }}</span>
                <span class="ab-pop-domain">{{ m.domain }}</span>
              </div>
              <button class="ab-pop-close" (click)="expanded.set(false)" aria-label="Close">
                <i class="pi pi-times"></i>
              </button>
            </div>
            <div class="ab-pop-status">
              <span class="ab-status-dot" [style.background]="'#22c55e'"></span>
              <span class="ab-status-text">Idle</span>
            </div>
            <a [routerLink]="['/agrc-os']" [queryParams]="{ agent: m.id }" class="ab-pop-link" (click)="expanded.set(false)">
              <i class="pi pi-external-link"></i>
              Open in AGRC-OS
            </a>
          </div>
        }
      </div>
    }
  `,
    styles: [`
    .ab-wrap { position: relative; display: inline-flex; }

    .ab-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: var(--radius-xl); height: 28px;
      background: var(--surface-card, #fff);
      border: 1px solid var(--surface-200, var(--border-subtle));
      cursor: pointer; font-size: var(--font-size-xs); font-weight: 500;
      color: var(--text-color-secondary, var(--text-muted));
      transition: background .15s, border-color .15s, box-shadow .15s;
      white-space: nowrap;
    }
    .ab-chip:hover { background: var(--surface-50, var(--surface-ice)); border-color: var(--surface-300, var(--border-subtle)); }
    .ab-chip:focus-visible { box-shadow: 0 0 0 2px var(--primary-200, #bfdbfe); outline: none; }

    .ab-dot { width: 7px; height: 7px; border-radius: var(--radius-pill); flex-shrink: 0; }
    .ab-id { font-size: var(--font-size-xs); font-weight: 700; font-family: monospace; padding: 1px 4px; border-radius: var(--radius-xs); letter-spacing: .5px; }
    .ab-name { font-size: var(--font-size-xs); }
    .ab-chevron { font-size: var(--font-size-xs); color: var(--text-color-secondary, #9ca3af); transition: transform .2s; }
    .ab-chevron-open { transform: rotate(180deg); }

    .ab-popover {
      position: absolute; top: calc(100% + 6px); inset-inline-end: 0;
      width: 260px; background: var(--surface-card, #fff);
      border: 1px solid var(--surface-200, var(--border-subtle));
      border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
      padding: 12px; z-index: var(--z-dropdown);
      animation: abSlide .15s ease-out;
    }
    @keyframes abSlide { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

    .ab-pop-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .ab-pop-icon { font-size: var(--font-size-lg); flex-shrink: 0; }
    .ab-pop-title { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .ab-pop-name { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading, var(--text-heading)); }
    .ab-pop-domain { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }
    .ab-pop-close { background: none; border: none; cursor: pointer; color: var(--text-muted, var(--text-muted)); padding: 4px; border-radius: var(--radius-xs); }
    .ab-pop-close:hover { background: var(--surface-100, var(--surface-ice)); color: var(--text-heading, var(--text-heading)); }

    .ab-pop-status {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 8px; border-radius: var(--radius-sm); background: var(--surface-50, var(--surface-ice));
      margin-bottom: 8px;
    }
    .ab-status-dot { width: 6px; height: 6px; border-radius: var(--radius-pill); flex-shrink: 0; }
    .ab-status-text { font-size: var(--font-size-sm); font-weight: 500; color: var(--text-body, #475569); }

    .ab-pop-link {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 10px; border-radius: var(--radius-sm);
      font-size: var(--font-size-sm); font-weight: 600; text-decoration: none;
      color: var(--primary-700, #1d4ed8); background: var(--primary-50, #eff6ff);
      border: 1px solid var(--primary-100, #dbeafe); transition: background .15s;
    }
    .ab-pop-link:hover { background: var(--primary-100, #dbeafe); }
    .ab-pop-link .pi { font-size: var(--font-size-xs); }

    @media (max-width: 600px) {
      .ab-name { display: none; }
      .ab-popover { width: 220px; }
    }
  `]
})
export class AgentBadgeComponent {
  @Input() agentId = '';

  expanded = signal(false);
  meta = computed(() => getAgent(this.agentId));
}
