/**
 * Entity Graph Component
 * 
 * D3.js force-directed graph visualization for entity relationships.
 * Requirements: 1.5
 */
import { Component, OnInit, OnDestroy, Input, ElementRef, ViewChild, AfterViewInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { GrcRecord } from '@app/core/models/shared.types';

interface GraphNode {
  id: string;
  type: string;
  title: string;
  status?: string;
  linkCount: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  linkType: string;
}

interface EntityGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const TYPE_COLORS: Record<string, string> = {
  risk: 'var(--error)',
  control: '#3b82f6',
  policy: '#8b5cf6',
  evidence: '#10b981',
  incident: 'var(--warning)',
  vendor: '#6366f1',
  framework: '#06b6d4',
  assessment: '#ec4899',
  default: 'var(--text-muted)',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-entity-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="entity-graph-container">
      <div class="graph-controls">
        <button (click)="zoomIn()" aria-label="Zoom in"><i class="pi pi-plus"></i></button>
        <button (click)="zoomOut()" aria-label="Zoom out"><i class="pi pi-minus"></i></button>
        <button (click)="resetZoom()" aria-label="Reset zoom"><i class="pi pi-refresh"></i></button>
      </div>
      <div #graphContainer class="graph-canvas"></div>
      <div *ngIf="selectedNode" class="node-tooltip" [style.left.px]="tooltipX" [style.top.px]="tooltipY">
        <strong>{{ selectedNode.title }}</strong>
        <div class="tooltip-type">{{ selectedNode.type }}</div>
        <div *ngIf="selectedNode.status" class="tooltip-status">{{ selectedNode.status }}</div>
        <div class="tooltip-links">{{ selectedNode.linkCount }} connections</div>
      </div>
      <div *ngIf="loading" class="loading-overlay">
        <i class="pi pi-spin pi-spinner"></i>
      </div>
    </div>
  `,
  styles: [`
    .entity-graph-container { position: relative; width: 100%; height: 400px; border: 1px solid var(--surface-border, #e0e0e0); border-radius: var(--radius); overflow: hidden; }
    .graph-controls { position: absolute; top: 8px; right: 8px; z-index: var(--z-base); display: flex; gap: 4px; }
    .graph-controls button { width: 32px; height: 32px; border: 1px solid var(--surface-border, #ddd); border-radius: var(--radius-sm); background: var(--surface-card, #fff); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .graph-canvas { width: 100%; height: 100%; }
    .loading-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(var(--color-white-rgb), 0.7); }
    .node-tooltip { position: absolute; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, #ddd); border-radius: var(--radius-sm); padding: 8px 12px; font-size: var(--font-size-sm); pointer-events: none; z-index: var(--z-base); box-shadow: var(--shadow-sm); }
    .tooltip-type { color: var(--text-color-secondary, #666); text-transform: capitalize; }
    .tooltip-status { margin-top: 2px; }
    .tooltip-links { margin-top: 2px; color: var(--text-color-secondary, #888); }
  `]
})
export class EntityGraphComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() entityType = '';
  @Input() entityId = '';
  @Input() depth = 2;
  @ViewChild('graphContainer') graphContainer!: ElementRef;

  graph: EntityGraph = { nodes: [], edges: [] };
  loading = false;
  selectedNode: GraphNode | null = null;
  tooltipX = 0;
  tooltipY = 0;
  private zoomLevel = 1;
  private panX = 0;
  private panY = 0;
  private svgEl: SVGSVGElement | null = null;
  private simulation: GrcRecord | null = null;
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (this.entityType && this.entityId) this.loadGraph();
  }

  ngAfterViewInit(): void {
    // If graph data was loaded before view init, render now
    if (this.graph.nodes.length > 0) this.renderGraph();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.simulation) this.simulation = null;
  }

  loadGraph(): void {
    this.loading = true;
    this.http.get<{ data: EntityGraph }>(
      `/api/entity-links/${this.entityType}/${this.entityId}/graph?depth=${this.depth}`
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => { this.graph = res.data; this.renderGraph(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  private renderGraph(): void {
    if (!this.graphContainer?.nativeElement || this.graph.nodes.length === 0) return;

    const container = this.graphContainer.nativeElement as HTMLElement;
    container.innerHTML = '';

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.cursor = 'grab';
    container.appendChild(svg);
    this.svgEl = svg;

    // Root group for zoom/pan transforms
    const rootG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    rootG.setAttribute('class', 'graph-root');
    svg.appendChild(rootG);

    // Build node index for edge lookups
    const nodeMap = new Map<string, GraphNode>();
    this.graph.nodes.forEach((n, i) => {
      n.x = width / 2 + (Math.cos(i * 2.4) * Math.min(width, height) * 0.3);
      n.y = height / 2 + (Math.sin(i * 2.4) * Math.min(width, height) * 0.3);
      n.vx = 0;
      n.vy = 0;
      nodeMap.set(n.id, n);
    });

    // Draw edges
    const edgeElements: SVGLineElement[] = [];
    for (const edge of this.graph.edges) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', '#cbd5e1');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-opacity', '0.6');
      rootG.appendChild(line);
      edgeElements.push(line);
    }

    // Draw edge labels
    const edgeLabelElements: SVGTextElement[] = [];
    for (const edge of this.graph.edges) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('font-size', '9');
      text.setAttribute('fill', '#94a3b8');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = edge.linkType;
      rootG.appendChild(text);
      edgeLabelElements.push(text);
    }

    // Draw nodes
    const nodeGroups: SVGGElement[] = [];
    for (const node of this.graph.nodes) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = 'pointer';

      const radius = Math.max(12, Math.min(24, 10 + node.linkCount * 2));
      const color = TYPE_COLORS[node.type] || TYPE_COLORS['default'];

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', String(radius));
      circle.setAttribute('fill', color);
      circle.setAttribute('stroke', '#fff');
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('opacity', '0.9');
      g.appendChild(circle);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dy', String(radius + 14));
      label.setAttribute('font-size', '11');
      label.setAttribute('fill', 'var(--text-color, #334155)');
      label.textContent = node.title.length > 18 ? node.title.slice(0, 16) + '…' : node.title;
      g.appendChild(label);

      // Hover/click for tooltip
      g.addEventListener('mouseenter', () => {
        this.selectedNode = node;
        this.tooltipX = (node.x || 0) + radius + 8;
        this.tooltipY = (node.y || 0) - 10;
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', '3');
      });
      g.addEventListener('mouseleave', () => {
        this.selectedNode = null;
        circle.setAttribute('stroke', '#fff');
        circle.setAttribute('stroke-width', '2');
      });

      rootG.appendChild(g);
      nodeGroups.push(g);
    }

    // Simple force simulation (no D3 dependency — pure JS)
    const alpha = { value: 1 };
    const alphaDecay = 0.02;
    const velocityDecay = 0.6;
    const centerX = width / 2;
    const centerY = height / 2;

    const tick = () => {
      if (alpha.value < 0.001) return;
      alpha.value *= (1 - alphaDecay);

      const nodes = this.graph.nodes;
      const edges = this.graph.edges;

      // Repulsion between all node pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[j].x || 0) - (nodes[i].x || 0);
          const dy = (nodes[j].y || 0) - (nodes[i].y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = -300 * alpha.value / (dist * dist);
          const fx = force * dx / dist;
          const fy = force * dy / dist;
          nodes[i].vx = (nodes[i].vx || 0) - fx;
          nodes[i].vy = (nodes[i].vy || 0) - fy;
          nodes[j].vx = (nodes[j].vx || 0) + fx;
          nodes[j].vy = (nodes[j].vy || 0) + fy;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;
        const dx = (t.x || 0) - (s.x || 0);
        const dy = (t.y || 0) - (s.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 100) * 0.05 * alpha.value;
        const fx = force * dx / dist;
        const fy = force * dy / dist;
        s.vx = (s.vx || 0) + fx;
        s.vy = (s.vy || 0) + fy;
        t.vx = (t.vx || 0) - fx;
        t.vy = (t.vy || 0) - fy;
      }

      // Center gravity
      for (const node of nodes) {
        node.vx = (node.vx || 0) + (centerX - (node.x || 0)) * 0.01 * alpha.value;
        node.vy = (node.vy || 0) + (centerY - (node.y || 0)) * 0.01 * alpha.value;
      }

      // Apply velocity and damping
      for (const node of nodes) {
        node.vx = (node.vx || 0) * velocityDecay;
        node.vy = (node.vy || 0) * velocityDecay;
        node.x = (node.x || 0) + (node.vx || 0);
        node.y = (node.y || 0) + (node.vy || 0);
        // Clamp to bounds
        node.x = Math.max(30, Math.min(width - 30, node.x));
        node.y = Math.max(30, Math.min(height - 30, node.y));
      }

      // Update SVG positions
      for (let i = 0; i < nodes.length; i++) {
        nodeGroups[i].setAttribute('transform', `translate(${nodes[i].x},${nodes[i].y})`);
      }
      for (let i = 0; i < edges.length; i++) {
        const s = nodeMap.get(edges[i].source);
        const t = nodeMap.get(edges[i].target);
        if (s && t) {
          edgeElements[i].setAttribute('x1', String(s.x));
          edgeElements[i].setAttribute('y1', String(s.y));
          edgeElements[i].setAttribute('x2', String(t.x));
          edgeElements[i].setAttribute('y2', String(t.y));
          edgeLabelElements[i].setAttribute('x', String(((s.x || 0) + (t.x || 0)) / 2));
          edgeLabelElements[i].setAttribute('y', String(((s.y || 0) + (t.y || 0)) / 2 - 4));
        }
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    this.applyTransform(rootG);

    // Pan support via mouse drag on SVG
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    svg.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as Element).tagName === 'circle') return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      svg.style.cursor = 'grabbing';
    });
    svg.addEventListener('mousemove', (e: MouseEvent) => {
      if (!dragging) return;
      this.panX += e.clientX - lastX;
      this.panY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      this.applyTransform(rootG);
    });
    svg.addEventListener('mouseup', () => { dragging = false; svg.style.cursor = 'grab'; });
    svg.addEventListener('mouseleave', () => { dragging = false; svg.style.cursor = 'grab'; });

    // Wheel zoom
    svg.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoomLevel = Math.max(0.3, Math.min(3, this.zoomLevel * delta));
      this.applyTransform(rootG);
    });
  }

  private applyTransform(g: SVGGElement): void {
    g.setAttribute('transform', `translate(${this.panX},${this.panY}) scale(${this.zoomLevel})`);
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel * 1.2, 3);
    const rootG = this.svgEl?.querySelector('.graph-root') as SVGGElement | null;
    if (rootG) this.applyTransform(rootG);
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.3);
    const rootG = this.svgEl?.querySelector('.graph-root') as SVGGElement | null;
    if (rootG) this.applyTransform(rootG);
  }

  resetZoom(): void {
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    const rootG = this.svgEl?.querySelector('.graph-root') as SVGGElement | null;
    if (rootG) this.applyTransform(rootG);
  }
}
