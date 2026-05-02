import type { EChartsOption } from 'echarts';

export interface SmallMultipleSeries {
  name: string;
  data: { date: string; value: number }[];
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildSmallMultiplesOptions(series: SmallMultipleSeries[], cols?: number): EChartsOption {
  if (!series.length) return {} as EChartsOption;

  const numCols = cols ?? Math.min(3, series.length);
  const numRows = Math.ceil(series.length / numCols);

  const grids: any[] = [];
  const xAxes: any[] = [];
  const yAxes: any[] = [];
  const seriesArr: any[] = [];

  const cellW = Math.floor(100 / numCols);
  const cellH = Math.floor(100 / numRows);

  series.forEach((s, i) => {
    const col = i % numCols;
    const row = Math.floor(i / numCols);
    const left = col * cellW + 2;
    const top = row * cellH + 8;
    const color = DEFAULT_COLORS[i % DEFAULT_COLORS.length];

    grids.push({ left: `${left}%`, top: `${top}%`, width: `${cellW - 4}%`, height: `${cellH - 14}%` });
    xAxes.push({ type: 'category', data: s.data.map(d => d.date), gridIndex: i, show: false, boundaryGap: false });
    yAxes.push({ type: 'value', gridIndex: i, show: false });

    seriesArr.push({
      name: s.name,
      type: 'line' as const,
      xAxisIndex: i,
      yAxisIndex: i,
      data: s.data.map(d => d.value),
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '40' }, { offset: 1, color: color + '05' }] } },
      title: s.name,
    });
  });

  return {
    tooltip: { trigger: 'axis' },
    grid: grids,
    xAxis: xAxes,
    yAxis: yAxes,
    series: seriesArr,
    graphic: series.map((s, i) => {
      const col = i % numCols;
      const row = Math.floor(i / numCols);
      const cellW2 = Math.floor(100 / numCols);
      const cellH2 = Math.floor(100 / numRows);
      return {
        type: 'text',
        left: `${col * cellW2 + 2}%`,
        top: `${row * cellH2 + 2}%`,
        style: { text: s.name, fontSize: 10, fill: '#374151', fontWeight: 'bold' },
      };
    }),
  } as EChartsOption;
}
