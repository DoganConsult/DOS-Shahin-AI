import type { EChartsOption } from 'echarts';

export interface TreemapNode {
  name: string;
  value?: number;
  children?: TreemapNode[];
}

export function buildComplianceCoverageTreemapOptions(root: TreemapNode): EChartsOption {
  if (!root) return {} as EChartsOption;

  return {
    tooltip: {
      formatter: (p: any) => `<b>${p.name}</b><br/>Value: <b>${p.value}</b>`,
    },
    series: [{
      type: 'treemap',
      roam: false,
      nodeClick: false,
      breadcrumb: { show: true, bottom: 10 },
      data: root.children ?? [{ name: root.name, value: root.value ?? 0 }],
      levels: [
        {
          itemStyle: { borderColor: '#fff', borderWidth: 3, gapWidth: 3 },
          upperLabel: { show: true, height: 24, fontSize: 13, fontWeight: 'bold' as const, color: '#1f2937' },
        },
        {
          colorSaturation: [0.4, 0.8],
          itemStyle: { borderWidth: 2, gapWidth: 2, borderColor: '#fff' },
          label: { show: true, fontSize: 11, color: '#fff', fontWeight: 'bold' as const },
        },
      ],
      visibleMin: 5,
      label: { show: true, fontSize: 12, fontWeight: 'bold' as const, color: '#fff' },
      emphasis: { label: { fontSize: 14 } },
      colorMappingBy: 'value',
      color: ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'],
    }],
  } as EChartsOption;
}
