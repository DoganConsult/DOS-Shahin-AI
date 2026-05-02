import type { EChartsOption } from 'echarts';

export interface GlobePoint {
  lat: number;
  lng: number;
  label: string;
  value: number;
}

export function buildEvidenceGlobeOptions(points: GlobePoint[]): EChartsOption {
  if (!points.length) return {} as EChartsOption;

  const max = Math.max(1, ...points.map(p => p.value));

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => `<b>${p.data[2]}</b><br/>Value: <b>${p.data[3]}</b>`,
    },
    geo: {
      map: 'world',
      roam: true,
      itemStyle: { areaColor: '#e5e7eb', borderColor: '#fff', borderWidth: 0.5 },
      emphasis: { itemStyle: { areaColor: '#dbeafe' } },
    },
    visualMap: {
      min: 0,
      max,
      show: false,
      inRange: { color: ['#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a'] },
    },
    series: [{
      type: 'scatter',
      coordinateSystem: 'geo',
      data: points.map(p => [p.lng, p.lat, p.label, p.value]),
      symbolSize: (val: any) => Math.max(6, (val[3] / max) * 30),
      itemStyle: { color: '#3b82f6', opacity: 0.8 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(var(--module-accent-blue-rgb), 0.5)' } },
      label: { show: false },
    }],
  } as EChartsOption;
}
