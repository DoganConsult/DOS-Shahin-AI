import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'carbon-components-angular';

export type DosCarbonMobileButtonKind = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'danger-tertiary' | 'danger-ghost';
export type DosCarbonMobileButtonSize = 'md' | 'lg' | 'xl';

/**
 * @dos/ui-system Mobile Carbon wrapper — Button.
 *
 * Mobile-optimized button with larger touch targets (44px minimum),
 * haptic feedback support, and enhanced spacing for touch interactions.
 * Wraps `cds-button` from carbon-components-angular with mobile-specific enhancements.
 */
@Component({
  selector: 'dos-carbon-mobile-button',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      cdsButton
      [size]="size"
      [ngClass]="'cds--btn--' + kind"
      [disabled]="disabled"
      [type]="type"
      [style.min-height.px]="touchTargetSize"
      [style.min-width.px]="touchTargetSize"
      (click)="handleClick($event)"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    button {
      transition: transform 0.12s ease-out;
    }
    button:active {
      transform: scale(0.96);
    }
  `],
})
export class DosCarbonMobileButtonComponent {
  @Input() kind: DosCarbonMobileButtonKind = 'primary';
  @Input() size: DosCarbonMobileButtonSize = 'lg';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() touchTargetSize = 44; // Apple HIG minimum
  @Input() hapticFeedback = false;
  @Output() clicked = new EventEmitter<MouseEvent>();

  handleClick(event: MouseEvent): void {
    if (this.hapticFeedback && !this.disabled) {
      this.triggerHaptic();
    }
    this.clicked.emit(event);
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Light tap feedback
    }
  }
}
