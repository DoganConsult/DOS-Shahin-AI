import type { EChartsOption } from 'echarts';

export interface LifecycleNode {
  id: string;
  name: string;
  status?: string;
  x?: number;
  y?: number;
}

export interface LifecycleEdge {
  source: string;
  target: string;
  label?: string;
}

export function buildLifecycleFlowOptions(nodes: LifecycleNode[], edges: LifecycleEdge[]): EChartsOption {
  return {
    series: [{
      type: 'graph',
      layout: 'none',
      data: nodes.map(n => ({
        name: n.name,
        x: n.x ?? 0,
        y: n.y ?? 0,
        symbolSize: 40,
        itemStyle: { color: n.status === 'active' ? 'var(--grc-success)' : 'var(--grc-surface-3)' },
      })),
      links: edges.map(e => ({
        source: e.source,
        target: e.target,
        label: { show: !!e.label, formatter: e.label ?? '' },
      })),
      lineStyle: { curveness: 0.1 },
    }],
  };
}
