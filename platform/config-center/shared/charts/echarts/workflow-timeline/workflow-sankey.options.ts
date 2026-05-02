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

export function buildWorkflowSankeyOptions(
  nodes: SankeyNode[],
  links: SankeyLink[],
  _theme?: any
): EChartsOption {
  if (!nodes.length || !links.length) return {} as EChartsOption;

  return {
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [{
      type: 'sankey',
      layout: 'none',
      emphasis: { focus: 'adjacency' },
      nodeAlign: 'left',
      nodeGap: 12,
      nodeWidth: 20,
      lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.4 },
      label: { fontSize: 12, fontWeight: 'bold' as const },
      data: nodes,
      links,
    }],
  } as EChartsOption;
}
