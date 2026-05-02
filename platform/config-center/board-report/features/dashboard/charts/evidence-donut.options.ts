import type { EChartsOption } from 'echarts';
import { grc } from './grc-echarts-theme';

export interface EvidenceSlice {
  name: string;
  value: number;
  /** optional accent override */
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

/**
 * Premium Evidence Operations Donut — inner label with total,
 * rose-mode proportional slices, animated entrance, theme-aware.
 */
export function buildEvidenceDonutOptions(
  slices: EvidenceSlice[],
  centreLabel?: string,
): EChartsOption {
  const t = grc();
  const total = slices.reduce((s, e) => s + e.value, 0);

  const accentMap: Record<string, string> = {
    primary: t.primary,
    success: t.success,
    warning: t.warning,
    danger: t.danger,
    info: t.info,
  };

  const data = slices.map((s, i) => ({
    name: s.name,
    value: s.value,
    itemStyle: {
      color: s.accent ? accentMap[s.accent] : t.palette[i % t.palette.length],
      borderColor: t.bg1,
      borderWidth: 2,
      borderRadius: 5,
    },
  }));

  return {
    ...t.animation(0),
    tooltip: {
      ...t.tooltip(),
      formatter: (params: Record<string, unknown>) => {
        const p = params as { name: string; value: number; percent: number };
        return `<b>${p.name}</b><br/>${p.value} items · ${p.percent.toFixed(1)}%`;
      },
    },
    legend: {
      ...t.legend(),
      orient: 'vertical',
      right: 12,
      top: 'center',
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '74%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: {
          borderRadius: 6,
        },
        label: {
          show: false,
        },
        emphasis: {
          scale: true,
          scaleSize: 8,
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 600,
            color: t.text0,
            formatter: '{b}\n{d}%',
          },
          itemStyle: {
            shadowBlur: 14,
            shadowColor: t.alpha(t.primary, 0.4),
          },
        },
        /* static centre label */
        markPoint: undefined,
        data,
        animationType: 'scale',
        animationEasing: 'cubicOut',
        animationDuration: 1000,
        animationDelay: (idx: number) => idx * 80,
      },
      /* inner ring — centre text */
      {
        type: 'pie',
        radius: [0, '38%'],
        center: ['40%', '50%'],
        silent: true,
        label: {
          show: true,
          position: 'center',
          formatter: () => {
            const label = centreLabel ?? 'Total';
            return `{total|${total}}\n{label|${label}}`;
          },
          rich: {
            total: {
              fontSize: 26,
              fontWeight: 700,
              color: t.text0,
              lineHeight: 34,
            },
            label: {
              fontSize: 11,
              color: t.text2,
              lineHeight: 18,
            },
          },
        },
        data: [{ value: 1, itemStyle: { color: 'transparent' } }],
        animation: false,
      },
    ],
  };
}
