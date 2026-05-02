import type { EChartsOption } from 'echarts';

export interface WaterfallStep {
  name: string;
  value: number;
  isTotal?: boolean;
}

export function buildRiskBridgeWaterfallOptions(steps: WaterfallStep[]): EChartsOption {
  if (!steps.length) return {} as EChartsOption;

  let cumulative = 0;
  const barData = steps.map(s => {
    if (s.isTotal) {
      return { value: cumulative, itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } };
    }
    const base = cumulative;
    cumulative += s.value;
    return { value: s.value, base };
  });

  const placeholderData = steps.map((s, i) => {
    if (s.isTotal) return 0;
    let base = 0;
    for (let j = 0; j < i; j++) {
      if (!steps[j].isTotal) base += steps[j].value;
    }
    return base < 0 ? base - (barData[i] as any).value : base;
  });

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const s = steps[params[0]?.dataIndex ?? 0];
        return s ? `<b>${s.name}</b><br/>Value: <b>${s.value >= 0 ? '+' : ''}${s.value}</b>` : '';
      },
    },
    grid: { left: 60, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: steps.map(s => s.name), axisLabel: { fontSize: 11, rotate: 15 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } } },
    series: [
      {
        type: 'bar',
        stack: 'waterfall',
        itemStyle: { color: 'transparent', borderColor: 'transparent' },
        data: steps.map((s, i) => {
          if (s.isTotal) return 0;
          let base = 0;
          for (let j = 0; j < i; j++) {
            if (!steps[j].isTotal) base += steps[j].value;
          }
          return Math.min(base, base + s.value);
        }),
        silent: true,
      },
      {
        type: 'bar',
        stack: 'waterfall',
        data: steps.map((s, i) => {
          if (s.isTotal) {
            let total = 0;
            steps.filter(st => !st.isTotal).forEach(st => total += st.value);
            return { value: Math.abs(total), itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } };
          }
          return {
            value: Math.abs(s.value),
            itemStyle: { color: s.value >= 0 ? '#ef4444' : '#22c55e', borderRadius: [4, 4, 0, 0] },
          };
        }),
        label: { show: true, position: 'top', fontSize: 11, fontWeight: 'bold' as const },
        barMaxWidth: 60,
      },
    ],
  } as EChartsOption;
}
