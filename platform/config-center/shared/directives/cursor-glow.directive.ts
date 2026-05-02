import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appCursorGlow]',
  standalone: true,
})
export class CursorGlowDirective {
  constructor(private el: ElementRef<HTMLElement>) {}

  @HostListener('mouseenter') onEnter(): void {
    this.el.nativeElement.classList.add('cursor-glow');
  }

  @HostListener('mouseleave') onLeave(): void {
    this.el.nativeElement.classList.remove('cursor-glow');
  }
}
