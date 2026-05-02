import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import * as d3 from 'd3';
import { resolveTheme, createPremiumTooltip, observeThemeChange } from './theme-bridge';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-progress-ring-chart',
  standalone: true,
  template: `<div tabindex="0" role="button" (keyup.enter)="ringClicked.emit(value)" #chartContainer class="ring-area" (click)="ringClicked.emit(value)"></div>`,
  styles: [`.ring-area { display: inline-block; cursor: pointer; transition: transform 0.2s; } .ring-area:hover { transform: scale(1.05); }`],
})
export class ProgressRingChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() value = 0;
  @Input() max = 100;
  @Input() size = 80;
  @Input() strokeWidth = 8;
  @Input() color = '#3b82f6';
  @Input() trackColor = '';
  @Input() label = '';
  @Output() ringClicked = new EventEmitter<number>();
  @ViewChild('chartContainer') containerEl!: ElementRef<HTMLDivElement>;

  private initialized = false;
  private static instanceCounter = 0;
  private instanceId = ++ProgressRingChartComponent.instanceCounter;
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
    const track = this.trackColor || t.borderSubtle;
    const s = this.size, r = (s - this.strokeWidth) / 2;
    const circumference = 2 * Math.PI * r;
    const pct = Math.min(this.value / this.max, 1);

    const uid = `ring-${this.instanceId}`;
    const gradientId = `${uid}-gradient`;
    const glowId = `${uid}-glow`;

    const svg = d3.select(el).append('svg').attr('width', s).attr('height', s);

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

    // Track circle
    svg.append('circle').attr('cx', s / 2).attr('cy', s / 2).attr('r', r)
      .attr('fill', 'none').attr('stroke', track).attr('stroke-width', this.strokeWidth);

    // Progress arc with gradient fill and glow
    const arc = svg.append('circle').attr('cx', s / 2).attr('cy', s / 2).attr('r', r)
      .attr('fill', 'none').attr('stroke', `url(#${gradientId})`)
      .attr('stroke-width', this.strokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', `${circumference} ${circumference}`)
      .attr('stroke-dashoffset', circumference)
      .attr('transform', `rotate(-90 ${s / 2} ${s / 2})`)
      .attr('filter', `url(#${glowId})`);

    const arcDur = prefersReducedMotion ? 0 : 1200;

    arc.transition().duration(arcDur).ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', circumference * (1 - pct));

    // Endpoint glow dot — positioned at the arc endpoint
    const endAngle = -Math.PI / 2 + 2 * Math.PI * pct;
    const dotCx = s / 2 + r * Math.cos(endAngle);
    const dotCy = s / 2 + r * Math.sin(endAngle);
    const dotRadius = this.strokeWidth / 2.5;

    // Pulse ring on endpoint (skip if reduced motion)
    if (!prefersReducedMotion) {
      const pulseRing = svg.append('circle')
        .attr('cx', dotCx).attr('cy', dotCy)
        .attr('r', dotRadius).attr('fill', 'none')
        .attr('stroke', t.primaryLight).attr('stroke-width', 1.5)
        .attr('opacity', 0);

      pulseRing.transition().delay(1100).duration(300).attr('opacity', 0.6)
        .on('end', function repeat() {
          d3.select(this)
            .attr('r', dotRadius).attr('opacity', 0.6)
            .transition().duration(1200).ease(d3.easeCubicOut)
            .attr('r', dotRadius * 3).attr('opacity', 0)
            .on('end', repeat);
        });
    }

    // Solid glow dot at endpoint
    const dotDelay = prefersReducedMotion ? 0 : 1100;
    const dotDur = prefersReducedMotion ? 0 : 300;
    svg.append('circle')
      .attr('cx', dotCx).attr('cy', dotCy)
      .attr('r', dotRadius).attr('fill', t.primaryLight)
      .attr('opacity', prefersReducedMotion ? 1 : 0)
      .style('filter', `drop-shadow(0 0 3px ${t.primary})`)
      .transition().delay(dotDelay).duration(dotDur).attr('opacity', 1);

    // Animated percentage counting
    const valText = svg.append('text')
      .attr('x', s / 2).attr('y', this.label ? s / 2 - 4 : s / 2)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', `${Math.max(12, s / 5)}px`).attr('font-weight', t.fontBlack).attr('fill', t.primary);

    valText.transition().duration(arcDur).ease(d3.easeCubicOut)
      .tween('text', () => {
        const i = d3.interpolateRound(0, Math.round(pct * 100));
        return (tt: number) => { valText.text(`${i(tt)}%`); };
      });

    if (this.label) {
      svg.append('text').attr('x', s / 2).attr('y', s / 2 + 10)
        .attr('text-anchor', 'middle').attr('font-size', '9px').attr('fill', t.textMuted).text(this.label);
    }

    // Premium glass tooltip on ring hover
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
