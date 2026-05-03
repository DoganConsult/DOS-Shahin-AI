import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosCarbonTabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'dos-carbon-tabs',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cds--tabs" role="navigation">
      <ul class="cds--tabs__nav cds--tabs__nav--hidden" role="tablist">
        @for (t of items; track t.id; let i = $index) {
          <li
            class="cds--tabs__nav-item"
            [class.cds--tabs__nav-item--selected]="t.id === selectedId"
            [class.cds--tabs__nav-item--disabled]="!!t.disabled"
            role="presentation"
          >
            <button
              type="button"
              class="cds--tabs__nav-link"
              role="tab"
              [attr.aria-selected]="t.id === selectedId"
              [attr.aria-disabled]="!!t.disabled || null"
              [attr.tabindex]="t.id === selectedId ? 0 : -1"
              [disabled]="!!t.disabled"
              (click)="onSelected(i)"
            >
              {{ t.label }}
            </button>
          </li>
        }
      </ul>
    </div>
    <div class="dos-carbon-tabs__panel" role="tabpanel">
      <ng-content></ng-content>
    </div>
  `,
})
export class DosCarbonTabsComponent {
  @Input() items: DosCarbonTabItem[] = [];
  @Input() selectedId = '';
  @Output() selectedIdChange = new EventEmitter<string>();

  onSelected(idx: number): void {
    const item = this.items[idx];
    if (!item || item.disabled) return;
    this.selectedId = item.id;
    this.selectedIdChange.emit(item.id);
  }
}
