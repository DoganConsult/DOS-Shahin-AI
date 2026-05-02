/**
 * GRC Term Tooltip Directive — Detects GRC terms and adds hover tooltips.
 *
 * Fetches definitions from the guidance API and displays them on hover.
 *
 * Requirements: 11.2
 */

import {
  Directive,
  ElementRef,
  inject,
  OnInit,
  OnDestroy,
  Renderer2,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/** Cached term definitions to avoid repeated API calls. */
const termCache = new Map<string, { definitionEn: string; definitionAr: string }>();

/** Common GRC terms to detect in text content. */
const GRC_TERMS = [
  'RACI', 'RTO', 'RPO', 'BIA', 'BCP', 'DRP', 'PDPL', 'NCA', 'SAMA',
  'ISO 27001', 'NIST', 'COBIT', 'CISO', 'DPO', 'KRI', 'KPI',
  'SLA', 'GRC', 'ECC', 'CCC', 'CSCC', 'OTCC', 'DCSCC',
];

@Directive({
  selector: '[appGrcTermTooltip]',
  standalone: true,
})
export class GrcTermTooltipDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private http = inject(HttpClient);
  readonly i18n = inject(I18nService);
  private tooltipEl: HTMLElement | null = null;
  private listeners: (() => void)[] = [];

  ngOnInit() {
    // Scan text content for GRC terms and wrap them
    const element = this.el.nativeElement as HTMLElement;
    const text = element.textContent ?? '';

    for (const term of GRC_TERMS) {
      if (text.includes(term)) {
        this.prefetchTerm(term);
      }
    }

    // Add mouseenter listener for term spans
    const listener = this.renderer.listen(element, 'mouseover', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList?.contains('grc-term')) {
        const term = target.dataset['term'];
        if (term) this.showTooltip(target, term);
      }
    });
    this.listeners.push(listener);

    const leaveListener = this.renderer.listen(element, 'mouseout', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList?.contains('grc-term')) {
        this.hideTooltip();
      }
    });
    this.listeners.push(leaveListener);
  }

  ngOnDestroy() {
    this.listeners.forEach(fn => fn());
    this.hideTooltip();
  }

  private prefetchTerm(term: string) {
    if (termCache.has(term)) return;
    this.http.get<unknown>(`${environment.apiUrl}/guidance/term/${encodeURIComponent(term)}`)
      .subscribe({
        next: data => {
          if (data?.definitionEn) {
            termCache.set(term, { definitionEn: data.definitionEn, definitionAr: data.definitionAr ?? '' });
          }
        },
      });
  }

  private showTooltip(target: HTMLElement, term: string) {
    this.hideTooltip();
    const cached = termCache.get(term);
    if (!cached) return;

    const lang = this.i18n.currentLang();
    const text = lang === 'ar' ? (cached.definitionAr || cached.definitionEn) : cached.definitionEn;

    this.tooltipEl = this.renderer.createElement('div');
    this.renderer.addClass(this.tooltipEl, 'grc-tooltip');
    this.renderer.setProperty(this.tooltipEl, 'textContent', text);

    const rect = target.getBoundingClientRect();
    this.renderer.setStyle(this.tooltipEl, 'position', 'fixed');
    this.renderer.setStyle(this.tooltipEl, 'top', `${rect.bottom + 4}px`);
    this.renderer.setStyle(this.tooltipEl, 'left', `${rect.left}px`);
    this.renderer.setStyle(this.tooltipEl, 'zIndex', '9999');
    this.renderer.setStyle(this.tooltipEl, 'background', 'var(--surface-card)');
    this.renderer.setStyle(this.tooltipEl, 'padding', '8px 12px');
    this.renderer.setStyle(this.tooltipEl, 'borderRadius', '6px');
    this.renderer.setStyle(this.tooltipEl, 'boxShadow', 'var(--shadow-md)');
    this.renderer.setStyle(this.tooltipEl, 'maxWidth', '300px');
    this.renderer.setStyle(this.tooltipEl, 'fontSize', '0.85rem');
    this.renderer.setStyle(this.tooltipEl, 'lineHeight', '1.4');

    if (this.tooltipEl) document.body.appendChild(this.tooltipEl);
  }

  private hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = null;
    }
  }
}
