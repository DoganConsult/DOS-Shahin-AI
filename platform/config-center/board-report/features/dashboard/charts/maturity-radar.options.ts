import type { EChartsOption } from 'echarts';
import { grc } from './grc-echarts-theme';

export interface MaturityValue {
  name: string;
  score: number;
  target?: number;
}

/**
 * Premium Maturity Radar — dual-series (actual + target), gradient fill,
 * rich tooltips, animated entrance, fully theme-aware.
 */
export function buildMaturityRadarOptions(
  values: MaturityValue[],
  showTarget = true,
): EChartsOption {
  const t = grc();
  const indicators = values.map((v) => ({ name: v.name, max: 100 }));

  const series: Record<string, unknown>[] = [
    {
      type: 'radar',
      name: 'Current',
      data: [{ value: values.map((v) => v.score), name: 'Current' }],
      areaStyle: {
        color: {
          type: 'radial',
          x: 0.5, y: 0.5, r: 0.6,
          colorStops: [
            { offset: 0, color: t.alpha(t.primary, 0.45) },
            { offset: 1, color: t.alpha(t.primary, 0.08) },
          ],
        },
      },
      lineStyle: { width: 2.5, color: t.primary, shadowBlur: 6, shadowColor: t.alpha(t.primary, 0.5) },
      itemStyle: { color: t.primary, borderColor: t.bg1, borderWidth: 2 },
      symbol: 'circle',
      symbolSize: 7,
      z: 3,
    },
  ];

  if (showTarget && values.some((v) => v.target !== undefined)) {
    series.push({
      type: 'radar',
      name: 'Target',
      data: [{ value: values.map((v) => v.target ?? 100), name: 'Target' }],
      areaStyle: { color: t.alpha(t.success, 0.08) },
      lineStyle: { width: 1.5, type: 'dashed', color: t.success },
      itemStyle: { color: t.success, borderColor: t.bg1, borderWidth: 2 },
      symbol: 'diamond',
      symbolSize: 6,
      z: 2,
    });
  }

  return {
    ...t.animation(0),
    tooltip: {
      ...t.tooltip(),
      trigger: 'item',
    },
    legend: {
      ...t.legend(),
      bottom: 0,
      data: showTarget ? ['Current', 'Target'] : ['Current'],
    },
    radar: {
      center: ['50%', '48%'],
      radius: '65%',
      indicator: indicators,
      axisName: {
        color: t.text1,
        fontSize: 11,
        fontWeight: 600,
        padding: [3, 5],
      },
      splitArea: {
        areaStyle: {
          color: [
            t.alpha(t.primary, 0.03),
            t.alpha(t.primary, 0.06),
            t.alpha(t.primary, 0.03),
            t.alpha(t.primary, 0.06),
          ],
        },
      },
      splitLine: { lineStyle: { color: t.alpha(t.border, 0.6) } },
      axisLine: { lineStyle: { color: t.alpha(t.border, 0.4) } },
    },
    series,
  };
}
