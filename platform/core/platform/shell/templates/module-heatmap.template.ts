/**
 * Template 3 — Module Heatmap / Matrix
 * Story role: "Here's the landscape — see risk clusters at a glance."
 * IBM Carbon: tiles · content-switcher · search · tag · ai-label ·
 *   modal · tooltip · structured-list · notification · skeleton
 * Charts: chart.heatmap · chart.bubble (via @carbon/charts-angular)
 */
import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, ContentSwitcherModule, TagModule,
  NotificationModule, ModalModule, TooltipModule, StructuredListModule,
  SkeletonModule, BreadcrumbModule, ButtonModule, LinkModule
} from 'carbon-components-angular';
import { DosCarbonSearchComponent } from '@dos/ui-system';
import type { ModuleNotification, ModuleInsightPillars } from './module-template.types';
import { DosInsightBarComponent } from './dos-insight-bar.component';


export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  items?: Array<{ id: string; title: string; severity: string }>;
}

@Component({
  selector: 'dos-risk-landscape',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, ContentSwitcherModule, TagModule,
    NotificationModule, ModalModule, TooltipModule, StructuredListModule,
    SkeletonModule, BreadcrumbModule, ButtonModule, LinkModule,
    DosCarbonSearchComponent,
    DosInsightBarComponent,
  ],
  template: `
    @if (notification) {
      <cds-notification [notificationType]="notification.type"
        [title]="notification.title" [subtitle]="notification.subtitle ?? ''"
        [showClose]="true" lowContrast>
      </cds-notification>
    }

    <cds-tile class="dmt-masthead">
      <cds-breadcrumb [noTrailingSlash]="true" class="dmt-eyebrow-breadcrumb">
        <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      @if (aiHeadline) {
        <cds-ai-label kind="inline" size="sm" class="dmt-ai-headline">{{ aiHeadline }}</cds-ai-label>
      }
      <h1 class="dmt-title">{{ title }}</h1>
      @if (subtitle) { <p class="dmt-subtitle">{{ subtitle }}</p> }
      <div class="dmt-tags-row">
        @for (tag of summaryTags; track tag.label) {
          <cds-tag [type]="tagType(tag.severity)">{{ tag.label }}</cds-tag>
        }
      </div>
    </cds-tile>


      <!-- ── 5-Pillar Insight Bar ─────────────────────────────────────────── -->
      <dos-insight-bar
        [pillars]="pillars"
        archetype="risk-landscape"
        (actionClick)="pillars?.nextAction?.action?.()">
      </dos-insight-bar>

    <!-- Toolbar -->
    <div class="dmt-toolbar">
      <dos-carbon-search
        ariaLabelKey="shell.module-heatmap.search.ariaLabel"
        [placeholder]="'Find item...'"
        (valueChange)="searchChange.emit($event)"
        size="md">
      </dos-carbon-search>
      @if (viewOptions.length) {
        <cds-content-switcher (selected)="viewSwitch.emit($event)">
          @for (v of viewOptions; track v.id) {
            <button cdsContentSwitcherOption [name]="v.id">{{ v.label }}</button>
          }
        </cds-content-switcher>
      }
    </div>

    <!-- Loading -->
    @if (loading) {
      <cds-tile class="dmt-heatmap-tile">
        <div cdsSkeletonText [lines]="1" style="height:400px; width:100%;"></div>
      </cds-tile>
    }

    <!-- Heatmap grid -->
    @if (!loading) {
      <cds-tile class="dmt-heatmap-tile">
        <div class="dmt-heatmap-container">
          <!-- Y-axis labels -->
          <div class="dmt-heatmap-yaxis">
            @for (label of yLabels; track label) {
              <div class="dmt-yaxis-label">{{ label }}</div>
            }
          </div>
          <!-- Matrix -->
          <div class="dmt-heatmap-grid" [style.grid-template-columns]="'repeat(' + xLabels.length + ', 1fr)'">
            @for (cell of cells; track (cell.x + cell.y)) {
              <div class="dmt-heatmap-cell"
                [class]="'dmt-cell--' + cellSeverity(cell.value)"
                [title]="cell.value + ' items: ' + cell.x + ' × ' + cell.y"
                (click)="onCellClick(cell)"
                role="button" [attr.tabindex]="0">
                <span class="dmt-cell-value">{{ cell.value }}</span>
                @if (cell.value > 0) {
                  <span class="dmt-cell-hint">click</span>
                }
              </div>
            }
          </div>
          <!-- X-axis labels -->
          <div class="dmt-heatmap-xaxis">
            @for (label of xLabels; track label) {
              <div class="dmt-xaxis-label">{{ label }}</div>
            }
          </div>
        </div>

        <!-- Legend -->
        <div class="dmt-legend">
          @for (l of legend; track l.label) {
            <cds-tag [type]="tagType(l.severity)">{{ l.label }}</cds-tag>
          }
        </div>
      </cds-tile>

      <!-- Bottom: bubble chart slot + top items -->
      <div class="dmt-heatmap-footer">
        <cds-tile class="dmt-bubble-tile">
          <ng-content select="[dosBubbleChart]"></ng-content>
        </cds-tile>
        <cds-tile class="dmt-top-items-tile">
          <p class="dmt-section-label">Top Items in Critical Zone</p>
          <cds-structured-list>
            @for (item of topItems.slice(0,5); track item.id) {
              <cds-list-row>
                <cds-list-column><cds-tag [type]="tagType(item.severity)">{{ item.severity }}</cds-tag></cds-list-column>
                <cds-list-column><a cdsLink (click)="itemClick.emit(item)">{{ item.title }}</a></cds-list-column>
              </cds-list-row>
            }
          </cds-structured-list>
        </cds-tile>
      </div>
    }

    <!-- Cell detail modal -->
    <cds-modal [open]="modalOpen" (overlaySelected)="modalOpen = false" size="lg">
      <cds-modal-header>
        <p cdsModalHeaderLabel>{{ selectedCell?.x }} × {{ selectedCell?.y }}</p>
        <p cdsModalHeaderHeading>{{ selectedCell?.value ?? 0 }} Items in this zone</p>
      </cds-modal-header>
      <div cdsModalContent>
        @if (selectedCell?.items?.length) {
          <cds-structured-list>
            @for (item of selectedCell!.items!; track item.id) {
              <cds-list-row>
                <cds-list-column><cds-tag [type]="tagType(item.severity)">{{ item.severity }}</cds-tag></cds-list-column>
                <cds-list-column>{{ item.title }}</cds-list-column>
              </cds-list-row>
            }
          </cds-structured-list>
        }
      </div>
      <cds-modal-footer>
        <button cdsButton="secondary" (click)="modalOpen = false">Close</button>
        <button cdsButton="primary" (click)="viewAllInZone()">View All</button>
      </cds-modal-footer>
    </cds-modal>
  `,
  styles: [`
    :host { display: block; }
    .dmt-masthead { padding: 1.5rem 2rem; margin-bottom: 0; }
    .dmt-eyebrow-breadcrumb { margin-bottom: 0.5rem; }
    .dmt-ai-headline { margin-bottom: 0.5rem; }
    .dmt-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }
    .dmt-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0.25rem 0 0.75rem; }
    .dmt-tags-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .dmt-toolbar { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--cds-layer); border-bottom: 1px solid var(--cds-border-subtle); }
    .dmt-heatmap-tile { padding: 1.5rem; margin-top: 1rem; }
    .dmt-heatmap-container { display: flex; flex-direction: column; gap: 0.5rem; }
    .dmt-heatmap-yaxis { display: flex; flex-direction: column; justify-content: space-around; }
    .dmt-yaxis-label { font-size: 0.75rem; color: var(--cds-text-secondary); text-align: right; padding-right: 0.5rem; }
    .dmt-heatmap-grid { display: grid; gap: 2px; min-height: 320px; }
    .dmt-heatmap-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60px; cursor: pointer; border-radius: 2px; transition: opacity 0.2s; font-size: 1.25rem; font-weight: 300; }
    .dmt-heatmap-cell:hover { opacity: 0.85; }
    .dmt-cell--critical { background: var(--cds-support-error); color: #fff; }
    .dmt-cell--high     { background: var(--cds-support-warning); color: #000; }
    .dmt-cell--medium   { background: var(--cds-support-warning-inverse); color: #000; }
    .dmt-cell--low      { background: var(--cds-support-success); color: #fff; }
    .dmt-cell--none     { background: var(--cds-layer); color: var(--cds-text-disabled); }
    .dmt-cell-hint { font-size: 0.625rem; opacity: 0.7; }
    .dmt-heatmap-xaxis { display: flex; justify-content: space-around; margin-top: 0.5rem; }
    .dmt-xaxis-label { font-size: 0.75rem; color: var(--cds-text-secondary); text-align: center; }
    .dmt-legend { display: flex; gap: 0.5rem; margin-top: 1rem; }
    .dmt-heatmap-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
    .dmt-section-label { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; }
    @media (max-width: 768px) {
      .dmt-heatmap-footer { grid-template-columns: 1fr; }
    }
  `]
})
export class ModuleHeatmapTemplateComponent {
  @Input() eyebrow = '';
  @Input() title = 'Heatmap';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() cells: HeatmapCell[] = [];
  @Input() xLabels: string[] = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
  @Input() yLabels: string[] = ['Catastrophic', 'Major', 'Moderate', 'Minor', 'Negligible'];
  @Input() summaryTags: Array<{ label: string; severity?: string }> = [];
  @Input() viewOptions: Array<{ id: string; label: string }> = [];
  @Input() topItems: Array<{ id: string; title: string; severity: string }> = [];
  @Input() legend: Array<{ label: string; severity?: string }> = [
    { label: 'Critical', severity: 'critical' },
    { label: 'High', severity: 'high' },
    { label: 'Medium', severity: 'medium' },
    { label: 'Low', severity: 'low' },
  ];

  @Output() searchChange = new EventEmitter<string>();
  @Output() viewSwitch = new EventEmitter<unknown>();
  @Output() itemClick = new EventEmitter<{ id: string; title: string; severity: string }>();
  @Output() cellSelect = new EventEmitter<HeatmapCell>();

  modalOpen = false;
  selectedCell: HeatmapCell | null = null;

  cellSeverity(value: number): string {
    if (value === 0) return 'none';
    if (value >= 10) return 'critical';
    if (value >= 6) return 'high';
    if (value >= 3) return 'medium';
    return 'low';
  }

  tagType(severity?: string): string {
    const map: Record<string, string> = { critical: 'red', high: 'orange', medium: 'yellow', low: 'teal' };
    return map[severity ?? ''] ?? 'gray';
  }

  onCellClick(cell: HeatmapCell) {
    this.selectedCell = cell;
    if (cell.value > 0) this.modalOpen = true;
    this.cellSelect.emit(cell);
  }

  viewAllInZone() {
    this.modalOpen = false;
    if (this.selectedCell) this.cellSelect.emit(this.selectedCell);
  }
}
