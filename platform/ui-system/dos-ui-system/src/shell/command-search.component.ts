/**
 * Phase WS-2 + Carbon-Wiring — workspace.command-search wrapper.
 * Selector: dos-command-search
 * Carbon primitive: search (SearchModule → cds-search)
 * DB: dos.dynamic_ui_component_registry component_key='workspace.command-search' carbon_key='search'
 *
 * Token stack:
 *   --cds-field-*     (Carbon field tokens for search input)
 *   --shell-z-modal   (z-index for mobile overlay)
 *   slide-in-left/right (result list animation — design-tokens.css)
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchModule } from 'carbon-components-angular';
import { DosCarbonTagComponent, type DosCarbonTagType } from '../carbon/dos-carbon-tag.component';
import { DosIconComponent } from '../components/icon.component';
import type { CommandSearchResult } from './workspace-shell.contracts';

type ResultCategory = CommandSearchResult['category'];

const CATEGORY_TAG_TYPE: Record<ResultCategory, DosCarbonTagType> = {
  route:  'blue',
  record: 'teal',
  action: 'cyan',
  agent:  'purple',
  help:   'cool-gray',
};

@Component({
  selector: 'dos-command-search',
  standalone: true,
  imports: [CommonModule, SearchModule, DosCarbonTagComponent, DosIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-command-search"
         [class.dos-command-search--mobile]="mobileMode"
         [class.dos-command-search--open]="open()"
         data-testid="dos-command-search">

      <!-- Real cds-search (carbon_key=search, SearchModule) -->
      <cds-search
        [size]="size"
        [theme]="theme"
        [placeholder]="placeholder"
        [label]="ariaLabel || placeholder"
        [expandable]="expandable"
        [value]="query"
        [autocomplete]="'off'"
        (valueChange)="onQueryChange($event)"
        (clear)="onClear()"
      ></cds-search>

      <!-- Results dropdown -->
      @if (open() && results.length) {
        <ul class="dos-command-search__results"
            role="listbox"
            [class.dos-command-search__results--rtl]="dir === 'rtl'">
          @for (r of results; track r.id) {
            <li class="dos-command-search__result cds--tile"
                role="option"
                [attr.data-result-id]="r.id"
                [attr.data-category]="r.category"
                (click)="onSelect(r)"
                (keydown.enter)="onSelect(r)"
                tabindex="0">
              <dos-carbon-tag
                [type]="categoryTagType(r.category)"
                size="sm"
                class="dos-command-search__cat">
                {{ r.category }}
              </dos-carbon-tag>
              @if (r.icon) {
                <dos-icon [name]="r.icon" [size]="16" class="dos-command-search__icon"></dos-icon>
              }
              <span class="dos-command-search__label">{{ r.label.fallback ?? r.label.i18nKey }}</span>
              @if (r.route) {
                <span class="dos-command-search__route" aria-hidden="true">{{ r.route }}</span>
              }
            </li>
          }
        </ul>
      }

      <!-- No results state -->
      @if (open() && query.length > 0 && results.length === 0) {
        <div class="dos-command-search__empty">
          <dos-icon name="search" [size]="20" class="dos-command-search__empty-icon"></dos-icon>
          <span>No results for "<strong>{{ query }}</strong>"</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }

    /* ── Search wrapper ──────────────────────────────── */
    .dos-command-search {
      position: relative;
    }

    /* Carbon cds-search inner overrides for inverse header context */
    :host ::ng-deep .cds--search-input {
      background: var(--cds-field-02, rgba(255,255,255,0.08));
      color: var(--cds-text-on-color, #fff);
      border-block-end-color: transparent;
    }

    :host ::ng-deep .cds--search-input::placeholder {
      color: var(--cds-text-on-color-disabled, rgba(255,255,255,0.55));
    }

    :host ::ng-deep .cds--search-magnifier-icon,
    :host ::ng-deep .cds--search-close {
      fill: var(--cds-icon-on-color, #fff);
    }

    /* ── Results dropdown ────────────────────────────── */
    .dos-command-search__results {
      position: absolute;
      inset-block-start: calc(100% + 2px);
      inset-inline-start: 0;
      inset-inline-end: 0;
      background: var(--cds-layer-01, #f4f4f4);
      border: 1px solid var(--cds-border-subtle-01, #e0e0e0);
      box-shadow: var(--shadow-premium-md, 0 6px 16px rgba(0,0,0,0.16));
      list-style: none;
      margin: 0;
      padding: var(--cds-spacing-02, 0.25rem);
      max-block-size: 60vh;
      overflow-y: auto;
      z-index: var(--shell-z-dropdown, 9100);
      animation: slide-in-left 0.15s ease-out both;
    }

    .dos-command-search__results--rtl {
      animation-name: slide-in-right;
    }

    /* Each result uses .cds--tile for Carbon-correct tile styling */
    .dos-command-search__result {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03, 0.5rem);
      padding: var(--cds-spacing-03, 0.5rem);
      cursor: pointer;
      border-radius: 0;
      transition: background 0.1s;
    }

    .dos-command-search__result:hover,
    .dos-command-search__result:focus {
      background: var(--cds-layer-hover, #e8e8e8);
      outline: none;
    }

    .dos-command-search__cat {
      flex: 0 0 auto;
    }

    .dos-command-search__icon {
      flex: 0 0 auto;
      color: var(--cds-icon-secondary, #525252);
    }

    .dos-command-search__label {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.875rem;
      color: var(--cds-text-primary, #161616);
    }

    .dos-command-search__route {
      font-size: 0.75rem;
      color: var(--cds-text-secondary, #525252);
      margin-inline-start: auto;
      font-family: var(--cds-code-01-font-family, monospace);
    }

    /* ── Empty state ──────────────────────────────────── */
    .dos-command-search__empty {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03, 0.5rem);
      padding: var(--cds-spacing-05, 1rem);
      font-size: 0.875rem;
      color: var(--cds-text-secondary, #525252);
      background: var(--cds-layer-01, #f4f4f4);
      border: 1px solid var(--cds-border-subtle-01, #e0e0e0);
      position: absolute;
      inset-block-start: calc(100% + 2px);
      inset-inline: 0;
      z-index: var(--shell-z-dropdown, 9100);
    }

    .dos-command-search__empty-icon {
      flex: 0 0 auto;
      color: var(--cds-icon-secondary, #525252);
    }

    /* ── Mobile full-screen overlay ────────────────────── */
    .dos-command-search--mobile.dos-command-search--open {
      position: fixed;
      inset: 0;
      background: var(--cds-background, var(--cds-white, #ffffff));
      z-index: var(--shell-z-modal, 9000);
      display: flex;
      flex-direction: column;
      padding: var(--cds-spacing-05, 1rem);
      gap: var(--cds-spacing-04, 0.75rem);
      animation: premium-fade-up 0.2s ease-out both;
    }

    .dos-command-search--mobile .dos-command-search__results {
      position: static;
      box-shadow: none;
      border: 0;
      border-block-start: 1px solid var(--cds-border-subtle-01, #e0e0e0);
      flex: 1;
      max-block-size: none;
    }

    /* ── Keyframes ─────────────────────────────────────── */
    @keyframes slide-in-left {
      0%   { opacity: 0; transform: translateX(-8px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes slide-in-right {
      0%   { opacity: 0; transform: translateX(8px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes premium-fade-up {
      0%   { opacity: 0; transform: translateY(16px) scale(0.98); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
  `],
})
export class DosCommandSearchComponent {
  @Input() results: CommandSearchResult[] = [];
  @Input() placeholder = 'Search…';
  @Input() ariaLabel: string | null = null;
  @Input() mobileMode = false;
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'light' | 'dark' = 'dark';
  @Input() expandable = false;

  query = '';
  open = signal(false);

  @Output() queryChange = new EventEmitter<string>();
  @Output() select      = new EventEmitter<CommandSearchResult>();

  categoryTagType(cat: ResultCategory): DosCarbonTagType {
    return CATEGORY_TAG_TYPE[cat] ?? 'gray';
  }

  onQueryChange(value: string): void {
    this.query = value;
    this.open.set(value.length > 0);
    this.queryChange.emit(value);
  }

  onClear(): void {
    this.query = '';
    this.open.set(false);
    this.queryChange.emit('');
  }

  onSelect(r: CommandSearchResult): void {
    this.select.emit(r);
    this.open.set(false);
    this.query = '';
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    const host = ev.target as HTMLElement;
    if (!host.closest('dos-command-search')) this.open.set(false);
  }
}
