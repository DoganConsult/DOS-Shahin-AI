import type { EChartsOption } from 'echarts';

export interface ComplianceHeatmapCell {
  row: string;
  col: string;
  value: number;
}

export function buildComplianceHeatmapCcOptions(cells: ComplianceHeatmapCell[]): EChartsOption {
  if (!cells.length) return {} as EChartsOption;

  const rows = [...new Set(cells.map(c => c.row))];
  const cols = [...new Set(cells.map(c => c.col))];
  const max = Math.max(1, ...cells.map(c => c.value));

  const data = cells.map(c => [cols.indexOf(c.col), rows.indexOf(c.row), c.value]);

  return {
    tooltip: {
      formatter: (p: any) => `<b>${rows[p.data[1]]}</b> / <b>${cols[p.data[0]]}</b><br/>Value: <b>${p.data[2]}</b>`,
    },
    grid: { left: 120, right: 20, top: 40, bottom: 80 },
    xAxis: {
      type: 'category',
      data: cols,
      splitArea: { show: true },
      axisLabel: { fontSize: 10, rotate: 30 },
    },
    yAxis: {
      type: 'category',
      data: rows,
      splitArea: { show: true },
      axisLabel: { fontSize: 10 },
    },
    visualMap: {
      min: 0,
      max,
      show: false,
      inRange: { color: ['#f0fdf4', '#22c55e', '#facc15', '#f97316', '#ef4444'] },
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: true, fontSize: 11, fontWeight: 'bold' as const },
      itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 3 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(var(--color-black-rgb), 0.2)' } },
    }],
  } as EChartsOption;
}
