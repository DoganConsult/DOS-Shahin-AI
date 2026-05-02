var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconModule, SearchModule, TabsModule, TilesModule, } from 'carbon-components-angular';
import { CarbonIconAllowlistService } from './carbon-icon-allowlist.service';
import categoriesData from '../allowlists/carbon-icons.categories.json';
const CATEGORIES = categoriesData;
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
let DosCarbonIconPickerComponent = class DosCarbonIconPickerComponent {
    svc = inject(CarbonIconAllowlistService);
    ariaLabel = 'Carbon icon picker';
    searchPlaceholder = 'Search icons (name, alias, friendly name)…';
    iconSelected = new EventEmitter();
    categories = CATEGORIES.categories;
    totalCount = this.svc.totalCount;
    searchModel = '';
    search = signal('');
    selected = signal(null);
    filteredIcons = computed(() => {
        const q = this.search().trim().toLowerCase();
        if (!q)
            return [];
        const out = [];
        for (const cat of this.categories) {
            for (const sub of cat.subcategories) {
                for (const m of sub.members) {
                    if (!this.svc.isAllowed(m))
                        continue;
                    const e = this.svc.resolve(m);
                    const matchesName = m.toLowerCase().includes(q);
                    const matchesFriendly = !!e?.friendlyName && e.friendlyName.toLowerCase().includes(q);
                    const matchesAlias = (e?.aliases ?? []).some(a => a.toLowerCase().includes(q));
                    if (matchesName || matchesFriendly || matchesAlias)
                        out.push(m);
                }
            }
        }
        // Dedupe (icons can appear in multiple categories).
        return Array.from(new Set(out));
    });
    visibleCount = computed(() => this.search() ? this.filteredIcons().length : this.totalCount);
    allowedMembers(members) {
        const out = [];
        for (const m of members) {
            if (this.svc.isAllowed(m))
                out.push(m);
        }
        return out;
    }
    onSearchChange(q) {
        this.search.set(q);
    }
    select(name) {
        this.selected.set(name);
        this.iconSelected.emit(name);
    }
    ngOnInit() {
        // No-op; categories are statically imported.
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonIconPickerComponent.prototype, "ariaLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonIconPickerComponent.prototype, "searchPlaceholder", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonIconPickerComponent.prototype, "iconSelected", void 0);
DosCarbonIconPickerComponent = __decorate([
    Component({
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
], DosCarbonIconPickerComponent);
export { DosCarbonIconPickerComponent };
//# sourceMappingURL=carbon-icon-picker.component.js.map