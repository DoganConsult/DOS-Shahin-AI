import type { EChartsOption } from 'echarts';

export interface BoxplotCategory {
  name: string;
  data: [number, number, number, number, number];
}

export function buildControlEffectivenessBoxplotOptions(categories: BoxplotCategory[]): EChartsOption {
  if (!categories.length) return {} as EChartsOption;

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const [min, q1, median, q3, max] = p.data;
        return `<b>${p.name}</b><br/>Min: ${min} | Q1: ${q1}<br/>Median: <b>${median}</b><br/>Q3: ${q3} | Max: ${max}`;
      },
    },
    grid: { left: 60, right: 20, top: 20, bottom: 50 },
    xAxis: {
      type: 'category',
      data: categories.map(c => c.name),
      axisLabel: { fontSize: 11, rotate: 15 },
      boundaryGap: true,
      splitArea: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } },
    },
    series: [{
      type: 'boxplot',
      data: categories.map(c => c.data),
      itemStyle: { color: '#3b82f620', borderColor: '#3b82f6', borderWidth: 2 },
      boxWidth: ['40%', '60%'],
      emphasis: { itemStyle: { borderColor: '#1d4ed8', shadowBlur: 8, shadowColor: 'rgba(var(--module-accent-blue-rgb), 0.3)' } },
    }],
  } as EChartsOption;
}
