import { Directive, Output, EventEmitter, Input, HostListener, ElementRef } from '@angular/core';

/**
 * @dos/ui-system Swipe Gesture Directive
 *
 * Detects swipe gestures (left, right, up, down) on an element.
 * Emits swipe events with direction and velocity information.
 */
@Directive({
  selector: '[dosSwipe]',
  standalone: true,
})
export class DosSwipeDirective {
  @Input() swipeThreshold = 50;
  @Input() swipeTimeout = 500;
  @Input() hapticFeedback = false;
  @Output() swipe = new EventEmitter<{ direction: 'left' | 'right' | 'up' | 'down'; velocity: number }>();
  @Output() swipeLeft = new EventEmitter<number>();
  @Output() swipeRight = new EventEmitter<number>();
  @Output() swipeUp = new EventEmitter<number>();
  @Output() swipeDown = new EventEmitter<number>();

  private startX = 0;
  private startY = 0;
  private startTime = 0;

  constructor(private el: ElementRef) {}

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
    this.startTime = Date.now();
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    const endTime = Date.now();

    const diffX = endX - this.startX;
    const diffY = endY - this.startY;
    const diffTime = endTime - this.startTime;

    if (diffTime > this.swipeTimeout) return;

    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    if (Math.max(absX, absY) < this.swipeThreshold) return;

    let direction: 'left' | 'right' | 'up' | 'down';
    let velocity = 0;

    if (absX > absY) {
      direction = diffX > 0 ? 'right' : 'left';
      velocity = absX / diffTime;
    } else {
      direction = diffY > 0 ? 'down' : 'up';
      velocity = absY / diffTime;
    }

    this.swipe.emit({ direction, velocity });

    if (direction === 'left') this.swipeLeft.emit(velocity);
    if (direction === 'right') this.swipeRight.emit(velocity);
    if (direction === 'up') this.swipeUp.emit(velocity);
    if (direction === 'down') this.swipeDown.emit(velocity);

    if (this.hapticFeedback) {
      this.triggerHaptic();
    }
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
}
