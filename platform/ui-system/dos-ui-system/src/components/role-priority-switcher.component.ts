import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosRolePriorityOption {
  role: string;
  label: string;
  defaultLanding?: string;
}

@Component({
  selector: 'dos-role-priority-switcher',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (options?.length) {
      <div class="dos-rps" role="group" aria-label="Switch role priority view">
        <span class="dos-rps__label">View as</span>
        <div class="dos-rps__group">
          @for (o of options; track o.role) {
            <button type="button" class="dos-rps__btn"
                    [class.dos-rps__btn--active]="o.role === activeRole"
                    (click)="select.emit(o.role)">
              {{ o.label }}
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .dos-rps { display: inline-flex; align-items: center; gap: 0.5rem; }
    .dos-rps__label { font-size: 0.75rem; color: var(--dos-color-text-subtle, #525252); text-transform: uppercase; letter-spacing: 0.04em; }
    .dos-rps__group { display: inline-flex; border: 1px solid var(--dos-color-border, #e0e0e0); border-radius: 4px; overflow: hidden; }
    .dos-rps__btn { padding: 0.375rem 0.75rem; background: var(--dos-color-surface, #fff); border: none; cursor: pointer; font-size: 0.8125rem; }
    .dos-rps__btn + .dos-rps__btn { border-left: 1px solid var(--dos-color-border, #e0e0e0); }
    .dos-rps__btn--active { background: var(--dos-color-accent, #0f62fe); color: #fff; }
  `],
})
export class DosRolePrioritySwitcherComponent {
  @Input() options: DosRolePriorityOption[] = [];
  @Input() activeRole: string | null = null;
  @Output() select = new EventEmitter<string>();
}
