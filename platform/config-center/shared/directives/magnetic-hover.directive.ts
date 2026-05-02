import {
  Directive,
  ElementRef,
  HostListener,
  inject,
} from '@angular/core';

/** Strength factor controlling how far the element pulls toward the cursor (0–1 range). */
const PULL_STRENGTH = 0.3;

@Directive({ selector: '[appMagneticHover]', standalone: true })
export class MagneticHoverDirective {
  private el = inject(ElementRef);

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const nativeEl: HTMLElement = this.el.nativeElement;
    const rect: DOMRect = nativeEl.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = (event.clientX - centerX) * PULL_STRENGTH;
    const dy = (event.clientY - centerY) * PULL_STRENGTH;

    nativeEl.style.transition = 'transform 0.2s ease-out';
    nativeEl.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    const nativeEl: HTMLElement = this.el.nativeElement;
    nativeEl.style.transition = 'transform 0.3s ease-out';
    nativeEl.style.transform = 'translate(0px, 0px)';
  }
}
