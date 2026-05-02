import {
  Component, Input, ElementRef, ViewChild, AfterViewInit,
  OnDestroy, OnChanges, SimpleChanges, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface GraphExplorerNode {
  id: string;
  label: string;
  type: string;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
}

export interface GraphExplorerEdge {
  source: string;
  target: string;
  label?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-graph-explorer',
    imports: [CommonModule],
    template: `
    <div class="graph-explorer" [style.height]="height">
      <div #sigmaContainer class="sigma-container"></div>
    </div>
  `,
    styles: [`
    .graph-explorer { position: relative; width: 100%; border: 1px solid var(--surface-border, #e0e0e0); border-radius: var(--radius); overflow: hidden; }
    .sigma-container { width: 100%; height: 100%; }
  `]
})
export class GraphExplorerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('sigmaContainer', { static: true }) sigmaContainer!: ElementRef<HTMLDivElement>;
  @Input() nodes: GraphExplorerNode[] = [];
  @Input() edges: GraphExplorerEdge[] = [];
  @Input() height = '500px';
  @Input() autoLayout = true;

  private renderer: any = null;
  private graph: any = null;

  async ngAfterViewInit(): Promise<void> {
    await this.initGraph();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if ((changes['nodes'] || changes['edges']) && this.graph) {
      await this.updateGraph();
    }
  }

  ngOnDestroy(): void {
    this.renderer?.kill();
  }

  private async initGraph(): Promise<void> {
    try {
      const Graph = (await import('graphology')).default;
      const Sigma = (await import('sigma')).Sigma;

      this.graph = new Graph();
      await this.updateGraph();

      this.renderer = new Sigma(this.graph, this.sigmaContainer.nativeElement, {
        renderEdgeLabels: true,
        defaultNodeColor: '#3b82f6',
        defaultEdgeColor: '#cbd5e1',
      });
    } catch (err) {
      console.error('[GraphExplorer] Init failed:', err);
    }
  }

  private async updateGraph(): Promise<void> {
    if (!this.graph) return;

    this.graph.clear();

    for (const node of this.nodes) {
      this.graph.addNode(node.id, {
        label: node.label,
        size: node.size || 10,
        color: node.color || '#3b82f6',
        x: node.x ?? Math.random() * 100,
        y: node.y ?? Math.random() * 100,
        type: node.type,
      });
    }

    for (const edge of this.edges) {
      if (this.graph.hasNode(edge.source) && this.graph.hasNode(edge.target)) {
        this.graph.addEdge(edge.source, edge.target, {
          label: edge.label || '',
          size: 2,
        });
      }
    }

    if (this.autoLayout && this.nodes.length > 0) {
      await this.applyElkLayout();
    }
  }

  private async applyElkLayout(): Promise<void> {
    try {
      const ELK = (await import('elkjs')).default;
      const elk = new ELK();

      const elkGraph = {
        id: 'root',
        layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'RIGHT' },
        children: this.nodes.map(n => ({ id: n.id, width: 40, height: 40 })),
        edges: this.edges.map((e, i) => ({ id: `e${i}`, sources: [e.source], targets: [e.target] })),
      };

      const layout = await elk.layout(elkGraph);
      if (layout.children) {
        for (const child of layout.children) {
          if (this.graph.hasNode(child.id)) {
            this.graph.setNodeAttribute(child.id, 'x', child.x || 0);
            this.graph.setNodeAttribute(child.id, 'y', child.y || 0);
          }
        }
      }

      this.renderer?.refresh();
    } catch (err) {
      console.error('[GraphExplorer] ELK layout failed:', err);
    }
  }
}
