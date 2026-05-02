import type { EChartsOption } from 'echarts';
import { grc } from './grc-echarts-theme';

export interface HeatmapCell {
  impact: number;
  likelihood: number;
  count: number;
  weightedScore?: number;
}

/**
 * Premium 5×5 Risk Heatmap — theme-aware, animated, with cell labels and
 * graduated color stops (green → amber → red) representing risk severity.
 */
export function buildRiskHeatmapOptions(
  cells: HeatmapCell[],
  mode: 'count' | 'weighted' = 'count',
): EChartsOption {
  const t = grc();
  const data = cells.map((c) => [
    c.impact - 1,
    c.likelihood - 1,
    mode === 'weighted' ? (c.weightedScore ?? c.count) : c.count,
  ]);
  const impactLabels  = ['Negligible', 'Minor', 'Moderate', 'Major', 'Critical'];
  const likeLabels    = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
  const maxVal = Math.max(1, ...data.map((d) => d[2]));

  return {
    ...t.animation(0),
    tooltip: {
      ...t.tooltip(),
      formatter: (p: any) => {
        const [i, l, v] = (p as { data: [number, number, number] }).data;
        const severity = v / maxVal;
        const tag = severity > 0.7 ? '🔴 Critical' : severity > 0.4 ? '🟡 Medium' : '🟢 Low';
        return [
          `<b>${impactLabels[i]} × ${likeLabels[l]}</b>`,
          `${mode === 'weighted' ? 'Weighted' : 'Count'}: <b>${v}</b>`,
          `Risk Level: ${tag}`,
        ].join('<br/>');
      },
    },
    grid: { left: 90, right: 24, top: 16, bottom: 64, containLabel: false },
    xAxis: {
      type: 'category',
      name: 'Impact',
      nameLocation: 'middle',
      nameGap: 32,
      nameTextStyle: { color: t.text1, fontSize: 12, fontWeight: 600 },
      data: impactLabels,
      axisTick: { show: false },
      axisLine: t.axisLine(),
      axisLabel: { ...t.axisLabel(), rotate: 30 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'category',
      name: 'Likelihood',
      nameLocation: 'middle',
      nameGap: 70,
      nameTextStyle: { color: t.text1, fontSize: 12, fontWeight: 600 },
      data: likeLabels,
      axisTick: { show: false },
      axisLine: t.axisLine(),
      axisLabel: t.axisLabel(),
      splitLine: { show: false },
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 14,
      itemHeight: 120,
      inRange: { color: [t.alpha(t.success, 0.35), t.alpha(t.warning, 0.7), t.alpha(t.danger, 0.9)] },
      textStyle: { color: t.text2, fontSize: 11 },
      borderColor: 'transparent',
    },
    series: [
      {
        type: 'heatmap',
        data,
        label: {
          show: true,
          color: t.text0,
          fontWeight: 700,
          fontSize: 13,
          formatter: (p: any) => `${(p as { data: number[] }).data[2]}`,
        },
        itemStyle: {
          borderColor: t.bg1,
          borderWidth: 2,
          borderRadius: 4,
        },
        emphasis: {
          itemStyle: {
            borderColor: t.primary,
            borderWidth: 3,
            shadowBlur: 12,
            shadowColor: t.alpha(t.primary, 0.5),
          },
        },
        animationDelay: (idx: number) => idx * 40,
      },
    ],
  };
}
