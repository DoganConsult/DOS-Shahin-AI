import type { EChartsOption } from 'echarts';

export interface CalendarDay {
  date: string;
  value: number;
}

export function buildEvidenceCalendarHeatmapOptions(days: CalendarDay[], year: number): EChartsOption {
  if (!days.length) return {} as EChartsOption;

  const max = Math.max(1, ...days.map(d => d.value));

  return {
    tooltip: {
      formatter: (p: any) => `<b>${p.data[0]}</b><br/>Evidence: <b>${p.data[1]}</b>`,
    },
    visualMap: {
      min: 0,
      max,
      show: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      inRange: { color: ['#f0fdf4', '#22c55e', '#16a34a', '#15803d', '#166534'] },
    },
    calendar: {
      top: 40,
      left: 40,
      right: 20,
      cellSize: ['auto', 16],
      range: String(year),
      itemStyle: { borderWidth: 2, borderColor: '#fff' },
      yearLabel: { show: true, fontSize: 13, fontWeight: 'bold' as const },
      monthLabel: { fontSize: 11 },
      dayLabel: { fontSize: 10 },
    },
    series: [{
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: days.map(d => [d.date, d.value]),
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(var(--color-black-rgb), 0.2)' } },
    }],
  } as EChartsOption;
}
