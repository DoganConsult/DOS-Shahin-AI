import type { EChartsOption } from 'echarts';

export interface TectonicPlate {
  name: string;
  start: string;
  end: string;
  progress: number;
  category?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildComplianceTectonicOptions(plates: TectonicPlate[]): EChartsOption {
  if (!plates.length) return {} as EChartsOption;

  const categories = [...new Set(plates.map(p => p.category || 'General'))];
  const names = plates.map(p => p.name);
  const minDate = Math.min(...plates.map(p => new Date(p.start).getTime()));
  const maxDate = Math.max(...plates.map(p => new Date(p.end).getTime()));

  return {
    tooltip: {
      formatter: (p: any) => {
        const [idx, start, end, progress] = p.data.value;
        return `<b>${names[idx]}</b><br/>${new Date(start).toLocaleDateString()} → ${new Date(end).toLocaleDateString()}<br/>Progress: <b>${progress}%</b>`;
      },
    },
    grid: { left: 150, right: 30, top: 20, bottom: 40 },
    xAxis: {
      type: 'time',
      min: minDate,
      max: maxDate,
      axisLabel: { fontSize: 10 },
      splitLine: { show: true, lineStyle: { type: 'dashed' as const, color: '#f0f0f0' } },
    },
    yAxis: {
      type: 'category',
      data: names,
      inverse: true,
      axisLabel: { fontSize: 11, width: 130, overflow: 'truncate' as const },
      axisTick: { show: false },
    },
    series: [{
      type: 'custom',
      renderItem: (_params: any, api: any) => {
        const idx = api.value(0);
        const start = api.coord([api.value(1), idx]);
        const end = api.coord([api.value(2), idx]);
        const h = 16;
        const prog = api.value(3) / 100;
        const w = end[0] - start[0];
        const catIdx = categories.indexOf(plates[idx]?.category || 'General');
        const color = DEFAULT_COLORS[catIdx % DEFAULT_COLORS.length];
        return {
          type: 'group' as const,
          children: [
            { type: 'rect' as const, shape: { x: start[0], y: start[1] - h / 2, width: w, height: h, r: 4 }, style: { fill: '#e5e7eb' } },
            { type: 'rect' as const, shape: { x: start[0], y: start[1] - h / 2, width: w * prog, height: h, r: 4 }, style: { fill: color } },
          ],
        };
      },
      encode: { x: [1, 2], y: 0 },
      data: plates.map((p, i) => ({
        value: [i, new Date(p.start).getTime(), new Date(p.end).getTime(), p.progress],
        itemStyle: { color: DEFAULT_COLORS[categories.indexOf(p.category || 'General') % DEFAULT_COLORS.length] },
      })),
    }],
  } as EChartsOption;
}
