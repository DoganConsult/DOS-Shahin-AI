import type { EChartsOption } from 'echarts';

export interface VendorBubblePoint {
  id?: string;
  name: string;
  value: number;
  score?: number;
  x?: number;
  y?: number;
  size?: number;
  category?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildVendorBubbleEnhancedOptions(data: VendorBubblePoint[]): EChartsOption {
  if (!data.length) return {} as EChartsOption;

  const categories = [...new Set(data.map(d => d.category || 'Default'))];

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const pt = data[p.dataIndex];
        return pt ? `<b>${pt.name}</b><br/>Value: <b>${pt.value}</b>${pt.score !== undefined ? `<br/>Score: <b>${pt.score}</b>` : ''}${pt.category ? `<br/>Category: ${pt.category}` : ''}` : '';
      },
    },
    legend: { data: categories, top: 0 },
    grid: { left: 60, right: 20, top: 40, bottom: 50 },
    xAxis: {
      type: 'value',
      name: 'X',
      splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } },
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: 'Score',
      splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } },
      axisLabel: { fontSize: 10 },
    },
    series: categories.map((cat, ci) => ({
      name: cat,
      type: 'scatter' as const,
      data: data.filter(d => (d.category || 'Default') === cat).map(d => [d.x ?? d.value, d.score ?? d.y ?? 0, d.size ?? d.value, d.name]),
      symbolSize: (val: any) => Math.max(10, Math.sqrt(val[2]) * 5),
      itemStyle: {
        color: DEFAULT_COLORS[ci % DEFAULT_COLORS.length],
        opacity: 0.8,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: { show: false },
      emphasis: {
        label: { show: true, formatter: (p: any) => p.data[3], fontSize: 11, fontWeight: 'bold' as const },
        itemStyle: { shadowBlur: 12, shadowColor: 'rgba(var(--color-black-rgb), 0.3)' },
      },
    })),
  } as EChartsOption;
}
