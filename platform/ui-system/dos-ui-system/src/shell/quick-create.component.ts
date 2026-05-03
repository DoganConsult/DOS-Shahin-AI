/**
 * Phase WS-2 — workspace.quick-create wrapper.
 * Selector: dos-quick-create
 * Carbon primitive: button (FAB variant).
 * Mobile_mode: sticky-bottom (full-width bar at ≤480px).
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { QuickCreateAction } from './workspace-shell.contracts';

@Component({
  selector: 'dos-quick-create',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-quick-create"
         [class.dos-quick-create--mobile]="mobileMode"
         data-testid="dos-quick-create">
      <button type="button"
              class="dos-quick-create__fab"
              data-cds-component="button"
              [attr.aria-expanded]="open()"
              [attr.aria-label]="ariaLabel || null"
              (click)="toggle()">
        {{ fabGlyph }}
      </button>
      @if (open()) {
        <ul class="dos-quick-create__menu" role="menu">
          @for (a of actions; track a.id) {
            <li role="none">
              <button type="button"
                      role="menuitem"
                      class="dos-quick-create__action"
                      [attr.data-action-id]="a.id"
                      (click)="invoke.emit(a); open.set(false)">
                @if (a.icon) { <span aria-hidden="true">{{ a.icon }}</span> }
                <span>{{ a.label.fallback ?? a.label.i18nKey }}</span>
                @if (a.hotkey) { <kbd>{{ a.hotkey }}</kbd> }
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dos-quick-create { position: fixed; inset-block-end: 1rem; inset-inline-end: 1rem; z-index: 90; }
    .dos-quick-create--mobile { inset-inline: 0; inset-block-end: 0; padding: .5rem; background: var(--cds-layer, #fff); border-block-start: 1px solid var(--cds-border-subtle, #e0e0e0); }
    .dos-quick-create__fab { width: 3rem; height: 3rem; border-radius: 50%; border: 0; background: var(--cds-button-primary, #0f62fe); color: var(--cds-text-on-color, #fff); font-size: 1.5rem; cursor: pointer; }
    .dos-quick-create--mobile .dos-quick-create__fab { width: 100%; height: 2.5rem; border-radius: 0; }
    .dos-quick-create__menu { position: absolute; inset-block-end: 100%; inset-inline-end: 0; background: var(--cds-layer, #fff); border: 1px solid var(--cds-border-subtle, #e0e0e0); margin: 0 0 .5rem 0; padding: .25rem; min-width: 12rem; list-style: none; }
    .dos-quick-create__action { display: flex; gap: .5rem; align-items: center; width: 100%; padding: .5rem; background: transparent; border: 0; cursor: pointer; text-align: start; }
    .dos-quick-create__action:hover { background: var(--cds-layer-hover, #f4f4f4); }
    .dos-quick-create__action kbd { margin-inline-start: auto; font-size: .75rem; color: var(--cds-text-secondary, #6f6f6f); }
  `],
})
export class DosQuickCreateComponent {
  @Input() actions: QuickCreateAction[] = [];
  @Input() mobileMode = false;
  @Input() ariaLabel: string | null = null;
  @Input() fabGlyph = '+';
  open = signal(false);
  @Output() invoke = new EventEmitter<QuickCreateAction>();

  toggle() { this.open.update(v => !v); }
}
