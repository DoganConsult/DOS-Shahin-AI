import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Observes the host element's intersection with the viewport.
 * Emits `visibleChange` so the parent can:
 *  - defer rendering until the widget scrolls into view (Req 18.1)
 *  - pause/resume auto-refresh for off-screen widgets (Req 18.4)
 */
@Directive({ selector: '[appWidgetLazyLoad]', standalone: true })
export class WidgetLazyLoadDirective implements OnInit, OnDestroy {
  /** Intersection Observer rootMargin — pre-load slightly before visible */
  @Input() rootMargin = '100px';

  /** Intersection Observer threshold */
  @Input() threshold = 0;

  /** Emits true when the element enters the viewport, false when it leaves */
  @Output() visibleChange = new EventEmitter<boolean>();

  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
      // SSR or unsupported browser — treat as always visible
      this.visibleChange.emit(true);
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          this.visibleChange.emit(entry.isIntersecting);
        }
      },
      { rootMargin: this.rootMargin, threshold: this.threshold },
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
