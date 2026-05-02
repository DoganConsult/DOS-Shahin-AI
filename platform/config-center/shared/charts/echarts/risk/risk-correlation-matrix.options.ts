import type { EChartsOption } from 'echarts';

export interface CorrelationCell {
  row: string;
  col: string;
  value: number;
}

export function buildRiskCorrelationMatrixOptions(cells: CorrelationCell[]): EChartsOption {
  if (!cells.length) return {} as EChartsOption;

  const rows = [...new Set(cells.map(c => c.row))];
  const cols = [...new Set(cells.map(c => c.col))];

  return {
    tooltip: {
      formatter: (p: any) => `<b>${rows[p.data[1]]}</b> / <b>${cols[p.data[0]]}</b><br/>Correlation: <b>${p.data[2].toFixed(2)}</b>`,
    },
    grid: { left: 100, right: 20, top: 40, bottom: 80 },
    xAxis: { type: 'category', data: cols, splitArea: { show: true }, axisLabel: { fontSize: 10, rotate: 30 } },
    yAxis: { type: 'category', data: rows, splitArea: { show: true }, axisLabel: { fontSize: 10 } },
    visualMap: {
      min: -1,
      max: 1,
      show: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      inRange: { color: ['#ef4444', '#fff', '#3b82f6'] },
    },
    series: [{
      type: 'heatmap',
      data: cells.map(c => [cols.indexOf(c.col), rows.indexOf(c.row), c.value]),
      label: { show: true, fontSize: 10, fontWeight: 'bold' as const, formatter: (p: any) => p.data[2].toFixed(2) },
      itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 3 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(var(--color-black-rgb), 0.2)' } },
    }],
  } as EChartsOption;
}
