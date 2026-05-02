/**
 * GRC ECharts Theme Bridge
 * ────────────────────────
 * Reads CSS custom properties at runtime so every chart stays
 * in sync with the active light / dark / brand theme.
 *
 * Usage:
 *   import { grc } from './grc-echarts-theme';
 *   const t = grc();            // snapshot of current CSS vars
 *   color: t.primary            // resolved hex/rgb value
 *   ...t.tooltip()              // pre-built tooltip config
 */

/* ── colour helpers ─────────────────────────────────────── */

function css(prop: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(prop)
      .trim() || fallback
  );
}

/** Convert any CSS colour value to an rgba() string with custom alpha. */
function alpha(color: string, a: number): string {
  // If already rgba/rgb, replace or append alpha
  if (color.startsWith('rgba')) return color.replace(/,\s*[\d.]+\)/, `, ${a})`);
  if (color.startsWith('rgb'))  return color.replace(')', `, ${a})`).replace('rgb', 'rgba');
  // hex
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/* ── theme snapshot factory ─────────────────────────────── */

export interface GrcTheme {
  /* brand & semantic */
  primary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;

  /* text */
  text0: string;
  text1: string;
  text2: string;

  /* backgrounds */
  bg0: string;
  bg1: string;
  bg2: string;
  border: string;

  /* sequential palette for multi-series */
  palette: string[];
  /** Status-ordered palette: success → warning → danger */
  statusPalette: string[];

  /* helpers */
  alpha: (color: string, a: number) => string;
  tooltip: () => Record<string, unknown>;
  axisLabel: () => Record<string, unknown>;
  axisLine: () => Record<string, unknown>;
  splitLine: () => Record<string, unknown>;
  splitArea: () => Record<string, unknown>;
  legend: () => Record<string, unknown>;
  /** Standard animation config for staggered entrance */
  animation: (stagger?: number) => Record<string, unknown>;
  /** ECharts linear-gradient shorthand (top-to-bottom by default) */
  linearGradient: (c0: string, c1: string) => { type: 'linear'; x: number; y: number; x2: number; y2: number; colorStops: { offset: number; color: string }[] };
}

export function grc(): GrcTheme {
  /* Carbon Design System fallbacks (White theme) */
  const primary = css('--primary', '#0f62fe');
  const success = css('--success', '#24a148');
  const warning = css('--warning', '#f1c21b');
  const danger  = css('--danger',  '#da1e28');
  const info    = css('--info',    '#0f62fe');

  const text0  = css('--text-0', '#161616');
  const text1  = css('--text-1', '#525252');
  const text2  = css('--text-2', '#6f6f6f');
  const bg0    = css('--bg-0',   '#ffffff');
  const bg1    = css('--bg-1',   '#f4f4f4');
  const bg2    = css('--bg-2',   '#e8e8e8');
  const border = css('--border', '#e0e0e0');

  const palette = [primary, info, success, warning, danger, '#a855f7', '#ec4899', '#14b8a6'];
  const statusPalette = [success, warning, danger];

  return {
    primary, success, warning, danger, info,
    text0, text1, text2, bg0, bg1, bg2, border,
    palette, statusPalette,
    alpha,

    tooltip: () => ({
      backgroundColor: alpha(bg1, 0.96),
      borderColor: alpha(border, 0.6),
      borderWidth: 1,
      textStyle: { color: text0, fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif' },
      extraCssText: 'backdrop-filter:blur(12px);border-radius:var(--radius-md);box-shadow: var(--shadow-xl);',
    }),

    axisLabel: () => ({
      color: text1,
      fontSize: 11,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),

    axisLine: () => ({
      lineStyle: { color: alpha(border, 0.5) },
    }),

    splitLine: () => ({
      lineStyle: { color: alpha(border, 0.25), type: 'dashed' as const },
    }),

    splitArea: () => ({
      areaStyle: { color: [alpha(primary, 0.03), alpha(primary, 0.07)] },
    }),

    legend: () => ({
      textStyle: { color: text1, fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 16,
    }),

    animation: (stagger = 60) => ({
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut' as const,
      animationDelay: (idx: number) => idx * stagger,
    }),

    linearGradient: (c0: string, c1: string) => ({
      type: 'linear' as const,
      x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        { offset: 0, color: c0 },
        { offset: 1, color: c1 },
      ],
    }),
  };
}
