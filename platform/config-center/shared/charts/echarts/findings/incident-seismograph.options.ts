import type { EChartsOption } from 'echarts';

export interface SeismographPoint {
  date: string;
  magnitude: number;
  severity?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#991b1b',
};

export function buildIncidentSeismographOptions(points: SeismographPoint[]): EChartsOption {
  if (!points.length) return {} as EChartsOption;

  const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => `<b>${p.data[0]}</b><br/>Magnitude: <b>${p.data[1]}</b>${p.data[2] ? `<br/>Severity: ${p.data[2]}` : ''}`,
    },
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    xAxis: { type: 'time', axisLabel: { fontSize: 11 }, splitLine: { show: false } },
    yAxis: { type: 'value', name: 'Magnitude', splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } } },
    series: [
      {
        type: 'line',
        data: sorted.map(p => [p.date, p.magnitude, p.severity]),
        smooth: false,
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#94a3b8' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#3b82f615' }, { offset: 1, color: '#3b82f603' }] } },
        silent: true,
      },
      {
        type: 'scatter',
        data: sorted.filter(p => p.severity).map(p => [p.date, p.magnitude, p.severity]),
        symbolSize: (val: any) => Math.max(8, val[1] * 3),
        itemStyle: {
          color: (p: any) => SEVERITY_COLORS[p.data?.[2]] || '#3b82f6',
          borderColor: '#fff',
          borderWidth: 2,
        },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(var(--color-black-rgb), 0.3)' } },
      },
    ],
  } as EChartsOption;
}
