import type { EChartsOption } from 'echarts';

export interface HeatmapCell {
  impact: number;
  likelihood: number;
  count: number;
  weightedScore?: number;
}

const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];

const HEATMAP_COLORS = [
  '#22c55e', '#86efac', '#fde047', '#fb923c', '#ef4444',
  '#86efac', '#fde047', '#fb923c', '#ef4444', '#dc2626',
  '#fde047', '#fb923c', '#ef4444', '#dc2626', '#991b1b',
  '#fb923c', '#ef4444', '#dc2626', '#991b1b', '#7f1d1d',
  '#ef4444', '#dc2626', '#991b1b', '#7f1d1d', '#450a0a',
];

export function buildRiskHeatmapOptions(
  cells: HeatmapCell[],
  _mode?: string
): EChartsOption {
  const grid = Array.from({ length: 25 }, (_, i) => {
    const x = i % 5;
    const y = Math.floor(i / 5);
    const cell = cells.find(c => c.impact === x && c.likelihood === y);
    return [x, y, cell?.count ?? 0];
  });

  const max = Math.max(1, ...grid.map(g => g[2] as number));

  return {
    tooltip: {
      formatter: (p: any) => {
        const [x, y, v] = p.data;
        return `<b>${IMPACT_LABELS[x]}</b> x <b>${LIKELIHOOD_LABELS[y]}</b><br/>Risks: <b>${v}</b>`;
      },
    },
    grid: { left: 90, right: 20, top: 20, bottom: 60 },
    xAxis: {
      type: 'category',
      data: IMPACT_LABELS,
      name: 'Impact',
      nameLocation: 'middle',
      nameGap: 35,
      splitArea: { show: true },
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: LIKELIHOOD_LABELS,
      name: 'Likelihood',
      nameLocation: 'middle',
      nameGap: 70,
      splitArea: { show: true },
      axisLabel: { fontSize: 11 },
    },
    visualMap: {
      min: 0,
      max,
      show: false,
      inRange: { color: ['#f0fdf4', '#22c55e', '#facc15', '#f97316', '#ef4444', '#991b1b'] },
    },
    series: [{
      type: 'heatmap',
      data: grid,
      label: { show: true, fontSize: 13, fontWeight: 'bold' as const },
      itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(var(--color-black-rgb), 0.2)' } },
    }],
  } as EChartsOption;
}
