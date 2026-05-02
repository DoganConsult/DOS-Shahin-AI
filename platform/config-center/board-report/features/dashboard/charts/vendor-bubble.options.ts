import type { EChartsOption } from 'echarts';
import { grc } from './grc-echarts-theme';

export interface VendorPoint {
  name: string;
  inherent: number;
  residual: number;
  size: number;
}

/**
 * Premium Vendor Risk Bubble — risk-zone quadrants, gradient bubbles,
 * vendor name labels, animated entrance, theme-aware.
 */
export function buildVendorBubbleOptions(points: VendorPoint[]): EChartsOption {
  const t = grc();
  const data = points.map((p) => [p.inherent, p.residual, p.size, p.name]);
  const palette = t.palette;

  return {
    ...t.animation(0),
    tooltip: {
      ...t.tooltip(),
      formatter: (params: Record<string, unknown>) => {
        const p = params as { data: [number, number, number, string] };
        const [x, y, sz, name] = p.data;
        const riskRatio = y > 0 ? ((y / x) * 100).toFixed(0) : '0';
        return [
          `<b>${name}</b>`,
          `Inherent Risk: <b>${x}</b>`,
          `Residual Risk: <b>${y}</b>`,
          `Exposure: <b>${sz}</b>`,
          `Residual / Inherent: <b>${riskRatio}%</b>`,
        ].join('<br/>');
      },
    },
    grid: { left: 56, right: 32, top: 32, bottom: 56, containLabel: false },
    xAxis: {
      type: 'value',
      name: 'Inherent Risk',
      nameLocation: 'middle',
      nameGap: 32,
      nameTextStyle: { color: t.text1, fontSize: 12, fontWeight: 600 },
      axisLabel: t.axisLabel(),
      axisLine: t.axisLine(),
      splitLine: t.splitLine(),
      min: 0,
    },
    yAxis: {
      type: 'value',
      name: 'Residual Risk',
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: { color: t.text1, fontSize: 12, fontWeight: 600 },
      axisLabel: t.axisLabel(),
      axisLine: t.axisLine(),
      splitLine: t.splitLine(),
      min: 0,
    },
    /* diagonal guide line — residual = inherent (perfect pass-through) */
    markLine: undefined,
    series: [
      {
        type: 'scatter',
        data,
        symbolSize: (val: number[]) => Math.max(12, Math.min(50, val[2] * 2.2)),
        itemStyle: {
          color: (p: any) => {
            const idx = (p as { dataIndex: number }).dataIndex;
            return palette[idx % palette.length];
          },
          borderColor: t.bg1,
          borderWidth: 1.5,
          shadowBlur: 8,
          shadowColor: t.alpha(t.primary, 0.3),
        },
        label: {
          show: points.length <= 15,
          position: 'top',
          formatter: (p: any) => `${(p as { data: [number, number, number, string] }).data[3]}`,
          color: t.text1,
          fontSize: 10,
          fontWeight: 500,
          distance: 6,
        },
        emphasis: {
          scale: 1.4,
          itemStyle: {
            borderColor: t.primary,
            borderWidth: 2.5,
            shadowBlur: 14,
            shadowColor: t.alpha(t.primary, 0.55),
          },
          label: { show: true, fontWeight: 700, fontSize: 12, color: t.text0 },
        },
        animationDelay: (idx: number) => idx * 80,
      },
      /* reference diagonal: points above = risk not mitigated */
      {
        type: 'line',
        data: [[0, 0], [100, 100]],
        lineStyle: { color: t.alpha(t.danger, 0.25), width: 1.5, type: 'dashed' },
        symbol: 'none',
        silent: true,
        z: 0,
      },
    ],
  };
}
