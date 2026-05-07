import { Directive, Output, EventEmitter, Input, HostListener, ElementRef } from '@angular/core';

/**
 * @dos/ui-system Swipe-to-Delete Directive
 *
 * Detects swipe-left gesture to trigger delete action.
 * Emits swipeDelete event when threshold is reached.
 */
@Directive({
  selector: '[dosSwipeToDelete]',
  standalone: true,
})
export class DosSwipeToDeleteDirective {
  @Input() threshold = 100;
  @Input() confirmRequired = true;
  @Input() hapticFeedback = false;
  @Output() swipeDelete = new EventEmitter<void>();
  @Output() deleteConfirm = new EventEmitter<void>();
  @Output() deleteCancel = new EventEmitter<void>();

  private startX = 0;
  private isSwiping = false;
  private isConfirmed = false;

  constructor(private el: ElementRef) {}

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    this.startX = event.touches[0].clientX;
    this.isSwiping = true;
    this.isConfirmed = false;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.isSwiping) return;

    const currentX = event.touches[0].clientX;
    const diffX = this.startX - currentX;

    if (diffX > 0) {
      const element = this.el.nativeElement;
      element.style.transform = `translateX(${Math.min(diffX, this.threshold)}px)`;
      element.style.transition = 'none';
    }
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.isSwiping) return;

    const endX = event.changedTouches[0].clientX;
    const diffX = this.startX - endX;
    const element = this.el.nativeElement;

    element.style.transition = 'transform 0.3s ease-out';

    if (diffX > this.threshold) {
      if (this.confirmRequired && !this.isConfirmed) {
        element.style.transform = 'translateX(0px)';
        this.isConfirmed = true;
        this.deleteConfirm.emit();
        if (this.hapticFeedback) {
          this.triggerHaptic();
        }
      } else {
        element.style.transform = `translateX(${window.innerWidth}px)`;
        this.swipeDelete.emit();
        if (this.hapticFeedback) {
          this.triggerHaptic();
        }
      }
    } else {
      element.style.transform = 'translateX(0px)';
      if (this.isConfirmed) {
        this.deleteCancel.emit();
      }
    }

    this.isSwiping = false;
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }
}
