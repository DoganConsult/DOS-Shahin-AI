import type { EChartsOption } from 'echarts';

export interface TestingSlice {
  name: string;
  value: number;
  color?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildControlTestingDonutOptions(slices: TestingSlice[]): EChartsOption {
  if (!slices.length) return {} as EChartsOption;

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return {
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['45%', '72%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: true,
      padAngle: 2,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' as const },
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(var(--color-black-rgb), 0.15)' },
      },
      data: slices.map((s, i) => ({
        value: s.value,
        name: s.name,
        itemStyle: { color: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] },
      })),
    }],
    graphic: [
      { type: 'text', left: '27%', top: '45%', style: { text: String(total), fontSize: 28, fontWeight: 'bold' as const, fill: '#1f2937', textAlign: 'center' } },
      { type: 'text', left: '27.5%', top: '55%', style: { text: 'Total', fontSize: 12, fill: '#6b7280', textAlign: 'center' } },
    ],
  } as EChartsOption;
}
