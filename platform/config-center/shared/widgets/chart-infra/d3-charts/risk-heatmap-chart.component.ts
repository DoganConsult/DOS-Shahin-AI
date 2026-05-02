import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { resolveTheme, createPremiumTooltip, observeThemeChange } from './theme-bridge';

export interface HeatmapCell {
  likelihood: number;
  impact: number;
  count: number;
  riskIds?: string[];
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-heatmap-chart',
    imports: [CommonModule],
    template: `<div #chartContainer class="heatmap-area"></div>`,
    styles: [`.heatmap-area { width: 100%; overflow: visible; }`]
})
export class RiskHeatmapChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() cells: HeatmapCell[] = [];
  @Input() width = 360;
  @Input() height = 320;
  /** GAP 4: Dynamic matrix size — 3 for 3x3, 5 for 5x5. Defaults to 5. */
  @Input() matrixSize = 5;
  @Output() cellClicked = new EventEmitter<HeatmapCell>();
  @ViewChild('chartContainer') containerEl!: ElementRef<HTMLDivElement>;

  private initialized = false;
  private disposeThemeObserver?: () => void;

  ngAfterViewInit(): void { this.initialized = true; this.render(); this.disposeThemeObserver = observeThemeChange(() => this.render()); }
  ngOnChanges(c: SimpleChanges): void { if (this.initialized) this.render(); }
  ngOnDestroy(): void { this.disposeThemeObserver?.(); d3.select(this.containerEl?.nativeElement).selectAll('svg').remove(); }

  private render(): void {
      const el = this.containerEl.nativeElement;
      d3.select(el).selectAll('*').remove();

      const prefersReducedMotion = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      const t = resolveTheme(el);
      const margin = { top: 24, right: 16, bottom: 40, left: 52 };
      const w = this.width - margin.left - margin.right;
      const h = this.height - margin.top - margin.bottom;
      const gridSize = this.matrixSize || 5;
      const cellW = w / gridSize, cellH = h / gridSize;
      const emitter = this.cellClicked;

      const svg = d3.select(el).append('svg').attr('width', this.width).attr('height', this.height);
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const colorScale = d3.scaleLinear<string>()
        .domain([0, 1, 3, 8, 15]).range(['var(--status-success-bg, #defbe6)', 'var(--status-warning-bg, #fcf4d6)', '#fed7aa', '#fca5a5', '#991b1b']).clamp(true);

      const cellMap = new Map<string, HeatmapCell>();
      this.cells.forEach(c => cellMap.set(`${c.likelihood}-${c.impact}`, c));

      const tooltip = createPremiumTooltip(el, t);

      for (let li = 1; li <= gridSize; li++) {
        for (let im = 1; im <= gridSize; im++) {
          const cell = cellMap.get(`${li}-${im}`);
          const count = cell?.count || 0;
          const x = (im - 1) * cellW, y = (gridSize - li) * cellH;
          const cellColor = colorScale(count) as string;

          const rect = g.append('rect').attr('x', x).attr('y', y)
            .attr('width', cellW - 2).attr('height', cellH - 2).attr('rx', 6).attr('ry', 6)
            .attr('fill', cellColor).attr('stroke', t.surface).attr('stroke-width', 2)
            .style('cursor', count > 0 ? 'pointer' : 'default')
            .style('transition', 'fill 0.3s ease, filter 0.25s ease')
            .attr('opacity', prefersReducedMotion ? 1 : 0);

          if (!prefersReducedMotion) {
            rect.transition().delay((li - 1) * 60 + (im - 1) * 60).duration(400).attr('opacity', 1);
          }

          if (count > 0) {
            const countText = g.append('text').attr('x', x + cellW / 2 - 1).attr('y', y + cellH / 2)
              .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
              .attr('font-size', '16px').attr('font-weight', t.fontBlack)
              .attr('fill', count >= 5 ? '#fff' : t.textHeading).attr('pointer-events', 'none')
              .attr('opacity', prefersReducedMotion ? 1 : 0).text(count);

            if (!prefersReducedMotion) {
              countText.transition().delay((li - 1) * 60 + (im - 1) * 60 + 200).duration(300).attr('opacity', 1);
            }

            rect
              .on('mouseenter', function(event) {
                d3.select(this)
                  .transition().duration(150)
                  .attr('stroke', t.primary).attr('stroke-width', 3)
                  .on('end', function() {
                    d3.select(this).style('filter', `drop-shadow(0 0 8px ${cellColor})`);
                  });
                tooltip.html(`L${li} \u00D7 I${im} \u2014 <b>${count} risk${count > 1 ? 's' : ''}</b><br/><span style="font-size: var(--font-size-xs);opacity:0.7">Click to view</span>`)
                  .style('opacity', '1').style('left', `${event.offsetX + 14}px`).style('top', `${event.offsetY - 10}px`);
              })
              .on('mousemove', function(event) { tooltip.style('left', `${event.offsetX + 14}px`).style('top', `${event.offsetY - 10}px`); })
              .on('mouseleave', function() {
                d3.select(this)
                  .style('filter', 'none')
                  .transition().duration(150)
                  .attr('stroke', t.surface).attr('stroke-width', 2);
                tooltip.style('opacity', '0');
              })
              .on('click', function() { if (cell) emitter.emit(cell); });
          }
        }
      }

      const labels = ['1', '2', '3', '4', '5'];
      labels.forEach((l, i) => {
        g.append('text').attr('x', i * cellW + cellW / 2).attr('y', h + 16)
          .attr('text-anchor', 'middle').attr('font-size', '11px').attr('fill', t.textMuted).text(l);
        g.append('text').attr('x', -10).attr('y', (4 - i) * cellH + cellH / 2)
          .attr('text-anchor', 'end').attr('dominant-baseline', 'central').attr('font-size', '11px').attr('fill', t.textMuted).text(l);
      });

      svg.append('text').attr('x', margin.left + w / 2).attr('y', this.height - 4)
        .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', t.fontBold).attr('fill', t.textBody).text('Impact \u2192');
      svg.append('text').attr('transform', `translate(14,${margin.top + h / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', t.fontBold).attr('fill', t.textBody).text('Likelihood \u2192');
    }

}
