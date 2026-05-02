import type { EChartsOption } from 'echarts';

export interface ConstellationPoint {
  name: string;
  x: number;
  y: number;
  magnitude: number;
  category?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildRiskConstellationOptions(points: ConstellationPoint[]): EChartsOption {
  if (!points.length) return {} as EChartsOption;

  const categories = [...new Set(points.map(p => p.category || 'Default'))];

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => `<b>${p.data[4]}</b><br/>Magnitude: <b>${p.data[2]}</b>`,
    },
    legend: { data: categories, top: 0 },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } }, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } }, axisLabel: { fontSize: 10 } },
    series: categories.map((cat, i) => ({
      name: cat,
      type: 'scatter' as const,
      data: points.filter(p => (p.category || 'Default') === cat).map(p => [p.x, p.y, p.magnitude, cat, p.name]),
      symbolSize: (val: any) => Math.max(8, val[2] * 4),
      itemStyle: { color: DEFAULT_COLORS[i % DEFAULT_COLORS.length], opacity: 0.8, borderColor: '#fff', borderWidth: 2 },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(var(--color-black-rgb), 0.3)' } },
      label: { show: false },
    })),
  } as EChartsOption;
}
