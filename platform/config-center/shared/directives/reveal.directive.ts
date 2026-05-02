/**
 * Cinematic landing – reveal fallback when animation-timeline: view() is not supported.
 * Uses IntersectionObserver to add .reveal--in on viewport entry.
 */
import {
  Directive,
  ElementRef,
  OnInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.el.nativeElement.classList.add('reveal--in');
      return;
    }
    const supportsScrollTimeline = CSS.supports('animation-timeline', 'view()');
    if (supportsScrollTimeline) {
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--in');
            this.observer?.unobserve(entry.target);
          }
        }
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.1,
      }
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
