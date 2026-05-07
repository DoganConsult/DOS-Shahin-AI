import { Directive, Output, EventEmitter, Input, HostListener } from '@angular/core';

/**
 * @dos/ui-system Long Press Gesture Directive
 *
 * Detects long-press gestures on an element.
 * Emits longPress event after the specified duration.
 */
@Directive({
  selector: '[dosLongPress]',
  standalone: true,
})
export class DosLongPressDirective {
  @Input() duration = 500;
  @Input() hapticFeedback = false;
  @Output() longPress = new EventEmitter<void>();
  @Output() longPressCancel = new EventEmitter<void>();

  private timer: any;
  private isLongPressing = false;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    this.isLongPressing = true;
    this.timer = setTimeout(() => {
      if (this.isLongPressing) {
        this.longPress.emit();
        if (this.hapticFeedback) {
          this.triggerHaptic();
        }
      }
    }, this.duration);
  }

  @HostListener('touchend')
  onTouchEnd(): void {
    this.isLongPressing = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  @HostListener('touchmove')
  onTouchMove(): void {
    this.isLongPressing = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.longPressCancel.emit();
    }
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }
}
