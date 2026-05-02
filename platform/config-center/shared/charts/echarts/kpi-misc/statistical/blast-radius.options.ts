import type { EChartsOption } from 'echarts';

export interface BlastNode {
  id: string;
  name: string;
  value?: number;
  category?: string;
}

export interface BlastEdge {
  source: string;
  target: string;
  value?: number;
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildBlastRadiusOptions(nodes: BlastNode[], edges: BlastEdge[]): EChartsOption {
  if (!nodes.length) return {} as EChartsOption;

  const categories = [...new Set(nodes.map(n => n.category || 'Default'))];

  return {
    tooltip: { trigger: 'item', formatter: (p: any) => `<b>${p.data.name}</b>` },
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      force: { repulsion: 200, gravity: 0.1, edgeLength: 100 },
      data: nodes.map((n, i) => ({
        id: n.id,
        name: n.name,
        symbolSize: Math.max(20, (n.value || 1) * 5),
        itemStyle: { color: DEFAULT_COLORS[categories.indexOf(n.category || 'Default') % DEFAULT_COLORS.length] },
        label: { show: true, fontSize: 11, fontWeight: 'bold' as const, color: '#fff' },
        value: n.value ?? 1,
        category: n.category,
      })),
      links: edges.map(e => ({
        source: e.source,
        target: e.target,
        lineStyle: { width: Math.max(1, (e.value || 1) * 0.5), color: '#94a3b8', opacity: 0.6 },
        symbol: ['none', 'arrow'],
        symbolSize: 7,
      })),
      emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
      lineStyle: { opacity: 0.7 },
      categories: categories.map((c, i) => ({ name: c, itemStyle: { color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] } })),
    }],
    legend: { data: categories, top: 0 },
  } as EChartsOption;
}
