import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildEchartsTheme,
  registerEchartsThemes,
  isDarkMode,
  AgrcEchartsTheme,
} from './echart-theme';
import * as echarts from 'echarts';

/**
 * Unit tests for ECharts theme registry.
 *
 * Validates:
 *  - 12-color GRC semantic palette (Req 8.1, 8.3)
 *  - Glassmorphism tooltip styling with backdrop-filter: blur (Req 8.4)
 *  - Typography token usage from CSS custom properties (Req 8.5)
 *  - agrc-light and agrc-dark theme registration (Req 8.1)
 */

// ── Mock echarts.registerTheme ──────────────────────────────────────────────

vi.mock('echarts', () => ({
  registerTheme: vi.fn(),
}));

// ── DOM mock helpers ────────────────────────────────────────────────────────

/** CSS custom property map for light mode */
const LIGHT_CSS_VARS: Record<string, string> = {
  '--font-family': "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
  '--font-size-sm': '12px',
  '--font-size-xs': '11px',
  '--font-size-lg': '20px',
  '--text-heading': '#161616',
  '--text-body': '#525252',
  '--text-muted': '#6f6f6f',
  '--border-subtle': '#e0e0e0',
  '--surface': '#ffffff',
  '--glass-icon-border': 'rgba(var(--primary-rgb), 0.14)',
};

/** CSS custom property map for dark mode */
const DARK_CSS_VARS: Record<string, string> = {
  '--font-family': "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
  '--font-size-sm': '14px',
  '--font-size-xs': '11px',
  '--font-size-lg': '22px',
  '--text-heading': '#f4f4f4',
  '--text-body': '#c6c6c6',
  '--text-muted': '#8d8d8d',
  '--border-subtle': '#525252',
  '--surface': '#262626',
  '--glass-icon-border': 'rgba(var(--color-blue-40-rgb), 0.16)',
};

/**
 * Creates a mock HTMLElement with a mock CSSStyleDeclaration that returns
 * values from the given CSS variable map.
 */
function createMockElement(vars: Record<string, string>): HTMLElement {
  const mockStyle = {
    getPropertyValue: (name: string) => vars[name] ?? '',
  } as unknown as CSSStyleDeclaration;

  // Override global getComputedStyle to return our mock
  vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue(mockStyle);

  return {
    closest: () => null,
    getAttribute: () => null,
  } as unknown as HTMLElement;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('echart-theme', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Re-mock echarts after restoreAllMocks
    vi.spyOn(echarts, 'registerTheme').mockImplementation(() => {});
  });

  // ── 12-color palette (Req 8.1, 8.3) ────────────────────────────────────

  describe('12-color GRC semantic palette', () => {
    it('light theme has exactly 12 colors', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.color).toHaveLength(12);
    });

    it('dark theme has exactly 12 colors', () => {
      const el = createMockElement(DARK_CSS_VARS);
      const theme = buildEchartsTheme('dark', el);
      expect(theme.color).toHaveLength(12);
    });

    it('light palette starts with severity colors: critical (red), high (orange), medium (amber), low (green), info (blue)', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      const [critical, high, medium, low, info] = theme.color;

      // Critical = red
      expect(critical.toLowerCase()).toBe('#da1e28');
      // High = orange
      expect(high.toLowerCase()).toBe('#ff832b');
      // Medium = amber/yellow
      expect(medium.toLowerCase()).toBe('#f1c21b');
      // Low = green
      expect(low.toLowerCase()).toBe('#24a148');
      // Info = blue
      expect(info.toLowerCase()).toBe('#0f62fe');
    });

    it('dark palette starts with severity colors adjusted for dark mode', () => {
      const el = createMockElement(DARK_CSS_VARS);
      const theme = buildEchartsTheme('dark', el);
      const [critical, , , low, info] = theme.color;

      // Dark critical is lighter red
      expect(critical.toLowerCase()).toBe('#fa4d56');
      // Dark low is lighter green
      expect(low.toLowerCase()).toBe('#42be65');
      // Dark info is lighter blue
      expect(info.toLowerCase()).toBe('#4589ff');
    });

    it('light and dark palettes differ', () => {
      const elLight = createMockElement(LIGHT_CSS_VARS);
      const light = buildEchartsTheme('light', elLight);
      const elDark = createMockElement(DARK_CSS_VARS);
      const dark = buildEchartsTheme('dark', elDark);

      expect(light.color).not.toEqual(dark.color);
    });

    it('all palette entries are valid hex color strings', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      for (const c of theme.color) {
        expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  // ── Glassmorphism tooltip (Req 8.4) ─────────────────────────────────────

  describe('glassmorphism tooltip styling', () => {
    it('tooltip extraCssText contains backdrop-filter: blur', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.tooltip.extraCssText).toContain('backdrop-filter: blur');
    });

    it('tooltip extraCssText contains -webkit-backdrop-filter: blur for Safari', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.tooltip.extraCssText).toContain('-webkit-backdrop-filter: blur');
    });

    it('tooltip has translucent background (rgba)', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.tooltip.backgroundColor).toMatch(/^rgba\(/);
    });

    it('dark tooltip has translucent background (rgba)', () => {
      const el = createMockElement(DARK_CSS_VARS);
      const theme = buildEchartsTheme('dark', el);
      expect(theme.tooltip.backgroundColor).toMatch(/^rgba\(/);
    });

    it('tooltip has border-radius for glass aesthetic', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.tooltip.extraCssText).toContain('border-radius');
    });

    it('tooltip has box-shadow for depth', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.tooltip.extraCssText).toContain('box-shadow');
    });
  });

  // ── Typography tokens (Req 8.5) ─────────────────────────────────────────

  describe('typography token usage', () => {
    it('textStyle.fontFamily reads --font-family token', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.textStyle.fontFamily).toBe(LIGHT_CSS_VARS['--font-family']);
    });

    it('textStyle.fontSize reads --font-size-sm token', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.textStyle.fontSize).toBe(12); // parsed from '12px'
    });

    it('dark theme reads different font-size-sm when token differs', () => {
      const el = createMockElement(DARK_CSS_VARS);
      const theme = buildEchartsTheme('dark', el);
      expect(theme.textStyle.fontSize).toBe(14); // parsed from '14px'
    });

    it('tooltip extraCssText includes font-family from token', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.tooltip.extraCssText).toContain('font-family');
      expect(theme.tooltip.extraCssText).toContain('IBM Plex Sans');
    });

    it('tooltip extraCssText includes font-size from token', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.tooltip.extraCssText).toContain('font-size: var(--font-size-sm)');
    });

    it('axis labels use --text-muted token', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.categoryAxis.axisLabel.color).toBe('#6f6f6f');
      expect(theme.valueAxis.axisLabel.color).toBe('#6f6f6f');
    });

    it('legend text uses --text-body token', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.legend.textStyle.color).toBe('#525252');
    });

    it('title uses --text-heading and --font-size-lg tokens', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      const theme = buildEchartsTheme('light', el);
      expect(theme.title.textStyle.color).toBe('#161616');
      expect(theme.title.textStyle.fontSize).toBe(20);
    });
  });

  // ── agrc-light and agrc-dark registration (Req 8.1) ────────────────────

  describe('registerEchartsThemes', () => {
    beforeEach(() => {
      vi.mocked(echarts.registerTheme).mockClear();
    });

    it('registers agrc-light theme', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      registerEchartsThemes(el);
      expect(echarts.registerTheme).toHaveBeenCalledWith(
        'agrc-light',
        expect.objectContaining({ color: expect.any(Array) }),
      );
    });

    it('registers agrc-dark theme', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      registerEchartsThemes(el);
      expect(echarts.registerTheme).toHaveBeenCalledWith(
        'agrc-dark',
        expect.objectContaining({ color: expect.any(Array) }),
      );
    });

    it('registers exactly two themes', () => {
      const el = createMockElement(LIGHT_CSS_VARS);
      registerEchartsThemes(el);
      expect(echarts.registerTheme).toHaveBeenCalledTimes(2);
    });
  });

  // ── isDarkMode helper ─────────────────────────────────────────────────

  describe('isDarkMode', () => {
    it('returns false when no data-theme attribute is set', () => {
      const el = {
        closest: () => null,
      } as unknown as Element;
      // Mock document.documentElement.getAttribute
      const origGetAttr = document.documentElement.getAttribute;
      document.documentElement.getAttribute = vi.fn().mockReturnValue(null);
      expect(isDarkMode(el)).toBe(false);
      document.documentElement.getAttribute = origGetAttr;
    });

    it('returns true when element has data-theme="dark" ancestor', () => {
      const el = {
        closest: (selector: string) =>
          selector === '[data-theme="dark"]' ? {} : null,
      } as unknown as Element;
      expect(isDarkMode(el)).toBe(true);
    });
  });

  // ── Fallback behavior ─────────────────────────────────────────────────

  describe('CSS variable fallbacks', () => {
    it('uses fallback values when CSS variables are empty', () => {
      const el = createMockElement({}); // empty — all vars return ''
      const theme = buildEchartsTheme('light', el);

      // Should still produce a valid theme with fallback values
      expect(theme.color).toHaveLength(12);
      expect(theme.textStyle.fontFamily).toContain('IBM Plex Sans');
      expect(theme.textStyle.fontSize).toBe(12);
      expect(theme.tooltip.extraCssText).toContain('backdrop-filter: blur');
    });
  });
});
