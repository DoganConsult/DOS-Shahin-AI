import { Directive, Output, EventEmitter, Input, HostListener, ElementRef } from '@angular/core';

/**
 * @dos/ui-system Infinite Scroll Directive
 *
 * Detects when user scrolls near the bottom of an element.
 * Emits loadMore event to trigger data loading.
 */
@Directive({
  selector: '[dosInfiniteScroll]',
  standalone: true,
})
export class DosInfiniteScrollDirective {
  @Input() threshold = 100;
  @Input() hapticFeedback = false;
  @Output() scrollNearBottom = new EventEmitter<void>();
  @Output() loadMore = new EventEmitter<void>();

  constructor(private el: ElementRef) {}

  @HostListener('scroll')
  onScroll(): void {
    const element = this.el.nativeElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    if (distanceFromBottom < this.threshold) {
      this.scrollNearBottom.emit();
      this.loadMore.emit();
      if (this.hapticFeedback) {
        this.triggerHaptic();
      }
    }
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  }
}
