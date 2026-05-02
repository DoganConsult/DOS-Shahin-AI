/**
 * Icon Component
 * 
 * Canonical icon component for unified icon rendering across the platform.
 * Replaces hardcoded PrimeIcons classes with a consistent, type-safe API.
 * 
 * @see ACTION_PLAN_REMAINING_ITEMS.md for migration notes
 */

import { Component, Input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getIcon, type IconType } from '../../../constants/icons.constants';

@Component({
    selector: 'app-icon',
    imports: [CommonModule],
    template: `
    <i 
      [ngClass]="iconClass()" 
      [class]="sizeClass()" 
      [style.color]="resolvedColor()"
      [attr.aria-hidden]="ariaHidden ? 'true' : null"
      [attr.aria-label]="ariaLabel || null">
    </i>
  `,
    styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .icon-xs { font-size: var(--font-size-sm); }
    .icon-sm { font-size: var(--font-size-base); }
    .icon-md { font-size: var(--font-size-md); }
    .icon-lg { font-size: var(--font-size-xl); }
    .icon-xl { font-size: var(--font-size-2xl); }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() type: IconType = 'route';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() color?: string;
  @Input() ariaHidden: boolean = true;
  @Input() ariaLabel?: string;

  readonly iconClass = computed(() => {
    const icon = getIcon(this.name, this.type);
    return icon.split(' '); // Handle multiple classes like 'pi-spin pi-spinner'
  });

  readonly sizeClass = computed(() => `icon-${this.size}`);

  readonly resolvedColor = computed(() => this.color || undefined);
}
