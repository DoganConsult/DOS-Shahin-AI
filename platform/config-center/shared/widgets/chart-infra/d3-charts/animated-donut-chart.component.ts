import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { resolveTheme, D3Theme, createPremiumTooltip, observeThemeChange } from './theme-bridge';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  route?: string;
  filterKey?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-animated-donut-chart',
    imports: [CommonModule],
    template: `
    <div class="donut-wrap">
      <div #chartContainer class="donut-svg-area"></div>
      <div class="donut-legend" *ngIf="showLegend">
        <div tabindex="0" role="button" (keyup.enter)="onSegmentClick(s)" *ngFor="let s of segments" class="donut-legend-item" (click)="onSegmentClick(s)" [class.clickable]="!!s.route || !!s.filterKey">
          <span class="donut-dot" [style.background]="s.color"></span>
          <span class="donut-legend-label">{{ s.label }}</span>
          <span class="donut-legend-val">{{ s.value }}</span>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .donut-wrap { display: flex; flex-direction: column; align-items: center; gap: var(--space-md, 16px); }
    .donut-svg-area { position: relative; }
    .donut-legend { display: flex; flex-wrap: wrap; gap: var(--space-sm, 12px); justify-content: center; }
    .donut-legend-item { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs, 12px); transition: transform 0.15s; }
    .donut-legend-item.clickable { cursor: pointer; }
    .donut-legend-item.clickable:hover { transform: scale(1.05); }
    .donut-dot { width: 10px; height: 10px; border-radius: var(--radius-pill); flex-shrink: 0; }
    .donut-legend-label { color: var(--text-muted); }
    .donut-legend-val { font-weight: var(--font-black, 800); color: var(--text-heading); }
  `]
})
export class AnimatedDonutChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() segments: DonutSegment[] = [];
  @Input() size = 220;
  @Input() thickness = 32;
  @Input() centerLabel = '';
  @Input() centerValue = '';
  @Input() showLegend = true;
  @Output() segmentClicked = new EventEmitter<DonutSegment>();
  @ViewChild('chartContainer') containerEl!: ElementRef<HTMLDivElement>;

  private initialized = false;
  private static instanceCounter = 0;
  private instanceId = AnimatedDonutChartComponent.instanceCounter++;
  private disposeThemeObserver?: () => void;

  ngAfterViewInit(): void { this.initialized = true; this.render(); this.disposeThemeObserver = observeThemeChange(() => this.render()); }
  ngOnChanges(changes: SimpleChanges): void { if (this.initialized) this.render(); }
  ngOnDestroy(): void { this.disposeThemeObserver?.(); d3.select(this.containerEl?.nativeElement).selectAll('svg').remove(); }
  onSegmentClick(seg: DonutSegment): void { this.segmentClicked.emit(seg); }

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
    const container = this.containerEl.nativeElement;
    d3.select(container).selectAll('*').remove();
    if (!this.segments.length) return;

    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const t = resolveTheme(container);
    const w = this.size, h = this.size;
    const radius = Math.min(w, h) / 2;
    const innerRadius = radius - this.thickness;
    const emitter = this.segmentClicked;
    const instId = this.instanceId;

    const svg = d3.select(container).append('svg').attr('width', w).attr('height', h);
    const defs = svg.append('defs');
    defs.append('filter').attr('id', `donut-glow-${instId}`).append('feDropShadow')
      .attr('dx', 0).attr('dy', 2).attr('stdDeviation', 3).attr('flood-opacity', 0.15);

    // Per-segment linear gradients
    this.segments.forEach((seg, i) => {
      const grad = defs.append('linearGradient')
        .attr('id', `donut-${instId}-seg-${i}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '100%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', seg.color);
      grad.append('stop').attr('offset', '100%').attr('stop-color', this.lightenColor(seg.color));
    });

    const g = svg.append('g').attr('transform', `translate(${w / 2},${h / 2})`);
    const pie = d3.pie<DonutSegment>().value(d => d.value).sort(null).padAngle(0.02);
    const arc = d3.arc<d3.PieArcDatum<DonutSegment>>().innerRadius(innerRadius).outerRadius(radius).cornerRadius(4);
    const hoverArc = d3.arc<d3.PieArcDatum<DonutSegment>>().innerRadius(innerRadius - 2).outerRadius(radius + 10).cornerRadius(4);

    const tooltip = this.createTooltip(container, t);

    const paths = g.selectAll('path').data(pie(this.segments)).join('path')
      .attr('fill', (_d, i) => `url(#donut-${instId}-seg-${i})`)
      .attr('stroke', t.surface).attr('stroke-width', 2)
      .style('cursor', 'pointer').attr('filter', `url(#donut-glow-${instId})`);

    const segDur = prefersReducedMotion ? 0 : 900;

    paths.transition().duration(segDur).ease(d3.easeCubicOut)
      .attrTween('d', function(d) {
        const interp = d3.interpolate({ startAngle: 0, endAngle: 0 } as unknown, d);
        return (tt) => arc(interp(tt)) || '';
      });

    paths
      .on('mouseenter', function(event, d) {
        d3.select(this).transition().duration(200).attr('d', hoverArc(d) || '').style('filter', `url(#donut-glow-${instId}) brightness(1.1)`);
        const allData = g.selectAll('path').data() as d3.PieArcDatum<DonutSegment>[];
        const total = allData.reduce((s, x) => s + x.data.value, 0) || 1;
        const pct = Math.round((d.data.value / total) * 100);
        tooltip.html(`<span style="color:${d.data.color}">\u25CF</span> ${d.data.label}: <b>${d.data.value}</b> (${pct}%)`)
          .style('opacity', '1').style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 8}px`);
      })
      .on('mousemove', function(event) { tooltip.style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 8}px`); })
      .on('mouseleave', function(_event, d) {
        d3.select(this).transition().duration(200).attr('d', arc(d) || '').style('filter', `url(#donut-glow-${instId})`);
        tooltip.style('opacity', '0');
      })
      .on('click', function(_event, d) { emitter.emit(d.data); });

    if (this.centerValue) {
      const centerText = g.append('text').attr('text-anchor', 'middle')
        .attr('dy', this.centerLabel ? '-0.2em' : '0.35em')
        .attr('font-size', '28px').attr('font-weight', t.fontBlack)
        .attr('fill', t.textHeading).attr('opacity', prefersReducedMotion ? 1 : 0)
        .style('filter', 'drop-shadow(0 1px 2px rgba(var(--color-black-rgb), 0.3))');
      centerText.transition().delay(prefersReducedMotion ? 0 : 400).duration(prefersReducedMotion ? 0 : 500).attr('opacity', 1)
        .textTween(() => {
          const num = parseInt(this.centerValue, 10);
          if (isNaN(num)) return () => this.centerValue;
          const i = d3.interpolateRound(0, num);
          return (tt) => `${i(tt)}`;
        });
    }

    if (this.centerLabel) {
      g.append('text').attr('text-anchor', 'middle').attr('dy', '1.4em')
        .attr('font-size', '11px').attr('fill', t.textMuted)
        .attr('opacity', prefersReducedMotion ? 1 : 0).text(this.centerLabel)
        .transition().delay(prefersReducedMotion ? 0 : 600).duration(prefersReducedMotion ? 0 : 400).attr('opacity', 1);
    }
  }

  private createTooltip(container: HTMLElement, t: D3Theme) {
    return createPremiumTooltip(container, t);
  }

}
