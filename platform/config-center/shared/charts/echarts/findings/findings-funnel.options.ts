import type { EChartsOption } from 'echarts';

export interface FunnelStage {
  name: string;
  value: number;
  color?: string;
}

const DEFAULT_FUNNEL_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#6b7280'];

export function buildFindingsFunnelOptions(
  stages: FunnelStage[],
  _theme?: any
): EChartsOption {
  if (!stages.length) return {} as EChartsOption;

  return {
    tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b>' },
    series: [{
      type: 'funnel',
      left: '10%',
      top: 30,
      bottom: 20,
      width: '80%',
      min: 0,
      max: Math.max(...stages.map(s => s.value), 1),
      sort: 'descending',
      gap: 4,
      label: { show: true, position: 'inside', fontSize: 13, fontWeight: 'bold' as const, color: '#fff' },
      labelLine: { show: false },
      itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
      emphasis: { label: { fontSize: 15 } },
      data: stages.map((s, i) => ({
        value: s.value,
        name: s.name,
        itemStyle: { color: s.color || DEFAULT_FUNNEL_COLORS[i % DEFAULT_FUNNEL_COLORS.length] },
      })),
    }],
  } as EChartsOption;
}
