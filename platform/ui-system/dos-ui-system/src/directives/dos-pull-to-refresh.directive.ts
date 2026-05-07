import { Directive, Output, EventEmitter, Input, HostListener, ElementRef } from '@angular/core';

/**
 * @dos/ui-system Pull-to-Refresh Directive
 *
 * Detects pull-down gesture to trigger refresh.
 * Emits refresh event when threshold is reached.
 */
@Directive({
  selector: '[dosPullToRefresh]',
  standalone: true,
})
export class DosPullToRefreshDirective {
  @Input() threshold = 80;
  @Input() hapticFeedback = false;
  @Output() pullStart = new EventEmitter<number>();
  @Output() pullMove = new EventEmitter<number>();
  @Output() pullEnd = new EventEmitter<number>();
  @Output() refresh = new EventEmitter<void>();

  private startY = 0;
  private currentY = 0;
  private isPulling = false;

  constructor(private el: ElementRef) {}

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    this.startY = event.touches[0].clientY;
    this.isPulling = false;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    this.currentY = event.touches[0].clientY;
    const diffY = this.currentY - this.startY;

    if (diffY > 0 && window.scrollY === 0) {
      event.preventDefault();
      this.isPulling = true;
      this.pullMove.emit(diffY);
    }
  }

  @HostListener('touchend')
  onTouchEnd(): void {
    const diffY = this.currentY - this.startY;

    if (this.isPulling && diffY >= this.threshold) {
      this.refresh.emit();
      if (this.hapticFeedback) {
        this.triggerHaptic();
      }
    }

    this.isPulling = false;
    this.pullEnd.emit(diffY);
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  }
}
