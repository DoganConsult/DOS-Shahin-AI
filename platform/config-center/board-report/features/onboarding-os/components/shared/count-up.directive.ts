import { Directive, Input, ElementRef, OnChanges, SimpleChanges, inject } from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements OnChanges {
  @Input('appCountUp') targetValue = 0;
  @Input() duration = 1200;

  private el = inject(ElementRef);
  private animationFrame?: number;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['targetValue']) {
      this.animate(changes['targetValue'].previousValue || 0, this.targetValue);
    }
  }

  private animate(from: number, to: number): void {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (from === to) { this.el.nativeElement.textContent = to.toLocaleString(); return; }

    const start = performance.now();
    const diff = to - from;

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / this.duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(from + diff * eased);
      this.el.nativeElement.textContent = current.toLocaleString();

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(step);
      }
    };

    this.animationFrame = requestAnimationFrame(step);
  }
}
