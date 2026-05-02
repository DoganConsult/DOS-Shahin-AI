import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ActionContract } from '@dos/ui-contracts';

@Component({
  selector: 'dos-adaptive-command-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-command-bar" role="toolbar">
      @for (a of primaryActions(); track a.id) {
        <button
          type="button"
          class="dos-command-bar__btn"
          [class.dos-command-bar__btn--primary]="a.priority === 'primary'"
          (click)="invoke.emit(a)"
        >
          {{ a.labelKey }}
        </button>
      }
      @if (overflowActions().length > 0) {
        <button type="button" class="dos-command-bar__btn" (click)="toggleOverflow()">⋯</button>
      }
    </div>
    @if (overflowOpen() && overflowActions().length > 0) {
      <div class="dos-account-menu" role="menu">
        @for (a of overflowActions(); track a.id) {
          <button type="button" role="menuitem" class="dos-bottom-nav__item" (click)="invoke.emit(a)">
            {{ a.labelKey }}
          </button>
        }
      </div>
    }
  `,
})
export class DosAdaptiveCommandBarComponent {
  private _actions = signal<ActionContract[]>([]);
  private _mobile = signal(false);
  overflowOpen = signal(false);

  @Input() set actions(v: ActionContract[] | null | undefined) {
    this._actions.set(Array.isArray(v) ? v : []);
  }
  @Input() set mobile(v: boolean | null | undefined) {
    this._mobile.set(!!v);
  }
  @Output() invoke = new EventEmitter<ActionContract>();

  primaryActions(): ActionContract[] {
    const all = this._actions();
    if (!this._mobile()) return all.filter(a => a.mobile !== 'hidden');
    // Mobile: keep up to 3 visible, rest go to overflow.
    const visible = all.filter(a => a.mobile === 'visible' || a.priority === 'primary');
    return visible.slice(0, 3);
  }

  overflowActions(): ActionContract[] {
    const all = this._actions();
    if (!this._mobile()) {
      return all.filter(a => a.priority === 'overflow' || a.mobile === 'overflow');
    }
    const primary = new Set(this.primaryActions().map(a => a.id));
    return all.filter(a => !primary.has(a.id) && a.mobile !== 'hidden');
  }

  toggleOverflow(): void {
    this.overflowOpen.set(!this.overflowOpen());
  }
}
