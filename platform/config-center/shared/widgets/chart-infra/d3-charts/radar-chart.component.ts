import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import * as d3 from 'd3';
import { resolveTheme, createPremiumTooltip, observeThemeChange } from './theme-bridge';

export interface RadarAxis {
  label: string;
  value: number;
  max: number;
  route?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-radar-chart',
  standalone: true,
  template: `<div #chartContainer class="radar-area"></div>`,
  styles: [`.radar-area { width: 100%; display: flex; justify-content: center; }`],
})
export class RadarChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() axes: RadarAxis[] = [];
  @Input() size = 320;
  @Input() color = '#3b82f6';
  @Input() fillOpacity = 0.15;
  @Output() axisClicked = new EventEmitter<RadarAxis>();
  @ViewChild('chartContainer') containerEl!: ElementRef<HTMLDivElement>;

  private initialized = false;
  private static instanceCounter = 0;
  private instanceId = ++RadarChartComponent.instanceCounter;
  private disposeThemeObserver?: () => void;

  ngAfterViewInit(): void { this.initialized = true; this.render(); this.disposeThemeObserver = observeThemeChange(() => this.render()); }
  ngOnChanges(c: SimpleChanges): void { if (this.initialized) this.render(); }
  ngOnDestroy(): void { this.disposeThemeObserver?.(); d3.select(this.containerEl?.nativeElement).selectAll('svg').remove(); }

  private render(): void {
    const el = this.containerEl.nativeElement;
    d3.select(el).selectAll('*').remove();
    if (!this.axes.length) return;

    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const t = resolveTheme(el);
    const w = this.size, h = this.size, cx = w / 2, cy = h / 2;
    const maxR = w / 2 - 50, n = this.axes.length;
    const angleSlice = (Math.PI * 2) / n, levels = 5;
    const emitter = this.axisClicked;
    const chartColor = this.color || t.primary;

    const uid = `radar-${this.instanceId}`;
    const gradientId = `${uid}-fill`;
    const glowId = `${uid}-glow`;

    const svg = d3.select(el).append('svg').attr('width', w).attr('height', h);
    const defs = svg.append('defs');

    // Premium area fill gradient: primary → primaryLight with opacity
    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', chartColor).attr('stop-opacity', 0.4);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', chartColor).attr('stop-opacity', 0.05);

    // Premium glow filter for data points
    const filter = defs.append('filter')
      .attr('id', glowId)
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    filter.append('feDropShadow')
      .attr('dx', '0').attr('dy', '0')
      .attr('stdDeviation', '3')
      .attr('flood-color', chartColor)
      .attr('flood-opacity', '0.5');

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // Glass-styled grid lines with border-subtle color
    for (let lvl = 1; lvl <= levels; lvl++) {
      const r = (maxR / levels) * lvl;
      const pts = Array.from({ length: n }, (_, i) => {
        const a = angleSlice * i - Math.PI / 2;
        return `${r * Math.cos(a)},${r * Math.sin(a)}`;
      });
      g.append('polygon').attr('points', pts.join(' ')).attr('fill', 'none')
        .attr('stroke', t.borderSubtle).attr('stroke-width', lvl === levels ? 1.5 : 0.5)
        .attr('stroke-dasharray', lvl < levels ? '3,3' : 'none')
        .attr('opacity', lvl === levels ? 0.8 : 0.4);
    }

    this.axes.forEach((axis, i) => {
      const a = angleSlice * i - Math.PI / 2;
      g.append('line').attr('x1', 0).attr('y1', 0)
        .attr('x2', maxR * Math.cos(a)).attr('y2', maxR * Math.sin(a))
        .attr('stroke', t.borderSubtle).attr('stroke-width', 0.5).attr('opacity', 0.4);
      const labelR = maxR + 18, tx = labelR * Math.cos(a), ty = labelR * Math.sin(a);
      g.append('text').attr('x', tx).attr('y', ty)
        .attr('text-anchor', Math.abs(tx) < 5 ? 'middle' : tx > 0 ? 'start' : 'end')
        .attr('dominant-baseline', Math.abs(ty) < 5 ? 'central' : ty > 0 ? 'hanging' : 'auto')
        .attr('font-size', '11px').attr('font-weight', t.fontBold).attr('fill', t.textBody)
        .style('cursor', axis.route ? 'pointer' : 'default').text(axis.label)
        .on('click', () => { emitter.emit(axis); });
    });

    const tooltip = createPremiumTooltip(el, t);

    const dataPoints = this.axes.map((axis, i) => {
      const a = angleSlice * i - Math.PI / 2;
      const r = (axis.value / axis.max) * maxR;
      return { x: r * Math.cos(a), y: r * Math.sin(a), axis };
    });

    const area = d3.lineRadial<RadarAxis>().angle((_, i) => angleSlice * i)
      .radius(d => (d.value / d.max) * maxR).curve(d3.curveLinearClosed);

    const radarPath = g.append('path').datum(this.axes)
      .attr('fill', `url(#${gradientId})`).attr('stroke', chartColor).attr('stroke-width', 2.5)
      .attr('stroke-linejoin', 'round').style('filter', `drop-shadow(0 2px 8px ${chartColor}33)`).attr('opacity', prefersReducedMotion ? 1 : 0);

    const finalPath = area(this.axes) || '';
    const pathDur = prefersReducedMotion ? 0 : 800;
    radarPath.transition().duration(pathDur).ease(d3.easeCubicOut).attr('opacity', 1)
      .attrTween('d', function() {
        const zeroArea = d3.lineRadial<RadarAxis>().angle((_, i) => angleSlice * i).radius(0).curve(d3.curveLinearClosed);
        const startPath = zeroArea(new Array(n).fill({ label: '', value: 0, max: 1 })) || '';
        const interp = d3.interpolate(startPath, finalPath);
        return (tt: number) => interp(tt);
      });

    dataPoints.forEach((pt, i) => {
      const dotDelay = prefersReducedMotion ? 0 : 600 + i * 80;
      const dotDur = prefersReducedMotion ? 0 : 400;
      const dot = g.append('circle').attr('cx', prefersReducedMotion ? pt.x : 0).attr('cy', prefersReducedMotion ? pt.y : 0).attr('r', 5)
        .attr('fill', chartColor).attr('stroke', t.surface).attr('stroke-width', 2)
        .attr('filter', `url(#${glowId})`)
        .style('cursor', pt.axis.route ? 'pointer' : 'default').attr('opacity', prefersReducedMotion ? 1 : 0);

      dot.transition().delay(dotDelay).duration(dotDur).ease(d3.easeBounceOut)
        .attr('cx', pt.x).attr('cy', pt.y).attr('opacity', 1);

      dot
        .on('mouseenter', function(event) {
          d3.select(this).transition().duration(150).attr('r', 8);
          const pct = Math.round((pt.axis.value / pt.axis.max) * 100);
          tooltip.html(`<b>${pt.axis.label}</b>: ${pt.axis.value}/${pt.axis.max} (${pct}%)${pt.axis.route ? '<br/><span style="font-size: var(--font-size-xs);opacity:0.7">Click to drill in</span>' : ''}`)
            .style('opacity', '1').style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 10}px`);
        })
        .on('mousemove', function(event) { tooltip.style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 10}px`); })
        .on('mouseleave', function() { d3.select(this).transition().duration(150).attr('r', 5); tooltip.style('opacity', '0'); })
        .on('click', () => { emitter.emit(pt.axis); });
    });
  }
}
