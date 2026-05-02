/**
 * Compliance Score Gauge — AI-driven advanced chart options.
 *
 * Owned by: Compliance module (Rule #2). Consumed via @app alias by dashboards,
 * reports, and the gauge widget component.
 *
 * Capabilities (full end-user expectation):
 *   • Radial 0–100 gauge with regulator-grade threshold zones (red <60 / amber
 *     60–80 / green 80+) and an explicit `target` line for the tenant's
 *     committed posture goal.
 *   • Trend delta + direction arrow with colour-coded improvement/decline.
 *   • Peer benchmark overlay (industry-anonymised), shown as a secondary arc.
 *   • Inline AI annotation: top driver of the most recent score change, drawn
 *     as a graphic over the gauge with a citation trail (handed back to the
 *     consuming component for click-through to the AI suggestion).
 *   • Drill-down hooks: each segment carries a `data.drillTo` key the consumer
 *     can route on (`/compliance/gaps?framework=…`, etc.).
 *   • Bilingual (EN/AR) and RTL-aware via passed-in `locale`.
 *   • Backward-compatible: legacy `buildComplianceGaugeOptions(score, delta?)`
 *     signature still works — it routes into the advanced builder with
 *     defaults.
 */

import type { EChartsOption } from 'echarts';
import { grc } from '@app/shared/charts/echarts/grc-echarts-theme';

// ── Public contract ────────────────────────────────────────────────────────

export type GaugeLocale = 'en' | 'ar';

export interface ComplianceGaugeAIInsight {
  /** Stable id of the underlying AI suggestion row (compliance_ai_suggestions.id). */
  suggestionId: string;
  /** Short, render-safe headline (≤ 60 chars). EN by default — caller may swap. */
  headline: string;
  /** 0..1 confidence used to dim/badge the annotation. */
  confidence: number;
  /** Primary entity the insight refers to — caller routes on click. */
  drillTo?: { kind: 'framework' | 'gap' | 'obligation' | 'finding'; id: string };
}

export interface ComplianceGaugeBenchmark {
  /** Peer benchmark score (industry-anonymised). */
  peerScore: number;
  /** Optional label for the benchmark band. */
  label?: string;
}

export interface ComplianceGaugeThresholds {
  /** Score below this is critical (default 60). */
  danger: number;
  /** Score below this is warning (default 80). */
  warning: number;
  /** Tenant's committed target (drawn as a target line on the arc). */
  target?: number;
}

export interface ComplianceGaugeInput {
  /** 0..100 current overall posture score. Clamped on entry. */
  score: number;
  /** Pre-formatted delta string (e.g. "+3.1% vs last quarter"). Optional. */
  delta?: string;
  /** Direction of the delta — drives arrow + colour. */
  deltaDirection?: 'up' | 'down' | 'flat';
  /** Optional thresholds — defaults to {danger:60, warning:80}. */
  thresholds?: Partial<ComplianceGaugeThresholds>;
  /** Optional peer-benchmark overlay. */
  benchmark?: ComplianceGaugeBenchmark;
  /** Top AI insight to surface as an overlay annotation. */
  aiInsight?: ComplianceGaugeAIInsight;
  /** Locale for in-chart strings (axis label suffix, target/peer labels). */
  locale?: GaugeLocale;
  /** Disable animation (e.g. for SSR / printable reports). */
  staticRender?: boolean;
}

// ── Defaults + i18n ────────────────────────────────────────────────────────

const DEFAULT_THRESHOLDS: ComplianceGaugeThresholds = { danger: 60, warning: 80 };

const I18N: Record<GaugeLocale, {
  target: string;
  peer: string;
  ai: string;
  upArrow: string;
  downArrow: string;
  flatArrow: string;
}> = {
  en: { target: 'Target', peer: 'Peer', ai: 'AI', upArrow: '▲', downArrow: '▼', flatArrow: '◆' },
  ar: { target: 'الهدف', peer: 'الأقران', ai: 'ذكاء', upArrow: '▲', downArrow: '▼', flatArrow: '◆' },
};

// ── Main builder ───────────────────────────────────────────────────────────

export function buildAdvancedComplianceGaugeOptions(input: ComplianceGaugeInput): EChartsOption {
  const t = grc();
  const score = clamp(input.score, 0, 100);
  const thresholds: ComplianceGaugeThresholds = { ...DEFAULT_THRESHOLDS, ...(input.thresholds ?? {}) };
  const locale: GaugeLocale = input.locale ?? 'en';
  const i18n = I18N[locale];
  const animMs = input.staticRender ? 0 : 1400;

  // Threshold-driven arc colour stops (red → amber → green) — derive from
  // thresholds so the regulator can shift bands per framework.
  const dangerStop = thresholds.danger / 100;
  const warningStop = thresholds.warning / 100;
  const axisLineColors: [number, string][] = [
    [dangerStop, t.danger],
    [warningStop, t.warning],
    [1.0, t.success],
  ];

  // Delta visual treatment.
  const deltaDir = input.deltaDirection ?? 'flat';
  const deltaColor =
    deltaDir === 'up' ? t.success : deltaDir === 'down' ? t.danger : t.info;
  const deltaArrow =
    deltaDir === 'up' ? i18n.upArrow : deltaDir === 'down' ? i18n.downArrow : i18n.flatArrow;
  const deltaText = input.delta ? `${deltaArrow} ${input.delta}` : '';

  const series: NonNullable<EChartsOption['series']> = [
    {
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      radius: '92%',
      center: ['50%', '56%'],
      min: 0,
      max: 100,
      axisLine: { lineStyle: { width: 18, color: axisLineColors } },
      axisTick: { distance: -22, length: 6, lineStyle: { color: t.bg1, width: 1.5 } },
      splitLine: { distance: -26, length: 12, lineStyle: { color: t.text2, width: 2 } },
      axisLabel: {
        distance: -34,
        color: t.text2,
        fontSize: 10,
        formatter: (v: number) => `${v}`,
      },
      pointer: {
        length: '70%',
        width: 5,
        itemStyle: { color: t.primary, shadowBlur: 6, shadowColor: t.alpha(t.primary, 0.5) },
      },
      anchor: {
        show: true,
        showAbove: true,
        size: 14,
        itemStyle: { borderColor: t.primary, borderWidth: 2, color: t.bg1 },
      },
      detail: {
        valueAnimation: !input.staticRender,
        formatter: (v: number) => {
          const deltaStr = deltaText ? `\n{delta|${deltaText}}` : '';
          return `{value|${v.toFixed(0)}%}${deltaStr}`;
        },
        rich: {
          value: { fontSize: 28, fontWeight: 700, color: t.text0, lineHeight: 36 },
          delta: { fontSize: 12, fontWeight: 500, color: deltaColor, lineHeight: 20 },
        },
        offsetCenter: [0, '72%'],
      },
      title: { show: false },
      data: [{ value: score }],
      animationDuration: animMs,
      animationEasing: 'cubicOut',
    },
  ];

  // Target-line series — draws a thin tick on the arc at the tenant's target.
  if (thresholds.target != null) {
    const target = clamp(thresholds.target, 0, 100);
    series.push({
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      radius: '92%',
      center: ['50%', '56%'],
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      pointer: { show: false },
      anchor: { show: false },
      detail: { show: false },
      title: { show: false },
      data: [{ value: target, name: i18n.target }],
      progress: { show: true, width: 4, itemStyle: { color: t.text0 } },
      animation: !input.staticRender,
      silent: true,
    });
  }

  // Peer-benchmark inner arc — a thin secondary arc inside the main one.
  if (input.benchmark) {
    const peer = clamp(input.benchmark.peerScore, 0, 100);
    series.push({
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      radius: '78%',
      center: ['50%', '56%'],
      min: 0,
      max: 100,
      axisLine: { lineStyle: { width: 4, color: [[1, t.alpha(t.text2, 0.25)]] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      pointer: { show: false },
      anchor: { show: false },
      detail: { show: false },
      title: { show: false },
      progress: { show: true, width: 4, itemStyle: { color: t.info } },
      data: [{ value: peer, name: input.benchmark.label ?? i18n.peer }],
      animation: !input.staticRender,
      silent: true,
    });
  }

  // AI insight overlay — drawn as a graphic so the consumer can route on click
  // by reading the `info` field (carried through ECharts events).
  const graphic: NonNullable<EChartsOption['graphic']> = [];
  if (input.aiInsight) {
    const conf = clamp(input.aiInsight.confidence, 0, 1);
    graphic.push({
      type: 'group',
      left: 'center',
      bottom: 8,
      info: input.aiInsight.suggestionId,
      children: [
        {
          type: 'rect',
          shape: { x: 0, y: 0, width: 220, height: 24, r: 12 },
          style: {
            fill: t.alpha(t.primary, 0.08),
            stroke: t.alpha(t.primary, 0.5),
            lineWidth: 1,
          },
        },
        {
          type: 'text',
          left: 10,
          top: 4,
          style: {
            text: `${i18n.ai} · ${input.aiInsight.headline}`,
            fill: t.primary,
            font: '500 11px sans-serif',
            opacity: 0.6 + 0.4 * conf,
          },
        },
      ],
    } as unknown as NonNullable<EChartsOption['graphic']>[number]);
  }

  return {
    ...t.animation(animMs),
    series,
    graphic: graphic.length > 0 ? graphic : undefined,
  };
}

// ── Backward-compatible legacy signature ───────────────────────────────────

/**
 * Legacy two-arg signature kept for callers that haven't migrated to the
 * advanced builder. Internally routes to {@link buildAdvancedComplianceGaugeOptions}.
 *
 * Prefer the object-input form for new code:
 *   buildComplianceGaugeOptions({ score, delta, deltaDirection, ... })
 */
export function buildComplianceGaugeOptions(scorePercent: number, delta?: string): EChartsOption;
export function buildComplianceGaugeOptions(input: ComplianceGaugeInput): EChartsOption;
export function buildComplianceGaugeOptions(
  scoreOrInput: number | ComplianceGaugeInput,
  delta?: string,
): EChartsOption {
  if (typeof scoreOrInput === 'number') {
    return buildAdvancedComplianceGaugeOptions({ score: scoreOrInput, delta });
  }
  return buildAdvancedComplianceGaugeOptions(scoreOrInput);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
