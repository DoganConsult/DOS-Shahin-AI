import type { EChartsOption } from 'echarts';

export interface EntityNode {
  id: string;
  name: string;
  value?: number;
  category?: string;
}

export interface EntityEdge {
  source: string;
  target: string;
  value?: number;
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildEntityGraphOptions(nodes: EntityNode[], edges: EntityEdge[]): EChartsOption {
  if (!nodes.length) return {} as EChartsOption;

  const categories = [...new Set(nodes.map(n => n.category || 'Default'))];

  return {
    tooltip: { trigger: 'item', formatter: (p: any) => `<b>${p.data.name ?? p.data.source + ' → ' + p.data.target}</b>` },
    legend: { data: categories, top: 0 },
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      force: { repulsion: 180, gravity: 0.1, edgeLength: [80, 150] },
      data: nodes.map(n => ({
        id: n.id,
        name: n.name,
        symbolSize: Math.max(18, (n.value || 1) * 4),
        itemStyle: { color: DEFAULT_COLORS[categories.indexOf(n.category || 'Default') % DEFAULT_COLORS.length] },
        label: { show: true, fontSize: 10, color: '#fff', fontWeight: 'bold' as const },
        category: n.category || 'Default',
      })),
      links: edges.map(e => ({
        source: e.source,
        target: e.target,
        lineStyle: { color: '#94a3b8', width: 1.5, opacity: 0.6 },
        symbol: ['none', 'arrow'],
        symbolSize: 7,
      })),
      categories: categories.map((c, i) => ({ name: c, itemStyle: { color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] } })),
      emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
      lineStyle: { opacity: 0.7 },
    }],
  } as EChartsOption;
}
