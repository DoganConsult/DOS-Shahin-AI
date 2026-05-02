import type { EChartsOption } from 'echarts';

export interface FlowNode {
  id: string;
  label: string;
  status?: 'active' | 'completed' | 'upcoming' | 'blocked';
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#3b82f6',
  completed: '#22c55e',
  upcoming: '#9ca3af',
  blocked: '#ef4444',
};

export function buildProcessFlowOptions(nodes: FlowNode[], edges: FlowEdge[]): EChartsOption {
  if (!nodes.length) return {} as EChartsOption;

  return {
    tooltip: {
      formatter: (p: any) => p.dataType === 'node'
        ? `<b>${p.name}</b>`
        : `${p.data.source} → ${p.data.target}${p.data.label ? `<br/>${p.data.label}` : ''}`,
    },
    series: [{
      type: 'graph',
      layout: 'none',
      roam: true,
      data: nodes.map((n, i) => ({
        id: n.id,
        name: n.label,
        x: (i % 4) * 180 + 100,
        y: Math.floor(i / 4) * 120 + 60,
        symbolSize: n.status === 'active' ? 48 : 36,
        symbol: 'roundRect',
        itemStyle: {
          color: STATUS_COLORS[n.status || 'upcoming'],
          borderColor: n.status === 'active' ? '#1d4ed8' : '#e5e7eb',
          borderWidth: n.status === 'active' ? 3 : 1,
        },
        label: { show: true, fontSize: 11, fontWeight: 'bold' as const, color: '#fff' },
      })),
      links: edges.map(e => ({
        source: e.from,
        target: e.to,
        label: e.label ? { show: true, formatter: e.label, fontSize: 9 } : { show: false },
        lineStyle: { color: '#94a3b8', width: 1.5, curveness: 0.2 },
        symbol: ['none', 'arrow'],
        symbolSize: 8,
      })),
      emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
      lineStyle: { opacity: 0.7 },
    }],
  } as EChartsOption;
}
