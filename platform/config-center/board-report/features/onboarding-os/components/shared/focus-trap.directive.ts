import { Directive, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appFocusTrap]',
  standalone: true,
})
export class FocusTrapDirective implements AfterViewInit, OnDestroy {
  private firstFocusable: HTMLElement | null = null;
  private lastFocusable: HTMLElement | null = null;
  private boundKeydown = this.onKeydown.bind(this);

  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.updateFocusableElements();
    this.el.nativeElement.addEventListener('keydown', this.boundKeydown);
    this.firstFocusable?.focus();
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('keydown', this.boundKeydown);
  }

  private updateFocusableElements(): void {
    const focusable = this.el.nativeElement.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    this.firstFocusable = focusable[0] ?? null;
    this.lastFocusable = focusable[focusable.length - 1] ?? null;
  }

  private onKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    this.updateFocusableElements();
    if (!this.firstFocusable || !this.lastFocusable) return;
    if (e.shiftKey) {
      if (document.activeElement === this.firstFocusable) {
        e.preventDefault();
        this.lastFocusable.focus();
      }
    } else {
      if (document.activeElement === this.lastFocusable) {
        e.preventDefault();
        this.firstFocusable.focus();
      }
    }
  }
}
