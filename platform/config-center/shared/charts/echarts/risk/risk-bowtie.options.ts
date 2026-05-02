import type { EChartsOption } from 'echarts';

export interface BowtieCause {
  name: string;
  likelihood: number;
}

export interface BowtieConsequence {
  name: string;
  impact: number;
}

export interface BowtieControl {
  name: string;
  type: 'preventive' | 'detective' | 'corrective';
  target: string;
}

const CONTROL_COLORS: Record<string, string> = {
  preventive: '#22c55e',
  detective: '#f59e0b',
  corrective: '#3b82f6',
};

export function buildRiskBowtieOptions(
  riskEvent: string,
  causes: BowtieCause[],
  consequences: BowtieConsequence[],
  controls: BowtieControl[]
): EChartsOption {
  if (!causes.length && !consequences.length) return {} as EChartsOption;

  const nodes: any[] = [{ id: 'event', name: riskEvent, x: 400, y: 200, symbolSize: 60, symbol: 'diamond', itemStyle: { color: '#ef4444' }, label: { show: true, fontSize: 11, color: '#fff', fontWeight: 'bold' as const } }];
  const links: any[] = [];

  causes.forEach((c, i) => {
    const id = `cause_${i}`;
    nodes.push({ id, name: c.name, x: 80, y: 60 + i * 80, symbolSize: 38, symbol: 'roundRect', itemStyle: { color: '#8b5cf6' }, label: { show: true, fontSize: 10, color: '#fff' } });
    links.push({ source: id, target: 'event', lineStyle: { color: '#8b5cf6', width: 1 + c.likelihood, curveness: 0.2 }, symbol: ['none', 'arrow'], symbolSize: 7 });
  });

  consequences.forEach((c, i) => {
    const id = `cons_${i}`;
    nodes.push({ id, name: c.name, x: 720, y: 60 + i * 80, symbolSize: 38, symbol: 'roundRect', itemStyle: { color: '#f97316' }, label: { show: true, fontSize: 10, color: '#fff' } });
    links.push({ source: 'event', target: id, lineStyle: { color: '#f97316', width: 1 + c.impact, curveness: 0.2 }, symbol: ['none', 'arrow'], symbolSize: 7 });
  });

  controls.forEach((c, i) => {
    const id = `ctrl_${i}`;
    const isLeft = c.type === 'preventive';
    nodes.push({ id, name: c.name, x: isLeft ? 240 : 560, y: 340 + i * 50, symbolSize: 30, symbol: 'roundRect', itemStyle: { color: CONTROL_COLORS[c.type] }, label: { show: true, fontSize: 9, color: '#fff' } });
  });

  return {
    tooltip: { formatter: (p: any) => `<b>${p.data.name}</b>` },
    series: [{
      type: 'graph',
      layout: 'none',
      roam: false,
      data: nodes,
      links,
      emphasis: { focus: 'adjacency' },
      lineStyle: { opacity: 0.8 },
    }],
  } as EChartsOption;
}
