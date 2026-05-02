import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IconModule,
  SearchModule,
  TabsModule,
  TilesModule,
} from 'carbon-components-angular';

import { CarbonIconAllowlistService } from './carbon-icon-allowlist.service';
import type { CarbonIconName } from '../allowlists/carbon-icons.allowlist';
import categoriesData from '../allowlists/carbon-icons.categories.json';

interface PickerSubcategory {
  name: string;
  count: number;
  members: readonly string[];
}
interface PickerCategory {
  name: string;
  count: number;
  subcategories: readonly PickerSubcategory[];
}
interface CategoriesFile {
  total: number;
  source: string;
  categories: readonly PickerCategory[];
}

const CATEGORIES = categoriesData as CategoriesFile;

/**
 * DosCarbonIconPickerComponent — workspace icon-picker built on raw IBM
 * Carbon primitives (cds-tabs, cds-search, cds-tile, ibmIcon directive).
 *
 * Behaviour:
 *   - Loads the canonical 7-category structure from
 *     carbon-icons.categories.json (fetched from upstream
 *     `categories.yml` at build/audit time).
 *   - Validates every member name through CarbonIconAllowlistService;
 *     disallowed names are filtered out (and counted in telemetry).
 *   - Search box filters across name + friendlyName + aliases.
 *   - Emits the chosen `CarbonIconName` on click.
 *
 * Use:
 *   <dos-carbon-icon-picker (iconSelected)="onPick($event)"></dos-carbon-icon-picker>
 */
@Component({
  selector: 'dos-carbon-icon-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IconModule, SearchModule, TabsModule, TilesModule],
  template: `
    <section class="cip" [attr.aria-label]="ariaLabel">
      <header class="cip__head">
        <cds-search
          [placeholder]="searchPlaceholder"
          [label]="searchPlaceholder"
          size="md"
          [(ngModel)]="searchModel"
          (valueChange)="onSearchChange($event)"
        ></cds-search>
        <p class="cip__stat">
          {{ visibleCount() }} / {{ totalCount }} icons
          @if (svc.disallowedAttempts() > 0) {
            · {{ svc.disallowedAttempts() }} blocked
          }
        </p>
      </header>

      @if (search()) {
        <!-- Search results: flat grid -->
        <div class="cip__grid" role="grid">
          @for (n of filteredIcons(); track n) {
            <button
              type="button"
              class="cip__cell"
              [class.cip__cell--selected]="selected() === n"
              [attr.aria-label]="n"
              (click)="select(n)"
            >
              <svg ibmIcon [icon]="n" size="24"></svg>
              <span class="cip__name">{{ n }}</span>
            </button>
          }
          @if (filteredIcons().length === 0) {
            <p class="cip__empty">No icons match “{{ search() }}”.</p>
          }
        </div>
      } @else {
        <!-- Category browser: cds-tabs by top-level category -->
        <cds-tabs>
          @for (cat of categories; track cat.name) {
            <cds-tab [heading]="cat.name + ' (' + cat.count + ')'">
              @for (sub of cat.subcategories; track sub.name) {
                <h3 class="cip__sub">{{ sub.name }} <span class="cip__sub-count">({{ sub.count }})</span></h3>
                <div class="cip__grid" role="grid">
                  @for (n of allowedMembers(sub.members); track n) {
                    <button
                      type="button"
                      class="cip__cell"
                      [class.cip__cell--selected]="selected() === n"
                      [attr.aria-label]="n"
                      (click)="select(n)"
                    >
                      <svg ibmIcon [icon]="n" size="24"></svg>
                      <span class="cip__name">{{ n }}</span>
                    </button>
                  }
                </div>
              }
            </cds-tab>
          }
        </cds-tabs>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .cip { display: flex; flex-direction: column; gap: var(--cds-spacing-04, .75rem); }
    .cip__head {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-04, .75rem);
      flex-wrap: wrap;
    }
    .cip__stat {
      margin: 0;
      font-size: var(--cds-label-01-font-size, .75rem);
      color: var(--cds-text-secondary);
    }
    .cip__sub {
      margin: var(--cds-spacing-05, 1rem) 0 var(--cds-spacing-03, .5rem) 0;
      font-size: var(--cds-productive-heading-02-font-size, 1rem);
      font-weight: 400;
      color: var(--cds-text-primary);
    }
    .cip__sub-count {
      font-weight: 400;
      color: var(--cds-text-secondary);
    }
    .cip__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      gap: 4px;
    }
    .cip__cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: var(--cds-spacing-03, .5rem) 4px;
      background: var(--cds-layer-01, #fff);
      border: 1px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      transition: background var(--cds-duration-fast-02, 70ms) ease, border-color var(--cds-duration-fast-02, 70ms) ease;
    }
    .cip__cell:hover {
      background: var(--cds-layer-hover-01, #e8e8e8);
      border-color: var(--cds-border-subtle-01, #e0e0e0);
    }
    .cip__cell:focus-visible {
      outline: 2px solid var(--cds-focus, #0f62fe);
      outline-offset: -1px;
    }
    .cip__cell--selected {
      background: var(--cds-background-selected, #e0e0e0);
      border-color: var(--cds-border-strong-01, #8d8d8d);
    }
    .cip__cell svg { width: 24px; height: 24px; color: var(--cds-icon-primary, #161616); }
    .cip__name {
      font-size: 10px;
      line-height: 1.2;
      color: var(--cds-text-secondary);
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      direction: ltr;
    }
    .cip__empty {
      grid-column: 1 / -1;
      padding: var(--cds-spacing-05, 1rem);
      color: var(--cds-text-secondary);
      text-align: center;
    }
  `],
})
export class DosCarbonIconPickerComponent implements OnInit {
  readonly svc = inject(CarbonIconAllowlistService);

  @Input() ariaLabel = 'Carbon icon picker';
  @Input() searchPlaceholder = 'Search icons (name, alias, friendly name)…';
  @Output() readonly iconSelected = new EventEmitter<CarbonIconName>();

  readonly categories = CATEGORIES.categories;
  readonly totalCount = this.svc.totalCount;

  searchModel = '';
  readonly search   = signal('');
  readonly selected = signal<CarbonIconName | null>(null);

  readonly filteredIcons = computed<readonly CarbonIconName[]>(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return [];
    const out: CarbonIconName[] = [];
    for (const cat of this.categories) {
      for (const sub of cat.subcategories) {
        for (const m of sub.members) {
          if (!this.svc.isAllowed(m)) continue;
          const e = this.svc.resolve(m);
          const matchesName     = m.toLowerCase().includes(q);
          const matchesFriendly = !!e?.friendlyName && e.friendlyName.toLowerCase().includes(q);
          const matchesAlias    = (e?.aliases ?? []).some(a => a.toLowerCase().includes(q));
          if (matchesName || matchesFriendly || matchesAlias) out.push(m as CarbonIconName);
        }
      }
    }
    // Dedupe (icons can appear in multiple categories).
    return Array.from(new Set(out));
  });

  readonly visibleCount = computed(() =>
    this.search() ? this.filteredIcons().length : this.totalCount);

  allowedMembers(members: readonly string[]): readonly CarbonIconName[] {
    const out: CarbonIconName[] = [];
    for (const m of members) {
      if (this.svc.isAllowed(m)) out.push(m as CarbonIconName);
    }
    return out;
  }

  onSearchChange(q: string): void {
    this.search.set(q);
  }

  select(name: CarbonIconName): void {
    this.selected.set(name);
    this.iconSelected.emit(name);
  }

  ngOnInit(): void {
    // No-op; categories are statically imported.
  }
}
