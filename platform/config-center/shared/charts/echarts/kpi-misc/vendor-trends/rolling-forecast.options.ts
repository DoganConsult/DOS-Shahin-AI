import type { EChartsOption } from 'echarts';

export interface ForecastPoint {
  date: string;
  value: number;
}

export interface ForecastBand {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

export function buildRollingForecastOptions(historical: ForecastPoint[], forecast: ForecastBand[]): EChartsOption {
  if (!historical.length && !forecast.length) return {} as EChartsOption;

  const allHistDates = historical.map(p => p.date);
  const allForecastDates = forecast.map(p => p.date);

  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Historical', 'Forecast', 'Confidence Band'], top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: [...allHistDates, ...allForecastDates],
      boundaryGap: false,
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } } },
    series: [
      {
        name: 'Historical',
        type: 'line' as const,
        data: [...historical.map(p => p.value), ...forecast.map(() => null)],
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2.5, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#3b82f625' }, { offset: 1, color: '#3b82f605' }] } },
      },
      {
        name: 'Forecast',
        type: 'line' as const,
        data: [...historical.map(() => null), ...forecast.map(p => p.value)],
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2.5, color: '#f59e0b', type: 'dashed' as const },
        itemStyle: { color: '#f59e0b' },
      },
      {
        name: 'Confidence Band',
        type: 'line' as const,
        data: [...historical.map(() => null), ...forecast.map(p => p.upper)],
        lineStyle: { width: 0 },
        symbol: 'none',
        areaStyle: { color: '#f59e0b15', origin: 'auto' },
        stack: 'confidence',
        silent: true,
      },
      {
        type: 'line' as const,
        data: [...historical.map(() => null), ...forecast.map(p => p.lower)],
        lineStyle: { width: 0 },
        symbol: 'none',
        areaStyle: { color: '#fff', origin: 'auto' },
        stack: 'confidence',
        silent: true,
      },
    ],
  } as EChartsOption;
}
