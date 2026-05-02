import type { EChartsOption } from 'echarts';

export interface SankeyNode {
  name: string;
  itemStyle?: { color?: string };
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export function buildEvidenceFlowOptions(nodes: SankeyNode[], links: SankeyLink[]): EChartsOption {
  if (!nodes.length || !links.length) return {} as EChartsOption;

  return {
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [{
      type: 'sankey',
      layout: 'none',
      emphasis: { focus: 'adjacency' },
      nodeAlign: 'justify',
      nodeGap: 14,
      nodeWidth: 22,
      lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.4 },
      label: { fontSize: 12, fontWeight: 'bold' as const },
      data: nodes,
      links,
    }],
  } as EChartsOption;
}
