import {
  Directive, ElementRef, EventEmitter, HostListener,
  Input, OnInit, OnDestroy, Output, inject, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HtmlSanitizerService } from '@app/core/services/ui-infra/error-handling/html-sanitizer.service';

@Directive({
  selector: '[appPullToRefresh]',
  standalone: true,
  exportAs: 'appPullToRefresh',
})
export class PullToRefreshDirective implements OnInit, OnDestroy {
  @Input() pullThreshold = 80;
  @Input() maxPull = 120;
  @Output() refresh = new EventEmitter<void>();

  private platformId = inject(PLATFORM_ID);
  private el = inject(ElementRef);
  private htmlSanitizer = inject(HtmlSanitizerService);

  private startY = 0;
  private pulling = false;
  private indicator: HTMLElement | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.createIndicator();
  }

  ngOnDestroy(): void {
    this.indicator?.remove();
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    const el = this.el.nativeElement as HTMLElement;
    if (el.scrollTop > 0) return;
    this.startY = e.touches[0].clientY;
    this.pulling = true;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    if (!this.pulling || !this.indicator) return;
    const delta = Math.min(e.touches[0].clientY - this.startY, this.maxPull);
    if (delta <= 0) return;
    const progress = Math.min(delta / this.pullThreshold, 1);
    this.indicator.style.transform = `translateX(-50%) translateY(${delta * 0.5}px)`;
    this.indicator.style.opacity = `${progress}`;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(e: TouchEvent): void {
    if (!this.pulling) return;
    this.pulling = false;
    const delta = e.changedTouches[0].clientY - this.startY;
    if (delta >= this.pullThreshold) {
      this.triggerRefresh();
    } else {
      this.resetIndicator();
    }
  }

  private triggerRefresh(): void {
    if (this.indicator) {
      this.indicator.style.transform = 'translateX(-50%) translateY(48px)';
      this.indicator.classList.add('refreshing');
    }
    this.refresh.emit();
    setTimeout(() => this.resetIndicator(), 1500);
  }

  private resetIndicator(): void {
    if (!this.indicator) return;
    this.indicator.style.transform = 'translateX(-50%) translateY(-48px)';
    this.indicator.style.opacity = '0';
    this.indicator.classList.remove('refreshing');
  }

  private createIndicator(): void {
    this.indicator = document.createElement('div');
    this.indicator.className = 'ptr-indicator';
    const svgContent = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    `;
    this.indicator.innerHTML = this.htmlSanitizer.sanitizeSvg(svgContent);
    this.indicator.style.cssText = `
      position: absolute; top: 0; left: 50%; transform: translateX(-50%) translateY(-48px);
      z-index: var(--z-dropdown); opacity: 0; transition: transform 0.3s ease, opacity 0.3s ease;
      display: flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: var(--radius-pill);
      background: rgba(var(--module-accent-sky-rgb), 0.15); border: 1px solid rgba(var(--module-accent-sky-rgb), 0.3);
    `;
    const parent = this.el.nativeElement as HTMLElement;
    parent.style.position = 'relative';
    parent.insertBefore(this.indicator, parent.firstChild);
  }
}
