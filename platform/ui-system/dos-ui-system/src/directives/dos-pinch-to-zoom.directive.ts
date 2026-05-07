import { Directive, Output, EventEmitter, Input, HostListener } from '@angular/core';

/**
 * @dos/ui-system Pinch-to-Zoom Gesture Directive
 *
 * Detects pinch-to-zoom gestures on an element.
 * Emits scale change events.
 */
@Directive({
  selector: '[dosPinchToZoom]',
  standalone: true,
})
export class DosPinchToZoomDirective {
  @Input() minScale = 0.5;
  @Input() maxScale = 3;
  @Input() hapticFeedback = false;
  @Output() pinchStart = new EventEmitter<{ scale: number }>();
  @Output() pinchEnd = new EventEmitter<{ scale: number }>();
  @Output() scaleChange = new EventEmitter<number>();

  private initialDistance = 0;
  private initialScale = 1;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.initialDistance = this.getDistance(event.touches[0], event.touches[1]);
      this.initialScale = 1;
      this.pinchStart.emit({ scale: this.initialScale });
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 2) {
      const currentDistance = this.getDistance(event.touches[0], event.touches[1]);
      const scale = currentDistance / this.initialDistance;
      const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, scale));
      this.scaleChange.emit(clampedScale);
    }
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      this.pinchEnd.emit({ scale: this.initialScale });
      if (this.hapticFeedback) {
        this.triggerHaptic();
      }
    }
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
}
