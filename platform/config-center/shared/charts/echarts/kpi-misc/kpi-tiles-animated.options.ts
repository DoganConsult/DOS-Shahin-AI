import type { EChartsOption } from 'echarts';

export interface KpiTile {
  label: string;
  value: number;
  target: number;
  unit: string;
}

export function buildKpiTilesAnimatedOptions(tiles: KpiTile[]): EChartsOption {
  if (!tiles.length) return {} as EChartsOption;

  const tile = tiles[0];
  const safeTarget = tile.target || 100;
  const safeVal = Math.min(tile.value, safeTarget);
  const color = safeVal >= safeTarget * 0.8 ? '#22c55e' : safeVal >= safeTarget * 0.6 ? '#f59e0b' : '#ef4444';

  return {
    series: tiles.map((t, i) => {
      const max = t.target || 100;
      const val = Math.min(t.value, max);
      const c = val >= max * 0.8 ? '#22c55e' : val >= max * 0.6 ? '#f59e0b' : '#ef4444';
      return {
        type: 'gauge',
        center: [`${(i % 3) * 33 + 17}%`, `${Math.floor(i / 3) * 50 + 30}%`],
        radius: '30%',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max,
        itemStyle: { color: c },
        progress: { show: true, width: 10, roundCap: true },
        pointer: { show: false },
        axisLine: { lineStyle: { width: 10, color: [[1, '#e5e7eb']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: { show: true, offsetCenter: [0, '70%'], fontSize: 10, color: '#6b7280' },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '30%'],
          fontSize: 18,
          fontWeight: 'bold' as const,
          formatter: `{value}${t.unit}`,
          color: c,
        },
        data: [{ value: val, name: t.label }],
      };
    }),
  } as EChartsOption;
}
