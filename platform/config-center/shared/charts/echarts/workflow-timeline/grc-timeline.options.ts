import type { EChartsOption } from 'echarts';

export interface TimelineEvent {
  date: string;
  title: string;
  category?: string;
  status?: 'completed' | 'active' | 'upcoming' | 'overdue';
  description?: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  active: '#3b82f6',
  upcoming: '#6b7280',
  overdue: '#ef4444',
};

const CATEGORY_SYMBOLS: Record<string, string> = {
  risk: 'diamond',
  compliance: 'circle',
  audit: 'triangle',
  governance: 'rect',
  evidence: 'roundRect',
  incident: 'arrow',
};

export function buildGrcTimelineOptions(
  events: TimelineEvent[],
  _theme?: any
): EChartsOption {
  if (!events.length) return {} as EChartsOption;

  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const categories = [...new Set(sorted.map(e => e.category || 'general'))];

  const series = categories.map((cat, catIdx) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    type: 'scatter' as const,
    coordinateSystem: 'cartesian2d' as const,
    data: sorted
      .filter(e => (e.category || 'general') === cat)
      .map(e => [e.date, catIdx, e.title, e.status || 'upcoming']),
    symbolSize: 16,
    symbol: CATEGORY_SYMBOLS[cat] || 'circle',
    itemStyle: {
      color: (p: any) => STATUS_COLORS[p.data?.[3]] || '#6b7280',
      borderColor: '#fff',
      borderWidth: 2,
    },
    emphasis: {
      itemStyle: { shadowBlur: 10, shadowColor: 'rgba(var(--color-black-rgb), 0.2)' },
    },
  }));

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const [date, , title, status] = p.data;
        return `<b>${title}</b><br/>${date}<br/>Status: <b>${status}</b>`;
      },
    },
    legend: { data: categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)), top: 0 },
    grid: { left: 80, right: 30, top: 40, bottom: 40 },
    xAxis: {
      type: 'time',
      axisLabel: { fontSize: 11 },
      splitLine: { show: true, lineStyle: { type: 'dashed' as const, color: '#f0f0f0' } },
    },
    yAxis: {
      type: 'category',
      data: categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, fontWeight: 'bold' as const },
    },
    series,
  } as EChartsOption;
}
