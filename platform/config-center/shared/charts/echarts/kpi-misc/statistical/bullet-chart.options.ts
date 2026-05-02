import type { EChartsOption } from 'echarts';

export interface BulletItem {
  label: string;
  actual: number;
  target: number;
  ranges: number[];
}

const RANGE_COLORS = ['#fef2f2', '#fef9c3', '#f0fdf4'];

export function buildBulletChartOptions(items: BulletItem[]): EChartsOption {
  if (!items.length) return {} as EChartsOption;

  const series: any[] = [];

  items.forEach((item, idx) => {
    const sortedRanges = [...item.ranges].sort((a, b) => b - a);
    sortedRanges.forEach((range, ri) => {
      series.push({
        type: 'bar',
        barGap: '-100%',
        data: items.map((it, ii) => ii === idx ? range : 0),
        itemStyle: { color: RANGE_COLORS[ri % RANGE_COLORS.length] },
        silent: true,
        barWidth: 32,
        z: ri,
      });
    });
  });

  series.push({
    type: 'bar',
    data: items.map(it => it.actual),
    barWidth: 16,
    itemStyle: { color: '#3b82f6', borderRadius: [0, 2, 2, 0] },
    label: { show: true, position: 'right' as const, fontSize: 11, fontWeight: 'bold' as const },
    z: 10,
  });

  series.push({
    type: 'scatter',
    data: items.map(it => it.target),
    symbol: 'rect',
    symbolSize: [3, 28],
    itemStyle: { color: '#ef4444' },
    z: 20,
  });

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = items[params[0]?.dataIndex ?? 0];
        return item ? `<b>${item.label}</b><br/>Actual: <b>${item.actual}</b><br/>Target: <b>${item.target}</b>` : '';
      },
    },
    grid: { left: 120, right: 60, top: 20, bottom: 20 },
    xAxis: { type: 'value', splitLine: { show: false } },
    yAxis: {
      type: 'category',
      data: items.map(it => it.label),
      axisLabel: { fontSize: 11 },
      axisTick: { show: false },
    },
    series,
  } as EChartsOption;
}
