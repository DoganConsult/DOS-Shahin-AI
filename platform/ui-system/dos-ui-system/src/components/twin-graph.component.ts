import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosTwinNodeInput {
  id: string;
  label: string;
  labelAr?: string;
  kind: string;
  status?: string;
  ownerRole?: string;
}
export interface DosTwinEdgeInput {
  id: string;
  fromId: string;
  toId: string;
  kind: string;
  weight?: number;
  bidirectional?: boolean;
}

/**
 * DosTwinGraph — declarative SVG digital-twin renderer. Caller supplies
 * pre-computed node positions for deterministic layout. The component is
 * presentational; layout/topology computation lives in the caller's
 * resolver, keeping the component pure and SSR-safe.
 */
@Component({
  selector: 'dos-twin-graph',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="dos-twin">
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Twin graph">
        <g class="dos-twin__edges">
          @for (e of edges; track e.id) {
            <line
              [attr.x1]="positionOf(e.fromId).x" [attr.y1]="positionOf(e.fromId).y"
              [attr.x2]="positionOf(e.toId).x"   [attr.y2]="positionOf(e.toId).y"
              [attr.stroke-width]="(e.weight ?? 1)"
              stroke="currentColor" stroke-opacity="0.35"
              [attr.stroke-dasharray]="e.bidirectional ? '0' : '4 3'" />
          }
        </g>
        <g class="dos-twin__nodes">
          @for (n of nodes; track n.id) {
            <g [attr.transform]="'translate(' + positionOf(n.id).x + ',' + positionOf(n.id).y + ')'"
               class="dos-twin__node" tabindex="0"
               [attr.data-kind]="n.kind" [attr.data-status]="n.status"
               (click)="nodeClick.emit(n.id)" (keydown.enter)="nodeClick.emit(n.id)">
              <circle r="14"></circle>
              <text y="28" text-anchor="middle" font-size="10">{{ n.label }}</text>
            </g>
          }
        </g>
      </svg>
      @if (caption) { <figcaption>{{ caption }}</figcaption> }
    </figure>
  `,
  styles: [`
    .dos-twin { margin: 0; }
    .dos-twin svg { width: 100%; height: auto; color: var(--dos-color-text-subtle, #525252); }
    .dos-twin__node circle { fill: var(--dos-color-accent, #0f62fe); cursor: pointer; }
    .dos-twin__node[data-status='critical'] circle { fill: #da1e28; }
    .dos-twin__node[data-status='warning']  circle { fill: #f1c21b; }
    .dos-twin__node[data-status='success']  circle { fill: #24a148; }
    .dos-twin__node text { fill: var(--dos-color-text, #161616); }
    figcaption { font-size: 0.75rem; color: var(--dos-color-text-subtle, #525252); margin-top: 0.5rem; }
  `],
})
export class DosTwinGraphComponent {
  @Input() nodes: DosTwinNodeInput[] = [];
  @Input() edges: DosTwinEdgeInput[] = [];
  @Input() positions: Record<string, { x: number; y: number }> = {};
  @Input() width = 800;
  @Input() height = 400;
  @Input() caption?: string;
  @Output() nodeClick = new EventEmitter<string>();

  positionOf(id: string): { x: number; y: number } {
    return this.positions[id] ?? { x: 0, y: 0 };
  }
}
