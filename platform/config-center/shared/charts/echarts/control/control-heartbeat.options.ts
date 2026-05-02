import type { EChartsOption } from 'echarts';

export interface HeartbeatPoint {
  date: string;
  value: number;
  controlId?: string;
}

export function buildControlHeartbeatOptions(points: HeartbeatPoint[]): EChartsOption {
  if (!points.length) return {} as EChartsOption;

  const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `${p.axisValueLabel}<br/>Value: <b>${p.value[1]}</b>${sorted[p.dataIndex]?.controlId ? `<br/>Control: ${sorted[p.dataIndex].controlId}` : ''}`;
      },
    },
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: 'time',
      axisLabel: { fontSize: 11 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } },
    },
    series: [{
      type: 'line',
      data: sorted.map(p => [p.date, p.value]),
      smooth: false,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { width: 2, color: '#22c55e' },
      itemStyle: { color: '#22c55e' },
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#22c55e30' }, { offset: 1, color: '#22c55e05' }] },
      },
    }],
  } as EChartsOption;
}
