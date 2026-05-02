import type { EChartsOption } from 'echarts';

export interface AnomalyPoint {
  date: string;
  value: number;
  isAnomaly?: boolean;
  label?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#991b1b',
};

export function buildAnomalyTimelineOptions(
  points: AnomalyPoint[],
  baselineLabel?: string,
  _theme?: any
): EChartsOption {
  if (!points.length) return {} as EChartsOption;

  const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const normals = sorted.filter(p => !p.isAnomaly);
  const anomalies = sorted.filter(p => p.isAnomaly);

  const values = sorted.map(p => p.value);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const pt = p.data;
        const anomalyTag = pt[3] ? ` <span style="color:${SEVERITY_COLORS[pt[4] || 'medium']}">&#9679; ANOMALY</span>` : '';
        return `<b>${pt[5] || ''}</b>${anomalyTag}<br/>${pt[0]}<br/>Value: <b>${pt[1]}</b>`;
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
    series: [
      {
        name: baselineLabel || 'Baseline',
        type: 'line',
        data: normals.map(p => [p.date, p.value, false, false, '', p.label || '']),
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: 2, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#3b82f620' }, { offset: 1, color: '#3b82f605' }] },
        },
      },
      {
        name: 'Anomalies',
        type: 'scatter',
        data: anomalies.map(p => [p.date, p.value, true, true, p.severity || 'medium', p.label || '']),
        symbolSize: 14,
        itemStyle: {
          color: (p: any) => SEVERITY_COLORS[p.data?.[4]] || '#ef4444',
          borderColor: '#fff',
          borderWidth: 2,
        },
        emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(var(--color-black-rgb), 0.3)' } },
      },
      {
        name: 'Upper Band',
        type: 'line',
        data: sorted.map(p => [p.date, mean + 2 * stdDev]),
        lineStyle: { width: 1, type: 'dashed' as const, color: '#fca5a5' },
        symbol: 'none',
        silent: true,
      },
      {
        name: 'Lower Band',
        type: 'line',
        data: sorted.map(p => [p.date, Math.max(0, mean - 2 * stdDev)]),
        lineStyle: { width: 1, type: 'dashed' as const, color: '#fca5a5' },
        symbol: 'none',
        silent: true,
      },
    ],
    legend: { data: [baselineLabel || 'Baseline', 'Anomalies'], top: 0 },
  } as EChartsOption;
}
