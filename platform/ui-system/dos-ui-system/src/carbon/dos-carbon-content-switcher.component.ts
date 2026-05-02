import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentSwitcherModule } from 'carbon-components-angular';

export interface DosCarbonContentSwitcherOption {
  id: string;
  label: string;
  selected?: boolean;
  disabled?: boolean;
}

/**
 * Carbon-backed content switcher. Carbon's `cds-content-switcher` only
 * exposes `ariaLabel` and `size`.
 */
@Component({
  selector: 'dos-carbon-content-switcher',
  standalone: true,
  imports: [CommonModule, ContentSwitcherModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-content-switcher
      [size]="size"
      [ariaLabel]="ariaLabel"
      (selected)="onSelected($event)"
    >
      <button
        cdsContentOption
        *ngFor="let opt of options"
        [disabled]="opt.disabled || false"
      >{{ opt.label }}</button>
    </cds-content-switcher>
  `,
})
export class DosCarbonContentSwitcherComponent {
  @Input() options: DosCarbonContentSwitcherOption[] = [];
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() ariaLabel = 'Content switcher';
  @Output() selected = new EventEmitter<DosCarbonContentSwitcherOption>();

  onSelected(ev: { value?: string; index?: number }): void {
    const idx = typeof ev?.index === 'number' ? ev.index : 0;
    const opt = this.options[idx];
    if (opt) this.selected.emit(opt);
  }
}
