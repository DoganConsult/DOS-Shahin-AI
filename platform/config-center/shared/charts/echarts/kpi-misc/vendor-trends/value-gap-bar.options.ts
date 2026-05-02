import type { EChartsOption } from 'echarts';

export interface ValueGapItem {
  name: string;
  current: number;
  target: number;
}

export function buildValueGapBarOptions(items: ValueGapItem[]): EChartsOption {
  if (!items.length) return {} as EChartsOption;

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = items[params[0]?.dataIndex ?? 0];
        return item ? `<b>${item.name}</b><br/>Current: <b>${item.current}</b><br/>Target: <b>${item.target}</b><br/>Gap: <b>${item.target - item.current}</b>` : '';
      },
    },
    legend: { data: ['Current', 'Target'], top: 0 },
    grid: { left: 120, right: 20, top: 40, bottom: 20 },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } },
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: items.map(i => i.name),
      axisLabel: { fontSize: 11 },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Current',
        type: 'bar' as const,
        data: items.map(i => i.current),
        barMaxWidth: 28,
        itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', fontSize: 11, fontWeight: 'bold' as const },
      },
      {
        name: 'Target',
        type: 'scatter' as const,
        data: items.map(i => i.target),
        symbol: 'rect',
        symbolSize: [3, 28],
        itemStyle: { color: '#22c55e' },
        z: 10,
      },
    ],
  } as EChartsOption;
}
