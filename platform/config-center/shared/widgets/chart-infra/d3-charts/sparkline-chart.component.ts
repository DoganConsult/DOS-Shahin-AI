import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import * as d3 from 'd3';
import { resolveTheme, createPremiumTooltip, observeThemeChange } from './theme-bridge';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sparkline-chart',
  standalone: true,
  template: `<div tabindex="0" role="button" [attr.aria-label]="'Sparkline chart'" (keyup.enter)="sparkClicked.emit(data)" #chartContainer class="spark-area" (click)="sparkClicked.emit(data)"></div>`,
  styles: [`.spark-area { display: inline-block; cursor: pointer; }`],
})
export class SparklineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: number[] = [];
  @Input() width = 120;
  @Input() height = 36;
  @Input() color = '#3b82f6';
  @Input() showArea = true;
  @Output() sparkClicked = new EventEmitter<number[]>();
  @ViewChild('chartContainer') containerEl!: ElementRef<HTMLDivElement>;

  private initialized = false;
  private static instanceCounter = 0;
  private instanceId = ++SparklineChartComponent.instanceCounter;
  private disposeThemeObserver?: () => void;

  ngAfterViewInit(): void { this.initialized = true; this.render(); this.disposeThemeObserver = observeThemeChange(() => this.render()); }
  ngOnChanges(c: SimpleChanges): void { if (this.initialized) this.render(); }
  ngOnDestroy(): void { this.disposeThemeObserver?.(); d3.select(this.containerEl?.nativeElement).selectAll('svg').remove(); }

  private render(): void {
    const el = this.containerEl.nativeElement;
    d3.select(el).selectAll('svg').remove();
    if (!this.data.length) return;

    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const t = resolveTheme(el);
    const w = this.width, h = this.height, pad = 2;
    const svg = d3.select(el).append('svg').attr('width', w).attr('height', h).attr('role', 'img').attr('aria-label', 'Sparkline trend');

    const uid = `spark-${this.instanceId}`;
    const gradientId = `${uid}-grad`;
    const glowId = `${uid}-glow`;
    const defs = svg.append('defs');

    // Area gradient: primary → transparent with higher initial opacity (0.4)
    const grad = defs.append('linearGradient').attr('id', gradientId)
      .attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1');
    grad.append('stop').attr('offset', '0%').attr('stop-color', this.color).attr('stop-opacity', 0.4);
    grad.append('stop').attr('offset', '100%').attr('stop-color', this.color).attr('stop-opacity', 0);

    // Line glow filter: drop-shadow for subtle glow
    const filter = defs.append('filter')
      .attr('id', glowId)
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    filter.append('feDropShadow')
      .attr('dx', '0').attr('dy', '2')
      .attr('stdDeviation', '4')
      .attr('flood-color', this.color)
      .attr('flood-opacity', '0.5');

    const x = d3.scaleLinear().domain([0, this.data.length - 1]).range([pad, w - pad]);
    const y = d3.scaleLinear().domain([d3.min(this.data)! * 0.9, d3.max(this.data)! * 1.1]).range([h - pad, pad]);
    const line = d3.line<number>().x((_, i) => x(i)).y(d => y(d)).curve(d3.curveCatmullRom.alpha(0.5));

    if (this.showArea) {
      const area = d3.area<number>().x((_, i) => x(i)).y0(h).y1(d => y(d)).curve(d3.curveCatmullRom.alpha(0.5));
      svg.append('path').datum(this.data).attr('fill', `url(#${gradientId})`).attr('d', area);
    }

    // Line path with glow filter
    const path = svg.append('path').datum(this.data)
      .attr('fill', 'none').attr('stroke', this.color).attr('stroke-width', 2)
      .attr('stroke-linecap', 'round').attr('d', line)
      .attr('filter', `url(#${glowId})`);
    const totalLen = path.node()?.getTotalLength() || 0;
    const lineDur = prefersReducedMotion ? 0 : 1000;
    const dotDelay = prefersReducedMotion ? 0 : 900;
    const dotDur = prefersReducedMotion ? 0 : 300;
    path.attr('stroke-dasharray', `${totalLen} ${totalLen}`).attr('stroke-dashoffset', totalLen)
      .transition().duration(lineDur).ease(d3.easeCubicOut).attr('stroke-dashoffset', 0);

    // Endpoint dot + concentric pulse ring
    const last = this.data[this.data.length - 1];
    const cx = x(this.data.length - 1);
    const cy = y(last);

    // Pulse ring: animated expanding circle (skip if reduced motion)
    if (!prefersReducedMotion) {
      const pulseRing = svg.append('circle')
        .attr('cx', cx).attr('cy', cy)
        .attr('r', 3).attr('fill', 'none')
        .attr('stroke', this.color).attr('stroke-width', 1.5)
        .attr('opacity', 0);

      pulseRing.transition().delay(dotDelay).duration(dotDur).attr('opacity', 0.6)
        .on('end', function repeat() {
          d3.select(this)
            .attr('r', 3).attr('opacity', 0.6)
            .transition().duration(1200).ease(d3.easeCubicOut)
            .attr('r', 8).attr('opacity', 0)
            .on('end', repeat);
        });
    }

    // Solid endpoint dot
    svg.append('circle').attr('cx', cx).attr('cy', cy)
      .attr('r', 3).attr('fill', this.color).attr('opacity', prefersReducedMotion ? 1 : 0)
      .transition().delay(dotDelay).duration(dotDur).attr('opacity', 1);

    // Premium glass tooltip on sparkline hover
    const tooltip = createPremiumTooltip(el, t);
    const data = this.data;
    const xScale = x;

    svg
      .on('mouseenter', function(event) {
        const mouseX = event.offsetX;
        const idx = Math.round(xScale.invert(mouseX));
        const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));
        tooltip.html(`<b>${data[clampedIdx]}</b>`)
          .style('opacity', '1')
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mousemove', function(event) {
        const mouseX = event.offsetX;
        const idx = Math.round(xScale.invert(mouseX));
        const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));
        tooltip.html(`<b>${data[clampedIdx]}</b>`)
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', function() {
        tooltip.style('opacity', '0');
      });
  }
}
