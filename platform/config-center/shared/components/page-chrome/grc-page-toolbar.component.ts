import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'grc-page-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, DropdownModule, ButtonModule, TooltipModule],
  template: `
    <div class="grc-toolbar">
      <div class="grc-toolbar__start">
        <div class="grc-toolbar__search" *ngIf="showSearch">
          <i class="pi pi-search grc-toolbar__search-icon"></i>
          <input pInputText
            [(ngModel)]="searchValue"
            [placeholder]="searchPlaceholder" [attr.aria-label]="searchPlaceholder"
            (input)="onSearch()"
            class="grc-toolbar__search-input" />
          <button aria-label="Close" *ngIf="searchValue" class="grc-toolbar__search-clear" (click)="clearSearch()">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <ng-content select="[toolbarStart]"></ng-content>
      </div>

      <div class="grc-toolbar__center">
        <ng-content select="[toolbarCenter]"></ng-content>
      </div>

      <div class="grc-toolbar__end">
        <ng-content select="[toolbarEnd]"></ng-content>

        <p-dropdown *ngIf="showSort && sortOptions.length > 0"
          [(ngModel)]="sortValue"
          [options]="sortOptions"
          optionLabel="label" optionValue="value"
          [placeholder]="sortPlaceholder"
          (onChange)="onSort()"
          [style]="{'min-width':'160px'}"
          [showClear]="true" />

        <div class="grc-toolbar__view-toggle" *ngIf="showViewToggle">
          <button aria-label="Grid View" class="grc-toolbar__view-btn" [class.active]="viewMode === 'grid'"
            (click)="setView('grid')" pTooltip="Grid View">
            <i class="pi pi-th-large"></i>
          </button>
          <button aria-label="List View" class="grc-toolbar__view-btn" [class.active]="viewMode === 'list'"
            (click)="setView('list')" pTooltip="List View">
            <i class="pi pi-list"></i>
          </button>
          <button aria-label="Table View" class="grc-toolbar__view-btn" [class.active]="viewMode === 'table'"
            (click)="setView('table')" pTooltip="Table View">
            <i class="pi pi-table"></i>
          </button>
        </div>

        <span class="grc-toolbar__count" *ngIf="totalCount > 0">
          {{ totalCount }} {{ countLabel }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    .grc-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 20px;
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-premium-sm);
      margin-bottom: var(--space-lg);
      flex-wrap: wrap;
    }
    .grc-toolbar__start {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 200px;
    }
    .grc-toolbar__center {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .grc-toolbar__end {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .grc-toolbar__search {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      max-width: 360px;
    }
    .grc-toolbar__search-icon {
      position: absolute;
      left: 12px;
      color: var(--text-muted);
      font-size: var(--font-size-base);
      z-index: var(--z-base);
      pointer-events: none;
    }
    .grc-toolbar__search-clear {
      position: absolute;
      inset-inline-end: 8px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 4px;
      border-radius: var(--radius-xs);
      display: flex;
      align-items: center;
      transition: all 150ms;
    }
    .grc-toolbar__search-clear:hover {
      background: var(--surface-ice);
      color: var(--error);
    }
    .grc-toolbar__view-toggle {
      display: flex;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }
    .grc-toolbar__view-btn {
      background: var(--surface);
      border: none;
      padding: 7px 10px;
      cursor: pointer;
      color: var(--text-muted);
      font-size: var(--font-size-base);
      transition: all 150ms;
      display: flex;
      align-items: center;
    }
    .grc-toolbar__view-btn:not(:last-child) {
      border-inline-end: 1px solid var(--border-subtle);
    }
    .grc-toolbar__view-btn:hover { background: var(--surface-ice); color: var(--primary); }
    .grc-toolbar__view-btn.active {
      background: var(--primary);
      color: var(--text-on-primary);
    }
    .grc-toolbar__count {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--text-muted);
      background: var(--surface-ice);
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      white-space: nowrap;
    }
    @media (max-width: 768px) {
      .grc-toolbar { flex-direction: column; align-items: stretch; }
      .grc-toolbar__search { max-width: 100%; }
      .grc-toolbar__end { justify-content: flex-end; }
    }
  `]
})
export class GrcPageToolbarComponent {
  @Input() showSearch = true;
  @Input() searchPlaceholder = 'Search...';
  @Input() showSort = false;
  @Input() sortPlaceholder = 'Sort by...';
  @Input() sortOptions: { label: string; value: string }[] = [];
  @Input() showViewToggle = false;
  @Input() viewMode: 'grid' | 'list' | 'table' = 'grid';
  @Input() totalCount = 0;
  @Input() countLabel = 'items';

  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<string>();
  @Output() viewModeChange = new EventEmitter<'grid' | 'list' | 'table'>();

  searchValue = '';
  sortValue = '';

  onSearch(): void {
    this.searchChange.emit(this.searchValue);
  }

  clearSearch(): void {
    this.searchValue = '';
    this.searchChange.emit('');
  }

  onSort(): void {
    this.sortChange.emit(this.sortValue);
  }

  setView(mode: 'grid' | 'list' | 'table'): void {
    this.viewMode = mode;
    this.viewModeChange.emit(mode);
  }
}
