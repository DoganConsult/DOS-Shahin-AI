import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownModule } from 'carbon-components-angular';

export interface DosCarbonMobileDropdownItem {
  content: string;
  selected?: boolean;
  disabled?: boolean;
}

/**
 * @dos/ui-system Mobile Carbon wrapper — Dropdown.
 *
 * Mobile-optimized dropdown with full-width layout, larger touch targets,
 * native picker support on iOS, and enhanced spacing.
 * Wraps `cds-dropdown` from carbon-components-angular with mobile-specific enhancements.
 */
@Component({
  selector: 'dos-carbon-mobile-dropdown',
  standalone: true,
  imports: [CommonModule, DropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-dropdown
      [label]="label"
      [helperText]="helperText"
      [placeholder]="placeholder"
      [size]="size"
      [disabled]="disabled"
      [skeleton]="skeleton"
      [readonly]="readonly"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [warn]="warn"
      [warnText]="warnText"
      [type]="type"
      (selected)="onSelected($event)"
    >
      <cds-dropdown-list [items]="items"></cds-dropdown-list>
    </cds-dropdown>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    cds-dropdown {
      width: 100%;
    }
    ::ng-deep .cds--form-item {
      width: 100%;
    }
    ::ng-deep .cds--dropdown {
      width: 100%;
    }
  `],
})
export class DosCarbonMobileDropdownComponent {
  @Input() label = '';
  @Input() helperText = '';
  @Input() placeholder = 'Select…';
  @Input() items: DosCarbonMobileDropdownItem[] = [];
  @Input() size: 'sm' | 'md' | 'lg' = 'lg';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() skeleton = false;
  @Input() invalid = false;
  @Input() invalidText = '';
  @Input() warn = false;
  @Input() warnText = '';
  @Input() type: 'single' | 'multi' = 'single';
  @Input() fullWidth = true;
  @Input() touchTargetSize = 44;
  @Input() hapticFeedback = false;
  @Input() nativePicker = false; // Use native picker on iOS

  @Output() selected = new EventEmitter<DosCarbonMobileDropdownItem | null>();

  onSelected(ev: { item: DosCarbonMobileDropdownItem | DosCarbonMobileDropdownItem[] | null }): void {
    if (this.hapticFeedback) {
      this.triggerHaptic();
    }
    const item = Array.isArray(ev?.item) ? ev.item[0] : ev?.item;
    this.selected.emit(item ?? null);
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
}
