import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import * as d3 from 'd3';
import { resolveTheme, createPremiumTooltip, observeThemeChange } from './theme-bridge';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-gauge-chart',
  standalone: true,
  template: `<div tabindex="0" role="button" (keyup.enter)="gaugeClicked.emit(value)" #chartContainer class="gauge-area" (click)="gaugeClicked.emit(value)"></div>`,
  styles: [`.gauge-area { cursor: pointer; display: inline-block; }`],
})
export class GaugeChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() value = 0;
  @Input() max = 100;
  @Input() size = 140;
  @Input() label = '';
  @Input() thresholds: { color: string; upTo: number }[] = [
    { color: '#22c55e', upTo: 40 },
    { color: '#f59e0b', upTo: 70 },
    { color: '#ef4444', upTo: 100 },
  ];
  @Output() gaugeClicked = new EventEmitter<number>();
  @ViewChild('chartContainer') containerEl!: ElementRef<HTMLDivElement>;

  private initialized = false;
  private static instanceCounter = 0;
  private instanceId = ++GaugeChartComponent.instanceCounter;
  private disposeThemeObserver?: () => void;

  ngAfterViewInit(): void { this.initialized = true; this.render(); this.disposeThemeObserver = observeThemeChange(() => this.render()); }
  ngOnChanges(c: SimpleChanges): void { if (this.initialized) this.render(); }
  ngOnDestroy(): void { this.disposeThemeObserver?.(); d3.select(this.containerEl?.nativeElement).selectAll('svg').remove(); }

  private render(): void {
    const el = this.containerEl.nativeElement;
    d3.select(el).selectAll('svg').remove();

    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const t = resolveTheme(el);
    const w = this.size, h = this.size * 0.65;
    const radius = w / 2 - 8, arcWidth = 14;
    const pct = Math.min(this.value / this.max, 1);
    const color = this.thresholds.reduce((c, th) => this.value <= th.upTo ? c || th.color : '', '') || t.textMuted;

    const uid = `gauge-${this.instanceId}`;
    const gradientId = `${uid}-gradient`;
    const glowId = `${uid}-glow`;

    const svg = d3.select(el).append('svg').attr('width', w).attr('height', h);

    // Premium SVG defs: gradient + glow filter
    const defs = svg.append('defs');

    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', t.primary);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', t.primaryLight);

    const filter = defs.append('filter')
      .attr('id', glowId)
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    filter.append('feDropShadow')
      .attr('dx', '0').attr('dy', '0')
      .attr('stdDeviation', '3')
      .attr('flood-color', t.primary)
      .attr('flood-opacity', '0.4');

    const g = svg.append('g').attr('transform', `translate(${w / 2},${h - 10})`);

    const bgArc = d3.arc().innerRadius(radius - arcWidth).outerRadius(radius)
      .startAngle(-Math.PI / 2).endAngle(Math.PI / 2).cornerRadius(arcWidth / 2);
    g.append('path').attr('d', (bgArc as any)({}) || '').attr('fill', t.borderSubtle);

    const valueArc = d3.arc().innerRadius(radius - arcWidth).outerRadius(radius)
      .startAngle(-Math.PI / 2).cornerRadius(arcWidth / 2);
    const valuePath = g.append('path')
      .attr('fill', `url(#${gradientId})`)
      .attr('filter', `url(#${glowId})`);

    const dur = prefersReducedMotion ? 0 : 1200;

    valuePath.transition().duration(dur).ease(d3.easeCubicInOut)
      .attrTween('d', () => {
        const interp = d3.interpolate(-Math.PI / 2, -Math.PI / 2 + Math.PI * pct);
        return (tt: number) => (valueArc.endAngle(interp(tt)) as any)({}) || '';
      });

    const valText = g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.3em')
      .attr('font-size', `${Math.max(18, w / 6)}px`).attr('font-weight', t.fontBlack).attr('fill', color);
    valText.transition().duration(dur).ease(d3.easeCubicInOut)
      .tween('text', () => {
        const i = d3.interpolateRound(0, this.value);
        return (tt: number) => { valText.text(`${i(tt)}`); };
      });

    if (this.label) {
      g.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
        .attr('font-size', '10px').attr('fill', t.textMuted).text(this.label);
    }

    // Premium glass tooltip on gauge hover
    const tooltip = createPremiumTooltip(el, t);
    const label = this.label;
    const value = this.value;
    const max = this.max;

    svg
      .on('mouseenter', function(event) {
        const pctVal = Math.round((value / max) * 100);
        tooltip.html(`${label ? `<b>${label}</b>: ` : ''}${value} / ${max} (${pctVal}%)`)
          .style('opacity', '1')
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mousemove', function(event) {
        tooltip.style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', function() {
        tooltip.style('opacity', '0');
      });
  }
}

