import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { resolveTheme, D3Theme, createPremiumTooltip, observeThemeChange } from './theme-bridge';

export interface BarItem {
  label: string;
  value: number;
  color: string;
  route?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-animated-bar-chart',
    imports: [CommonModule],
    template: `<div #chartContainer class="bar-chart-area"></div>`,
    styles: [`.bar-chart-area { width: 100%; }`]
})
export class AnimatedBarChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() items: BarItem[] = [];
  @Input() width = 400;
  @Input() height = 220;
  @Input() horizontal = false;
  @Output() barClicked = new EventEmitter<BarItem>();
  @ViewChild('chartContainer') containerEl!: ElementRef<HTMLDivElement>;

  private initialized = false;
  private static instanceCounter = 0;
  private instanceId = AnimatedBarChartComponent.instanceCounter++;
  private disposeThemeObserver?: () => void;

  ngAfterViewInit(): void { this.initialized = true; this.render(); this.disposeThemeObserver = observeThemeChange(() => this.render()); }
  ngOnChanges(c: SimpleChanges): void { if (this.initialized) this.render(); }
  ngOnDestroy(): void { this.disposeThemeObserver?.(); d3.select(this.containerEl?.nativeElement).selectAll('svg').remove(); }

  /** Lighten a hex/rgb color by mixing toward white */
  private lightenColor(color: string, amount = 0.35): string {
    const temp = document.createElement('div');
    temp.style.color = color;
    document.body.appendChild(temp);
    const computed = getComputedStyle(temp).color;
    document.body.removeChild(temp);
    const match = computed.match(/\d+/g);
    if (!match) return color;
    const [r, g, b] = match.map(Number);
    const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount));
    return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`;
  }

  private render(): void {
    const el = this.containerEl.nativeElement;
    d3.select(el).selectAll('*').remove();
    if (!this.items.length) return;

    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const t = resolveTheme(el);
    const instId = this.instanceId;
    const margin = { top: 12, right: 16, bottom: 36, left: 44 };
    const w = this.width - margin.left - margin.right;
    const h = this.height - margin.top - margin.bottom;
    const emitter = this.barClicked;

    const svg = d3.select(el).append('svg').attr('width', this.width).attr('height', this.height);
    const defs = svg.append('defs');

    // Per-bar linear gradients (base color → lighter variant)
    this.items.forEach((item, i) => {
      const grad = defs.append('linearGradient')
        .attr('id', `bar-${instId}-${i}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', this.lightenColor(item.color));
      grad.append('stop').attr('offset', '100%').attr('stop-color', item.color);
    });

    // Brightness filter for hover state
    defs.append('filter').attr('id', `bar-bright-${instId}`)
      .append('feComponentTransfer')
      .selectAll('func')
      .data(['feFuncR', 'feFuncG', 'feFuncB'])
      .join(d => d.append(d2 => document.createElementNS('http://www.w3.org/2000/svg', d2)))
      .attr('type', 'linear').attr('slope', '1.15');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const tooltip = this.createTooltip(el, t);

    if (this.horizontal) {
      this.renderHorizontal(g, w, h, t, instId, tooltip, emitter, prefersReducedMotion);
    } else {
      this.renderVertical(g, w, h, t, instId, tooltip, emitter, prefersReducedMotion);
    }
  }

  private renderHorizontal(
    g: d3.Selection<SVGGElement, any, null, undefined>,
    w: number, h: number, t: D3Theme, instId: number,
    tooltip: d3.Selection<HTMLDivElement, any, null, undefined>,
    emitter: EventEmitter<BarItem>,
    prefersReducedMotion: boolean,
  ): void {
    const x = d3.scaleLinear().domain([0, d3.max(this.items, (d: BarItem) => d.value) || 1]).range([0, w]);
    const y = d3.scaleBand().domain(this.items.map((d: BarItem) => d.label)).range([0, h]).padding(0.3);

    g.append('g').attr('class', 'y-axis').call(d3.axisLeft(y).tickSize(0))
      .selectAll('text').attr('font-size', '11px').attr('fill', t.textMuted);
    g.select('.y-axis .domain').remove();

    const hBars = g.selectAll<SVGRectElement, BarItem>('.bar-rect').data(this.items).join('rect')
      .attr('class', 'bar-rect')
      .attr('y', (d: BarItem) => y(d.label) || 0).attr('height', y.bandwidth()).attr('x', 0).attr('width', 0)
      .attr('rx', 6).attr('fill', (_d: BarItem, i: number) => `url(#bar-${instId}-${i})`).style('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 1px 3px rgba(var(--color-black-rgb), 0.1))');

    // Value labels (hidden initially, shown on hover)
    const valLabels = g.selectAll<SVGTextElement, BarItem>('.bar-hover-val').data(this.items).join('text')
      .attr('class', 'bar-hover-val')
      .attr('x', (d: BarItem) => x(d.value) + 6)
      .attr('y', (d: BarItem) => (y(d.label) || 0) + y.bandwidth() / 2)
      .attr('dominant-baseline', 'central').attr('font-size', '12px')
      .attr('font-weight', t.fontBlack).attr('fill', t.textHeading)
      .attr('opacity', 0).text((d: BarItem) => `${d.value}%`);

    hBars
      .on('mouseenter', function(this: SVGRectElement, event: MouseEvent, d: BarItem) {
        d3.select(this).transition().duration(150)
          .attr('opacity', 0.85).attr('filter', `url(#bar-bright-${instId})`);
        const i = hBars.nodes().indexOf(this);
        valLabels.filter((_d: BarItem, idx: number) => idx === i).transition().duration(200).attr('opacity', 1);
        tooltip.html(`<b>${d.label}</b>: ${d.value}%${d.route ? '<br/><span style="font-size: var(--font-size-xs);opacity:0.7">Click to view</span>' : ''}`)
          .style('opacity', '1').style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 10}px`);
      })
      .on('mousemove', function(this: SVGRectElement, event: MouseEvent) {
        tooltip.style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', function(this: SVGRectElement) {
        d3.select(this).transition().duration(150)
          .attr('opacity', 1).attr('filter', 'drop-shadow(0 1px 3px rgba(var(--color-black-rgb), 0.1))');
        const i = hBars.nodes().indexOf(this);
        valLabels.filter((_d: BarItem, idx: number) => idx === i).transition().duration(200).attr('opacity', 0);
        tooltip.style('opacity', '0');
      })
      .on('click', function(this: SVGRectElement, _: MouseEvent, d: BarItem) { emitter.emit(d); });

    const barDelay = prefersReducedMotion ? 0 : 100;
    const barDur = prefersReducedMotion ? 0 : 700;

    hBars.transition().delay((_: BarItem, i: number) => i * barDelay).duration(barDur).ease(d3.easeCubicOut)
      .attr('width', (d: BarItem) => x(d.value));

    // Stagger entrance for value labels position (update after bars animate)
    valLabels.transition().delay((_: BarItem, i: number) => i * barDelay + barDur).duration(0)
      .attr('x', (d: BarItem) => x(d.value) + 6);
  }

  private renderVertical(
    g: d3.Selection<SVGGElement, any, null, undefined>,
    w: number, h: number, t: D3Theme, instId: number,
    tooltip: d3.Selection<HTMLDivElement, any, null, undefined>,
    emitter: EventEmitter<BarItem>,
    prefersReducedMotion: boolean,
  ): void {
    const x = d3.scaleBand().domain(this.items.map((d: BarItem) => d.label)).range([0, w]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(this.items, (d: BarItem) => d.value) || 1]).nice().range([h, 0]);

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickSize(0))
      .selectAll('text').attr('font-size', '11px').attr('fill', t.textMuted);
    g.selectAll('.domain').remove();

    const vBars = g.selectAll<SVGRectElement, BarItem>('.bar-rect').data(this.items).join('rect')
      .attr('class', 'bar-rect')
      .attr('x', (d: BarItem) => x(d.label) || 0).attr('width', x.bandwidth()).attr('y', h).attr('height', 0)
      .attr('rx', 6).attr('fill', (_d: BarItem, i: number) => `url(#bar-${instId}-${i})`).style('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 1px 3px rgba(var(--color-black-rgb), 0.1))');

    // Value labels above bars (hidden initially, shown on hover)
    const valLabels = g.selectAll<SVGTextElement, BarItem>('.bar-hover-val').data(this.items).join('text')
      .attr('class', 'bar-hover-val')
      .attr('x', (d: BarItem) => (x(d.label) || 0) + x.bandwidth() / 2)
      .attr('y', (d: BarItem) => y(d.value) - 8)
      .attr('text-anchor', 'middle').attr('font-size', '12px')
      .attr('font-weight', t.fontBlack).attr('fill', t.textHeading)
      .attr('opacity', 0).text((d: BarItem) => `${d.value}`);

    vBars
      .on('mouseenter', function(this: SVGRectElement, event: MouseEvent, d: BarItem) {
        d3.select(this).transition().duration(150)
          .attr('opacity', 0.85).attr('filter', `url(#bar-bright-${instId})`);
        const i = vBars.nodes().indexOf(this);
        valLabels.filter((_d: BarItem, idx: number) => idx === i).transition().duration(200).attr('opacity', 1);
        tooltip.html(`<b>${d.label}</b>: ${d.value}${d.route ? '<br/><span style="font-size: var(--font-size-xs);opacity:0.7">Click to view</span>' : ''}`)
          .style('opacity', '1').style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 10}px`);
      })
      .on('mousemove', function(this: SVGRectElement, event: MouseEvent) {
        tooltip.style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', function(this: SVGRectElement) {
        d3.select(this).transition().duration(150)
          .attr('opacity', 1).attr('filter', 'drop-shadow(0 1px 3px rgba(var(--color-black-rgb), 0.1))');
        const i = vBars.nodes().indexOf(this);
        valLabels.filter((_d: BarItem, idx: number) => idx === i).transition().duration(200).attr('opacity', 0);
        tooltip.style('opacity', '0');
      })
      .on('click', function(this: SVGRectElement, _: MouseEvent, d: BarItem) { emitter.emit(d); });

    const barDelay = prefersReducedMotion ? 0 : 100;
    const barDur = prefersReducedMotion ? 0 : 700;

    vBars.transition().delay((_: BarItem, i: number) => i * barDelay).duration(barDur).ease(d3.easeCubicOut)
      .attr('y', (d: BarItem) => y(d.value)).attr('height', (d: BarItem) => h - y(d.value));
  }

  private createTooltip(container: HTMLElement, t: D3Theme) {
    return createPremiumTooltip(container, t);
  }
}
