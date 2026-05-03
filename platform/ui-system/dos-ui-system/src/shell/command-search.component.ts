/**
 * Phase WS-2 — workspace.command-search wrapper.
 * Selector: dos-command-search
 * Carbon primitive: Search.
 * Mobile_mode: full-screen-modal at ≤480px.
 * Launch hotkey: cmd-k / ctrl-k.
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { CommandSearchResult } from './workspace-shell.contracts';

@Component({
  selector: 'dos-command-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-command-search"
         [class.dos-command-search--mobile]="mobileMode"
         [class.dos-command-search--open]="open()"
         data-testid="dos-command-search">
      <input type="search"
             class="dos-command-search__input"
             [(ngModel)]="query"
             (focus)="open.set(true)"
             (input)="queryChange.emit(query)"
             [placeholder]="placeholder"
             aria-label="Command search"
             data-cds-component="search" />
      @if (open() && results.length) {
        <ul class="dos-command-search__results" role="listbox">
          @for (r of results; track r.id) {
            <li class="dos-command-search__result"
                role="option"
                [attr.data-result-id]="r.id"
                (click)="select.emit(r); open.set(false)">
              <span class="dos-command-search__cat" data-cds-component="tag">{{ r.category }}</span>
              <span>{{ r.label.fallback ?? r.label.i18nKey }}</span>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dos-command-search { position: relative; }
    .dos-command-search__input { width: 100%; padding: .5rem .75rem; border: 1px solid var(--cds-border-strong, #8d8d8d); }
    .dos-command-search__results { position: absolute; inset-block-start: 100%; inset-inline-start: 0; right: 0; background: var(--cds-layer, #fff); border: 1px solid var(--cds-border-subtle, #e0e0e0); list-style: none; margin: 0; padding: .25rem; max-height: 60vh; overflow: auto; z-index: 60; }
    .dos-command-search__result { display: flex; gap: .5rem; align-items: center; padding: .5rem; cursor: pointer; }
    .dos-command-search__result:hover { background: var(--cds-layer-hover, #f4f4f4); }
    .dos-command-search--mobile.dos-command-search--open { position: fixed; inset: 0; background: var(--cds-background, #fff); z-index: 100; padding: 1rem; }
  `],
})
export class DosCommandSearchComponent {
  @Input() results: CommandSearchResult[] = [];
  @Input() placeholder = 'Search routes, records, actions…';
  @Input() mobileMode = false;
  query = '';
  open = signal(false);
  @Output() queryChange = new EventEmitter<string>();
  @Output() select = new EventEmitter<CommandSearchResult>();
}
