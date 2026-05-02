/**
 * ECharts Theme Registry — reads CSS custom properties from the DOM
 * so ECharts visualizations match the platform's glassmorphic design system.
 *
 * Follows the same `resolveTheme()` pattern as `d3-charts/theme-bridge.ts`.
 * Registers two themes: `agrc-light` and `agrc-dark`.
 *
 * Requirements: 8.1, 8.3, 8.4, 8.5
 */
import * as echarts from 'echarts';

// ── AgrcEchartsTheme interface ──────────────────────────────────────────────

export interface AgrcEchartsTheme {
  color: string[];
  backgroundColor: string;
  animationDuration: number;
  animationDurationUpdate: number;
  animationEasing: string;
  animationEasingUpdate: string;
  animationDelay: (idx: number) => number;
  animationDelayUpdate: (idx: number) => number;
  textStyle: { color: string; fontFamily: string; fontSize: number };
  title: { textStyle: { color: string; fontSize: number } };
  line: { itemStyle: { borderWidth: number }; lineStyle: { width: number }; symbolSize: number; smooth: boolean };
  radar: { itemStyle: { borderWidth: number }; lineStyle: { width: number } };
  bar: { itemStyle: { barBorderWidth: number; barBorderRadius: number[] } };
  pie: { itemStyle: { borderWidth: number; borderColor: string }; animationType: string; animationEasing: string };
  scatter: { itemStyle: { borderWidth: number } };
  boxplot: { itemStyle: { borderWidth: number } };
  parallel: { itemStyle: { borderWidth: number } };
  sankey: { itemStyle: { borderWidth: number } };
  funnel: { itemStyle: { borderWidth: number } };
  gauge: { itemStyle: { borderWidth: number } };
  graph: { itemStyle: { borderWidth: number }; lineStyle: { width: number } };
  categoryAxis: {
    axisLine: { lineStyle: { color: string } };
    axisTick: { lineStyle: { color: string } };
    axisLabel: { color: string };
  };
  valueAxis: {
    axisLine: { lineStyle: { color: string } };
    splitLine: { lineStyle: { color: string } };
    axisLabel: { color: string };
  };
  tooltip: {
    backgroundColor: string;
    borderColor: string;
    textStyle: { color: string };
    extraCssText: string;
  };
  legend: { textStyle: { color: string } };
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Detects dark mode from the DOM `data-theme` attribute.
 * Used by consumers to auto-detect the current mode when calling
 * `buildEchartsTheme()` without an explicit mode argument.
 */
export function isDarkMode(el?: Element): boolean {
  const root = el || document.documentElement;
  return (
    root.closest('[data-theme="dark"]') !== null ||
    document.documentElement.getAttribute('data-theme') === 'dark'
  );
}

/**
 * Reads a CSS custom property from the computed style of the given element.
 * Falls back to the provided default if the property is empty or missing.
 */
function cssVar(cs: CSSStyleDeclaration, name: string, fallback: string): string {
  return cs.getPropertyValue(name).trim() || fallback;
}

/**
 * Parses a CSS pixel value (e.g. "14px") to a number. Returns fallback on failure.
 */
function parsePx(value: string, fallback: number): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

// ── 12-color GRC semantic palette ──────────────────────────────────────────
//
// 5 severity-mapped colors + 7 categorical colors for multi-series charts.
// Light and dark variants use the Carbon design token values from design-tokens.css.

const LIGHT_PALETTE: string[] = [
  '#da1e28', // critical  — Carbon Red 60
  '#ff832b', // high      — Carbon Orange 40
  '#f1c21b', // medium    — Carbon Yellow 30
  '#24a148', // low       — Carbon Green 50
  '#0f62fe', // info      — Carbon Blue 60
  '#6929c4', // cat-1     — Carbon Purple 70
  '#1192e8', // cat-2     — Carbon Cyan 50
  '#005d5d', // cat-3     — Carbon Teal 70
  '#9f1853', // cat-4     — Carbon Magenta 70
  '#8a3ffc', // cat-5     — Carbon Purple 60
  '#007d79', // cat-6     — Carbon Teal 60
  '#002d9c', // cat-7     — Carbon Blue 80
];

const DARK_PALETTE: string[] = [
  '#fa4d56', // critical  — Carbon Red 50
  '#ff832b', // high      — Carbon Orange 40
  '#f1c21b', // medium    — Carbon Yellow 30
  '#42be65', // low       — Carbon Green 40
  '#4589ff', // info      — Carbon Blue 50
  '#be95ff', // cat-1     — Carbon Purple 40
  '#33b1ff', // cat-2     — Carbon Cyan 40
  '#08bdba', // cat-3     — Carbon Teal 40
  '#ff7eb6', // cat-4     — Carbon Magenta 40
  '#a56eff', // cat-5     — Carbon Purple 50
  '#009d9a', // cat-6     — Carbon Teal 50
  '#78a9ff', // cat-7     — Carbon Blue 40
];

// ── buildEchartsTheme ──────────────────────────────────────────────────────

/**
 * Builds a complete ECharts theme object by reading CSS custom properties
 * from the DOM, following the same `resolveTheme()` pattern used by the
 * D3 theme bridge.
 *
 * @param mode - `'light'` or `'dark'` theme variant
 * @param el   - optional root element to read computed styles from
 */
export function buildEchartsTheme(
  mode: 'light' | 'dark',
  el?: HTMLElement,
): AgrcEchartsTheme {
  const root = el || document.documentElement;
  const cs = getComputedStyle(root);
  const dark = mode === 'dark';

  // Read platform typography tokens
  const fontFamily = cssVar(cs, '--font-family', "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif");
  const fontSizeSm = parsePx(cssVar(cs, '--font-size-sm', '12px'), 12);
  const fontSizeXs = parsePx(cssVar(cs, '--font-size-xs', '11px'), 11);
  const fontSizeLg = parsePx(cssVar(cs, '--font-size-lg', '20px'), 20);

  // Read semantic color tokens
  const textHeading = cssVar(cs, '--text-heading', dark ? '#f4f4f4' : '#161616');
  const textBody = cssVar(cs, '--text-body', dark ? '#c6c6c6' : '#525252');
  const textMuted = cssVar(cs, '--text-muted', dark ? '#8d8d8d' : '#6f6f6f');
  const borderSubtle = cssVar(cs, '--border-subtle', dark ? '#525252' : '#e0e0e0');
  const surface = cssVar(cs, '--surface', dark ? '#262626' : '#ffffff');
  const glassIconBorder = cssVar(cs, '--glass-icon-border', dark ? 'rgba(var(--color-blue-40-rgb), 0.16)' : 'rgba(var(--primary-rgb), 0.14)');

  // Palette
  const palette = dark ? DARK_PALETTE : LIGHT_PALETTE;

  // Glassmorphism tooltip
  const tooltipBg = dark
    ? 'rgba(var(--color-ibm-gray-80-rgb), 0.85)'
    : 'rgba(var(--color-white-rgb), 0.85)';
  const tooltipBorder = dark
    ? 'rgba(var(--color-white-rgb), 0.10)'
    : 'rgba(var(--color-black-rgb), 0.08)';
  const tooltipText = dark ? '#f4f4f4' : '#161616';

  // Axis colors
  const axisLineColor = borderSubtle;
  const splitLineColor = dark ? 'rgba(var(--color-white-rgb), 0.06)' : 'rgba(var(--color-black-rgb), 0.06)';

  return {
    color: palette,
    backgroundColor: surface,

    // ── Global Animation Defaults — enterprise smooth motion ──
    animationDuration: 800,
    animationDurationUpdate: 500,
    animationEasing: 'cubicInOut',
    animationEasingUpdate: 'cubicInOut',
    animationDelay: (idx: number) => idx * 50,
    animationDelayUpdate: (idx: number) => idx * 30,

    textStyle: {
      color: textBody,
      fontFamily,
      fontSize: fontSizeSm,
    },

    title: {
      textStyle: {
        color: textHeading,
        fontSize: fontSizeLg,
      },
    },

    line: {
      itemStyle: { borderWidth: 1 },
      lineStyle: { width: 2 },
      symbolSize: 4,
      smooth: true,
    },

    radar: {
      itemStyle: { borderWidth: 1 },
      lineStyle: { width: 2 },
    },

    bar: {
      itemStyle: {
        barBorderWidth: 0,
        barBorderRadius: [4, 4, 0, 0],
      },
    },

    pie: {
      itemStyle: {
        borderWidth: 2,
        borderColor: surface,
      },
      animationType: 'expansion',
      animationEasing: 'cubicInOut',
    },

    scatter: { itemStyle: { borderWidth: 1 } },
    boxplot: { itemStyle: { borderWidth: 1 } },
    parallel: { itemStyle: { borderWidth: 1 } },
    sankey: { itemStyle: { borderWidth: 0 } },
    funnel: { itemStyle: { borderWidth: 0 } },
    gauge: { itemStyle: { borderWidth: 0 } },

    graph: {
      itemStyle: { borderWidth: 0 },
      lineStyle: { width: 1 },
    },

    categoryAxis: {
      axisLine: { lineStyle: { color: axisLineColor } },
      axisTick: { lineStyle: { color: axisLineColor } },
      axisLabel: { color: textMuted },
    },

    valueAxis: {
      axisLine: { lineStyle: { color: axisLineColor } },
      splitLine: { lineStyle: { color: splitLineColor } },
      axisLabel: { color: textMuted },
    },

    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      textStyle: { color: tooltipText },
      extraCssText: [
        'backdrop-filter: blur(12px)',
        '-webkit-backdrop-filter: blur(12px)',
        `border: 1px solid ${glassIconBorder}`,
        'border-radius: var(--radius)',
        'box-shadow: var(--shadow-lg)',
        `font-family: ${fontFamily}`,
        `font-size: ${fontSizeSm}px`,
      ].join('; '),
    },

    legend: {
      textStyle: { color: textBody },
    },
  };
}

// ── registerEchartsThemes ──────────────────────────────────────────────────

/**
 * Registers `agrc-light` and `agrc-dark` themes with the ECharts global
 * registry. Call once at application bootstrap (e.g. in `main.ts` or
 * `AppComponent.ngOnInit`).
 *
 * @param el - optional root element to read computed styles from
 */
export function registerEchartsThemes(el?: HTMLElement): void {
  echarts.registerTheme('agrc-light', buildEchartsTheme('light', el));
  echarts.registerTheme('agrc-dark', buildEchartsTheme('dark', el));
}
