import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionModule } from 'carbon-components-angular';

export interface DosCarbonAccordionItem {
  title: string;
  content?: string;
  open?: boolean;
  disabled?: boolean;
}

/**
 * Carbon-backed accordion. Pass `[items]` for simple text content; for
 * rich content, project per-panel templates inside the component.
 */
@Component({
  selector: 'dos-carbon-accordion',
  standalone: true,
  imports: [CommonModule, AccordionModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-accordion [size]="size" [align]="align" [skeleton]="skeleton">
      <cds-accordion-item
        *ngFor="let item of items; let i = index"
        [title]="item.title"
        [expanded]="item.open"
        [disabled]="item.disabled || false"
        (selected)="opened.emit(i)"
      >
        {{ item.content }}
        <ng-content [select]="'[slot=item-' + i + ']'"></ng-content>
      </cds-accordion-item>
    </cds-accordion>
  `,
})
export class DosCarbonAccordionComponent {
  @Input() items: DosCarbonAccordionItem[] = [];
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() align: 'start' | 'end' = 'end';
  @Input() skeleton = false;
  @Output() opened = new EventEmitter<number>();
}
