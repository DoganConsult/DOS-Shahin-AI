import type { EChartsOption } from 'echarts';
import { grc } from './grc-echarts-theme';

/**
 * Premium sparkline — theme-aware gradient fill, glow line,
 * animated entrance, optional endpoint indicator & micro-tooltip.
 *
 * @param points      Array of numeric values (y-axis, x derived from index)
 * @param accent      Override colour key: 'primary' | 'success' | 'warning' | 'danger' | 'info'
 * @param showTooltip Whether hovering shows a value tooltip (default false for KPI cards)
 */
export function buildSparklineOptions(
  points: number[],
  accent: 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'info',
  showTooltip = false,
): EChartsOption {
  const t = grc();
  const c = t[accent];
  const data = points.map((v, i) => [i, v]);

  return {
    grid: { left: 0, right: 0, top: 4, bottom: 0, containLabel: false },
    xAxis: { type: 'value', show: false, min: 0, max: points.length - 1 },
    yAxis: { type: 'value', show: false },
    tooltip: showTooltip
      ? {
          trigger: 'axis',
          ...t.tooltip(),
          formatter: (p: any) => {
            const v = Array.isArray(p) ? p[0] : p;
            return `<span style="font-weight:600;font-size: var(--font-size-sm)">${v?.value?.[1] ?? ''}</span>`;
          },
        }
      : undefined,
    ...t.animation(0),
    animationDuration: 1200,
    animationEasing: 'cubicOut',
    series: [
      ({
        type: 'line',
        data,
        showSymbol: false,
        smooth: 0.4,
        lineStyle: {
          width: 2.5,
          color: c,
          shadowColor: t.alpha(c, 0.45),
          shadowBlur: 8,
          shadowOffsetY: 3,
        },
        areaStyle: {
          color: t.linearGradient(t.alpha(c, 0.28), t.alpha(c, 0.02)) as unknown,
        },
        emphasis: {
          lineStyle: { width: 3 },
          itemStyle: { borderWidth: 2, borderColor: c, color: t.bg1 },
        },
        markPoint:
          points.length > 1
            ? {
                symbol: 'circle',
                symbolSize: 6,
                data: [{ coord: [points.length - 1, points[points.length - 1]] }],
                itemStyle: {
                  color: c,
                  borderColor: t.bg1,
                  borderWidth: 2,
                  shadowColor: t.alpha(c, 0.5),
                  shadowBlur: 6,
                },
                label: { show: false },
              }
            : undefined,
      }) as unknown,
    ],
  };
}
