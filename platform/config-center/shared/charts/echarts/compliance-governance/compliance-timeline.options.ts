import type { EChartsOption } from 'echarts';

export interface ComplianceMilestone {
  date: string;
  label: string;
  score: number;
  framework?: string;
}

const FRAMEWORK_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export function buildComplianceTimelineOptions(
  milestones: ComplianceMilestone[],
  _theme?: any
): EChartsOption {
  if (!milestones.length) return {} as EChartsOption;

  const frameworks = [...new Set(milestones.map(m => m.framework || 'General'))];

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        let html = `<b>${items[0]?.axisValueLabel || ''}</b><br/>`;
        items.forEach((p: any) => {
          html += `${p.marker} ${p.seriesName}: <b>${p.value[1]}%</b><br/>`;
        });
        return html;
      },
    },
    legend: { data: frameworks, top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 50 },
    xAxis: {
      type: 'time',
      axisLabel: { fontSize: 11, rotate: 15 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'Score %',
      min: 0,
      max: 100,
      splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } },
    },
    series: frameworks.map((fw, i) => {
      const fwData = milestones
        .filter(m => (m.framework || 'General') === fw)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const color = FRAMEWORK_COLORS[i % FRAMEWORK_COLORS.length];
      return {
        name: fw,
        type: 'line' as const,
        data: fwData.map(m => [m.date, m.score]),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 2.5, color },
        itemStyle: { color },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: color + '25' }, { offset: 1, color: color + '05' }],
          },
        },
        markLine: {
          silent: true,
          data: [{ yAxis: 80, label: { formatter: 'Target', fontSize: 10 }, lineStyle: { color: '#22c55e', type: 'dashed' as const } }],
        },
      };
    }),
  } as EChartsOption;
}
