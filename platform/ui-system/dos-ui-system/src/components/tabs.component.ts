import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosTabItem {
  id: string;
  label: string;
}

@Component({
  selector: 'dos-tabs',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-tabs" role="tablist">
      @for (t of items; track t.id) {
        <button
          type="button"
          role="tab"
          class="dos-tabs__item"
          [attr.aria-selected]="t.id === selectedId"
          (click)="select(t)"
        >
          {{ t.label }}
        </button>
      }
    </div>
  `,
})
export class DosTabsComponent {
  @Input() items: DosTabItem[] = [];
  @Input() selectedId = '';
  @Output() selectedIdChange = new EventEmitter<string>();

  select(t: DosTabItem): void {
    this.selectedId = t.id;
    this.selectedIdChange.emit(t.id);
  }
}
