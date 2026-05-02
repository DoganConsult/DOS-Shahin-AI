/**
 * D3 Theme Bridge — reads CSS custom properties from the DOM
 * so D3-rendered SVG elements match the platform's glassmorphic design system.
 */
import * as d3 from 'd3';

export interface D3Theme {
  textHeading: string;
  textBody: string;
  textMuted: string;
  borderSubtle: string;
  surface: string;
  primary: string;
  primaryLight: string;
  success: string;
  warning: string;
  error: string;
  glassIconBg: string;
  glassIconBorder: string;
  tooltipBg: string;
  tooltipText: string;
  fontBlack: string;
  fontBold: string;
  radiusSm: string;
  radius: string;

  // Premium additions
  shadowPremiumGlow: string;
  gradientWidgetAccent: string;
  glassWidgetBg: string;
  brandAccent: string;
  brandAccentLight: string;
}


export function resolveTheme(el?: HTMLElement): D3Theme {
  const root = el || document.documentElement;
  const cs = getComputedStyle(root);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;

  return {
    textHeading: v('--text-heading', '#0c4a6e'),
    textBody: v('--text-body', '#334155'),
    textMuted: v('--text-muted', '#5e6e80'),
    borderSubtle: v('--border-subtle', 'var(--border-subtle)'),
    surface: v('--surface', '#ffffff'),
    primary: v('--primary', '#0ea5e9'),
    primaryLight: v('--primary-light', '#38bdf8'),
    success: v('--success', 'var(--success)'),
    warning: v('--warning', 'var(--warning)'),
    error: v('--error', 'var(--error)'),
    glassIconBg: v('--glass-icon-bg', 'rgba(14,165,233,0.08)'),
    glassIconBorder: v('--glass-icon-border', 'rgba(14,165,233,0.18)'),
    tooltipBg: isDark(root) ? 'rgba(241,245,249,0.95)' : 'rgba(15,23,42,0.92)',
    tooltipText: isDark(root) ? 'var(--text-heading)' : '#ffffff',
    fontBlack: v('--font-black', '800'),
    fontBold: v('--font-bold', '700'),
    radiusSm: v('--radius-sm', '8px'),
    radius: v('--radius', '12px'),

    // Premium additions
    shadowPremiumGlow: v('--shadow-premium-glow', '0 0 24px rgba(56, 189, 248, 0.18), 0 0 8px rgba(14, 165, 233, 0.12)'),
    gradientWidgetAccent: v('--gradient-widget-accent', 'linear-gradient(90deg, #0ea5e9, #38bdf8)'),
    glassWidgetBg: v('--glass-widget-bg', 'rgba(255, 255, 255, 0.72)'),
    brandAccent: v('--brand-accent', '#0369a1'),
    brandAccentLight: v('--brand-accent-light', '#38bdf8'),
  };
}

function isDark(el: Element): boolean {
  return el.closest('[data-theme="dark"]') !== null
    || document.documentElement.getAttribute('data-theme') === 'dark';
}

/**
 * Observes `data-theme` attribute changes on `document.documentElement` and
 * invokes the callback when the theme changes. Returns a cleanup function
 * that disconnects the observer — call it in `ngOnDestroy`.
 *
 * Usage in a D3 chart component:
 *   private disposeThemeObserver?: () => void;
 *   ngAfterViewInit() { this.disposeThemeObserver = observeThemeChange(() => this.render()); }
 *   ngOnDestroy()     { this.disposeThemeObserver?.(); }
 */
export function observeThemeChange(callback: () => void): () => void {
  if (typeof MutationObserver === 'undefined') return () => {};

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'data-theme') {
        callback();
        break;
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  return () => observer.disconnect();
}

/**
 * Creates a premium glass-styled tooltip div inside the given container.
 * All D3 chart components should use this for consistent tooltip styling.
 *
 * Usage:
 *   const tooltip = createPremiumTooltip(container, theme);
 *   // show: tooltip.html('...').style('opacity', '1').style('left', ...).style('top', ...);
 *   // hide: tooltip.style('opacity', '0');
 */
export function createPremiumTooltip(
  container: HTMLElement,
  theme: D3Theme,
): d3.Selection<HTMLDivElement, any, null, undefined> {
  return d3.select(container).append('div')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('background', theme.tooltipBg)
    .style('color', theme.tooltipText)
    .style('padding', '6px 12px')
    .style('border-radius', theme.radiusSm)
    .style('font-size', '12px')
    .style('font-weight', theme.fontBold)
    .style('box-shadow', '0 8px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)')
    .style('backdrop-filter', 'blur(12px)')
    .style('-webkit-backdrop-filter', 'blur(12px)')
    .style('border', `1px solid ${theme.glassIconBorder}`)
    .style('opacity', '0')
    .style('transition', 'opacity 0.15s')
    .style('white-space', 'nowrap')
    .style('z-index', '10');
}
