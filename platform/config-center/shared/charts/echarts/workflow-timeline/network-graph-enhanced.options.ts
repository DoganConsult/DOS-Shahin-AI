import type { EChartsOption } from 'echarts';

export interface NetworkNode {
  id: string;
  name: string;
  value?: number;
  category?: string;
  risk?: 'low' | 'medium' | 'high' | 'critical';
}

export interface NetworkEdge {
  source: string;
  target: string;
  value?: number;
  label?: string;
}

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#991b1b',
};

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildNetworkGraphEnhancedOptions(nodes: NetworkNode[], edges: NetworkEdge[]): EChartsOption {
  if (!nodes.length) return {} as EChartsOption;

  const categories = [...new Set(nodes.map(n => n.category || 'Default'))];

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => p.dataType === 'node'
        ? `<b>${p.data.name}</b>${p.data.risk ? `<br/>Risk: ${p.data.risk}` : ''}`
        : `${p.data.source} → ${p.data.target}`,
    },
    legend: { data: categories, top: 0 },
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      force: { repulsion: 250, gravity: 0.08, edgeLength: [60, 200] },
      data: nodes.map(n => ({
        id: n.id,
        name: n.name,
        symbolSize: Math.max(22, (n.value || 1) * 5),
        itemStyle: {
          color: n.risk ? RISK_COLORS[n.risk] : DEFAULT_COLORS[categories.indexOf(n.category || 'Default') % DEFAULT_COLORS.length],
          borderColor: n.risk === 'critical' ? '#7f1d1d' : '#e5e7eb',
          borderWidth: n.risk === 'critical' ? 3 : 1,
          shadowBlur: n.risk && n.risk !== 'low' ? 10 : 0,
          shadowColor: 'rgba(var(--color-black-rgb), 0.2)',
        },
        label: { show: true, fontSize: 10, color: '#fff', fontWeight: 'bold' as const },
        category: n.category || 'Default',
      })),
      links: edges.map(e => ({
        source: e.source,
        target: e.target,
        lineStyle: { color: '#94a3b8', width: Math.max(1, (e.value || 1) * 0.5), opacity: 0.6, curveness: 0.1 },
        symbol: ['none', 'arrow'],
        symbolSize: 7,
        label: e.label ? { show: true, formatter: e.label, fontSize: 9 } : { show: false },
      })),
      categories: categories.map((c, i) => ({ name: c, itemStyle: { color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] } })),
      emphasis: { focus: 'adjacency', lineStyle: { width: 4 }, itemStyle: { shadowBlur: 16, shadowColor: 'rgba(var(--color-black-rgb), 0.3)' } },
      lineStyle: { opacity: 0.7 },
    }],
  } as EChartsOption;
}
