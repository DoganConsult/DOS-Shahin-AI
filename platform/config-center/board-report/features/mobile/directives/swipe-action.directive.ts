import {
  Directive, ElementRef, EventEmitter, HostListener,
  Input, OnInit, Output, inject
} from '@angular/core';
import { HapticService } from '../services/haptic.service';

@Directive({
  selector: '[appSwipeAction]',
  standalone: true,
})
export class SwipeActionDirective implements OnInit {
  @Input() swipeThreshold = 80;
  @Output() swipeRight = new EventEmitter<void>(); // approve
  @Output() swipeLeft = new EventEmitter<void>();  // reject

  private el = inject(ElementRef);
  private haptic = inject(HapticService);

  private startX = 0;
  private startY = 0;
  private swiping = false;

  ngOnInit(): void {
    const el = this.el.nativeElement as HTMLElement;
    el.style.transition = 'transform 0.15s ease';
    el.style.willChange = 'transform';
  }

  @HostListener('touchstart', ['$event'])
  onStart(e: TouchEvent): void {
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.swiping = false;
  }

  @HostListener('touchmove', ['$event'])
  onMove(e: TouchEvent): void {
    const dx = e.touches[0].clientX - this.startX;
    const dy = e.touches[0].clientY - this.startY;
    if (!this.swiping && Math.abs(dy) > Math.abs(dx)) return;
    this.swiping = true;
    e.preventDefault();
    const el = this.el.nativeElement as HTMLElement;
    el.style.transition = 'none';
    el.style.transform = `translateX(${dx}px)`;
    el.style.background = dx > 40
      ? `rgba(var(--module-accent-emerald-rgb), ${Math.min(dx / 120, 0.18)})`
      : dx < -40
      ? `rgba(var(--module-accent-red-rgb), ${Math.min(Math.abs(dx) / 120, 0.18)})`
      : '';
  }

  @HostListener('touchend', ['$event'])
  async onEnd(e: TouchEvent): Promise<void> {
    if (!this.swiping) return;
    const dx = e.changedTouches[0].clientX - this.startX;
    const el = this.el.nativeElement as HTMLElement;
    el.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.2s';
    el.style.transform = 'translateX(0)';
    el.style.background = '';
    if (dx >= this.swipeThreshold) {
      await this.haptic.trigger('success');
      this.swipeRight.emit();
    } else if (dx <= -this.swipeThreshold) {
      await this.haptic.trigger('error');
      this.swipeLeft.emit();
    }
    this.swiping = false;
  }
}
