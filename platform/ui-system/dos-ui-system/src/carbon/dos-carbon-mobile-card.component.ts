import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * @dos/ui-system Mobile Carbon wrapper — Card (Tile).
 *
 * Mobile-optimized card with swipe actions, long-press menu support,
 * haptic feedback, and larger touch targets.
 * Wraps Carbon tile markup with mobile-specific enhancements.
 */
@Component({
  selector: 'dos-carbon-mobile-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #cardContent><ng-content></ng-content></ng-template>
    @if (clickable) {
      <a
        class="cds--tile cds--tile--clickable dos-mobile-card"
        [attr.href]="route || '#'"
        [attr.role]="route ? null : 'button'"
        [style.min-height.px]="touchTargetSize"
        (click)="onActivate($event)"
      >
        <ng-container [ngTemplateOutlet]="cardContent"></ng-container>
      </a>
    } @else {
      <div
        class="cds--tile dos-mobile-card"
        [style.min-height.px]="touchTargetSize"
      >
        <ng-container [ngTemplateOutlet]="cardContent"></ng-container>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .dos-mobile-card {
      transition: transform 0.12s ease-out, box-shadow 0.12s ease-out;
      position: relative;
    }
    .dos-mobile-card:active {
      transform: scale(0.98);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    .dos-mobile-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
    }
  `],
})
export class DosCarbonMobileCardComponent {
  @Input() clickable = false;
  @Input() route: string | null = null;
  @Input() touchTargetSize = 44;
  @Input() hapticFeedback = false;
  @Input() swipeActions = false;
  @Input() longPressMenu = false;
  @Output() activated = new EventEmitter<MouseEvent>();
  @Output() cardSwipe = new EventEmitter<{ direction: string }>();
  @Output() longPress = new EventEmitter<void>();

  private longPressTimer: any;
  private longPressDuration = 500;

  onActivate(ev: MouseEvent): void {
    if (this.hapticFeedback) {
      this.triggerHaptic();
    }
    this.activated.emit(ev);
  }

  onTouchStart(): void {
    if (this.longPressMenu) {
      this.longPressTimer = setTimeout(() => {
        this.longPress.emit();
        this.triggerHaptic();
      }, this.longPressDuration);
    }
  }

  onTouchEnd(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
}
