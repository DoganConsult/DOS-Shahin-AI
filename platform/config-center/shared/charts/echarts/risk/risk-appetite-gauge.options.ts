import type { EChartsOption } from 'echarts';

export function buildRiskAppetiteGaugeOptions(
  current: number,
  appetite: number,
  _theme?: any
): EChartsOption {
  const max = Math.max(appetite * 1.5, current * 1.2, 100);
  const isBreaching = current > appetite;

  return {
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max,
      radius: '90%',
      progress: { show: true, width: 16, roundCap: true, itemStyle: { color: isBreaching ? '#ef4444' : '#22c55e' } },
      pointer: { show: true, length: '60%', width: 5, itemStyle: { color: '#374151' } },
      axisLine: {
        lineStyle: {
          width: 16,
          color: [[appetite / max, '#e5e7eb'], [1, '#fee2e2']],
        },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: { show: true, offsetCenter: [0, '70%'], fontSize: 12, color: '#6b7280' },
      detail: {
        valueAnimation: true,
        offsetCenter: [0, '35%'],
        fontSize: 26,
        fontWeight: 'bold' as const,
        formatter: `{value}`,
        color: isBreaching ? '#ef4444' : '#22c55e',
      },
      markLine: { silent: true },
      data: [{ value: current, name: `Appetite: ${appetite}` }],
    }],
  } as EChartsOption;
}
