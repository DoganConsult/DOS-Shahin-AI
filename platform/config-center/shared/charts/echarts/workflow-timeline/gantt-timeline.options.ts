import type { EChartsOption } from 'echarts';

export interface GanttBar {
  name: string;
  start: string;
  end: string;
  progress?: number;
  category?: string;
  color?: string;
}

const DEFAULT_GANTT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export function buildGanttTimelineOptions(
  bars: GanttBar[],
  _theme?: any
): EChartsOption {
  if (!bars.length) return {} as EChartsOption;

  const categories = bars.map(b => b.name);
  const minDate = Math.min(...bars.map(b => new Date(b.start).getTime()));
  const maxDate = Math.max(...bars.map(b => new Date(b.end).getTime()));

  const renderItems = bars.map((b, i) => ({
    value: [i, new Date(b.start).getTime(), new Date(b.end).getTime(), b.progress ?? 100],
    itemStyle: { color: b.color || DEFAULT_GANTT_COLORS[i % DEFAULT_GANTT_COLORS.length] },
  }));

  return {
    tooltip: {
      formatter: (p: any) => {
        const [idx, start, end, progress] = p.data.value;
        const name = categories[idx];
        const s = new Date(start).toLocaleDateString();
        const e = new Date(end).toLocaleDateString();
        return `<b>${name}</b><br/>${s} → ${e}<br/>Progress: <b>${progress}%</b>`;
      },
    },
    grid: { left: 140, right: 30, top: 20, bottom: 40 },
    xAxis: {
      type: 'time',
      min: minDate,
      max: maxDate,
      axisLabel: { fontSize: 10 },
      splitLine: { show: true, lineStyle: { type: 'dashed' as const, color: '#f0f0f0' } },
    },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
      axisLabel: { fontSize: 11, width: 120, overflow: 'truncate' as const },
      axisTick: { show: false },
    },
    series: [{
      type: 'custom',
      renderItem: (_params: any, api: any) => {
        const categoryIndex = api.value(0);
        const startVal = api.coord([api.value(1), categoryIndex]);
        const endVal = api.coord([api.value(2), categoryIndex]);
        const barHeight = 18;
        const progress = api.value(3) / 100;
        const width = endVal[0] - startVal[0];

        return {
          type: 'group' as const,
          children: [
            {
              type: 'rect' as const,
              shape: { x: startVal[0], y: startVal[1] - barHeight / 2, width, height: barHeight, r: 4 },
              style: { fill: '#e5e7eb' },
            },
            {
              type: 'rect' as const,
              shape: { x: startVal[0], y: startVal[1] - barHeight / 2, width: width * progress, height: barHeight, r: 4 },
              style: api.style(),
            },
          ],
        };
      },
      encode: { x: [1, 2], y: 0 },
      data: renderItems,
    }],
  } as EChartsOption;
}
