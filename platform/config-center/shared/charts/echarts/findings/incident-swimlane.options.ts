import type { EChartsOption } from 'echarts';

export interface SwimLaneItem {
  lane: string;
  start: string;
  end: string;
  label: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  in_progress: '#f59e0b',
  resolved: '#22c55e',
  closed: '#6b7280',
  default: '#3b82f6',
};

export function buildIncidentSwimLaneOptions(lanes: string[], items: SwimLaneItem[]): EChartsOption {
  if (!lanes.length || !items.length) return {} as EChartsOption;

  const minDate = Math.min(...items.map(i => new Date(i.start).getTime()));
  const maxDate = Math.max(...items.map(i => new Date(i.end).getTime()));

  return {
    tooltip: {
      formatter: (p: any) => {
        const [laneIdx, start, end] = p.data.value;
        return `<b>${lanes[laneIdx]}</b><br/>${p.data.label}<br/>${new Date(start).toLocaleDateString()} → ${new Date(end).toLocaleDateString()}`;
      },
    },
    grid: { left: 120, right: 30, top: 20, bottom: 40 },
    xAxis: {
      type: 'time',
      min: minDate,
      max: maxDate,
      axisLabel: { fontSize: 10 },
      splitLine: { show: true, lineStyle: { type: 'dashed' as const, color: '#f0f0f0' } },
    },
    yAxis: {
      type: 'category',
      data: lanes,
      axisLabel: { fontSize: 11 },
      axisTick: { show: false },
    },
    series: [{
      type: 'custom',
      renderItem: (_params: any, api: any) => {
        const laneIdx = api.value(0);
        const start = api.coord([api.value(1), laneIdx]);
        const end = api.coord([api.value(2), laneIdx]);
        const h = 20;
        const w = Math.max(4, end[0] - start[0]);
        return {
          type: 'rect' as const,
          shape: { x: start[0], y: start[1] - h / 2, width: w, height: h, r: 4 },
          style: api.style(),
        };
      },
      encode: { x: [1, 2], y: 0 },
      data: items.map(item => ({
        value: [lanes.indexOf(item.lane), new Date(item.start).getTime(), new Date(item.end).getTime()],
        label: item.label,
        itemStyle: { color: STATUS_COLORS[item.status] || STATUS_COLORS['default'] },
      })),
    }],
  } as EChartsOption;
}
