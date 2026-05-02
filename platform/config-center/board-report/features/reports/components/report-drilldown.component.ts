// ============================================
// Shahin GRC — Report Drill-Down Component
// Infinite-depth navigation for exploring report data
// Supports summary → framework → domain → control → evidence → finding
// ============================================

import { Component, Input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { GrcRecord } from '@app/core/models/shared.types';

// === Types ===

export interface DrillDownNode {
  nodeId: string;
  nodeType: 'summary' | 'framework' | 'domain' | 'control' | 'evidence' | 'risk' | 'finding' | 'assessment';
  title: string;
  titleAr?: string;
  parentId?: string;
  path: string[];
  data: unknown;
  children?: DrillDownNode[];
  hasChildren: boolean;
  metadata?: {
    count?: number;
    score?: number;
    status?: string;
    lastUpdated?: string;
  };
}

export interface DrillDownResponse {
  node: DrillDownNode;
  siblings?: DrillDownNode[];
  breadcrumbs: Array<{ id: string; title: string; path: string[] }>;
  canGoDeeper: boolean;
}

// === Component ===

@Component({
  selector: 'app-report-drilldown',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  template: `
    <div class="report-drilldown" [dir]="i18n.dir()">
      <!-- Breadcrumbs -->
      <div class="breadcrumbs" *ngIf="breadcrumbs().length > 0">
        <span
          *ngFor="let crumb of breadcrumbs(); let i = index"
          class="breadcrumb-item"
          [class.active]="i === breadcrumbs().length - 1"
          (click)="navigateToPath(crumb.path)"
        >
          {{ crumb.title }}
          <i class="pi pi-chevron-right" *ngIf="i < breadcrumbs().length - 1"></i>
        </span>
      </div>

      <!-- Current node -->
      <div class="current-node" *ngIf="currentNode()">
        <div class="node-header">
          <h2>{{ getTitle(currentNode()!) }}</h2>
          <div class="node-metadata" *ngIf="currentNode()!.metadata">
            <span *ngIf="currentNode()!.metadata.count" class="badge">
              {{ currentNode()!.metadata.count }} items
            </span>
            <span *ngIf="currentNode()!.metadata.score" class="badge score">
              Score: {{ currentNode()!.metadata.score }}%
            </span>
            <span *ngIf="currentNode()!.metadata.status" class="badge status" [class]="'status-' + currentNode()!.metadata.status">
              {{ currentNode()!.metadata.status }}
            </span>
          </div>
        </div>

        <!-- Node data preview -->
        <div class="node-data-preview" *ngIf="currentNode()!.data">
          <pre>{{ formatData(currentNode()!.data) }}</pre>
        </div>
      </div>

      <!-- Children grid -->
      <div class="children-grid" *ngIf="currentNode()?.children && currentNode()!.children!.length > 0">
        <div
          *ngFor="let child of currentNode()!.children"
          class="child-card"
          [class]="'type-' + child.nodeType"
          (click)="navigateToNode(child)"
        >
          <div class="card-header">
            <h3>{{ getTitle(child) }}</h3>
            <i class="pi pi-chevron-right"></i>
          </div>
          <div class="card-body">
            <p *ngIf="child.metadata?.count" class="count">
              {{ child.metadata.count }} items
            </p>
            <p *ngIf="child.metadata?.score" class="score">
              Score: {{ child.metadata.score }}%
            </p>
            <p *ngIf="child.metadata?.status" class="status">
              {{ child.metadata.status }}
            </p>
          </div>
          <div class="card-footer" *ngIf="child.hasChildren">
            <span class="has-children">Has children</span>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div class="loading-state" *ngIf="loading()">
        <p-progressSpinner></p-progressSpinner>
        <p>{{ i18n.t('reports.drilldown.loading') }}</p>
      </div>

      <!-- Empty state -->
      <div class="empty-state" *ngIf="!loading() && currentNode() && !currentNode()!.hasChildren && (!currentNode()!.children || currentNode()!.children.length === 0)">
        <p>{{ i18n.t('reports.drilldown.noChildren') }}</p>
      </div>
    </div>
  `,
  styles: [`
    .report-drilldown {
      padding: 2rem;
    }
    .breadcrumbs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .breadcrumb-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #f3f4f6;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .breadcrumb-item:hover {
      background: #e5e7eb;
    }
    .breadcrumb-item.active {
      background: #dbeafe;
      font-weight: 600;
    }
    .current-node {
      margin-bottom: 2rem;
    }
    .node-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .node-metadata {
      display: flex;
      gap: 0.5rem;
    }
    .badge {
      padding: 0.25rem 0.75rem;
      background: #e5e7eb;
      border-radius: 12px;
      font-size: 0.875rem;
    }
    .badge.score {
      background: #dbeafe;
    }
    .children-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .child-card {
      padding: 1.5rem;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .child-card:hover {
      border-color: #3b82f6;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .card-header h3 {
      margin: 0;
      font-size: 1.125rem;
    }
    .card-body {
      color: #6b7280;
      font-size: 0.875rem;
    }
    .card-footer {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
      font-size: 0.875rem;
      color: #9ca3af;
    }
    .loading-state, .empty-state {
      text-align: center;
      padding: 3rem;
      color: #6b7280;
    }
  `],
})
export class ReportDrillDownComponent {
  @Input() initialPath?: string[];

  readonly currentNode = signal<DrillDownNode | null>(null);
  readonly breadcrumbs = signal<Array<{ id: string; title: string; path: string[] }>>([]);
  readonly loading = signal(false);
  readonly currentPath = signal<string[]>([]);

  constructor(
    private http: HttpClient,
    public i18n: I18nService
  ) {
    // Load initial node
    effect(() => {
      if (this.initialPath) {
        this.navigateToPath(this.initialPath);
      } else {
        this.loadNode('root', 'summary');
      }
    });
  }

  /**
   * Load a drill-down node.
   */
  loadNode(nodeId: string, nodeType: string, parentPath?: string[]): void {
    this.loading.set(true);

    const params: GrcRecord = {
      nodeId,
      nodeType,
      depth: 1,
    };
    if (parentPath && parentPath.length > 0) {
      params.parentPath = parentPath.join(',');
    }

    this.http
      .get<DrillDownResponse>(`${environment.apiUrl}/api/reports/drilldown`, { params })
      .subscribe({
        next: (response) => {
          this.currentNode.set(response.node);
          this.breadcrumbs.set(response.breadcrumbs);
          this.currentPath.set(response.node.path);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('[DrillDown] Failed to load node:', err);
          this.loading.set(false);
        },
      });
  }

  /**
   * Navigate to a specific node.
   */
  navigateToNode(node: DrillDownNode): void {
    this.loadNode(node.nodeId, node.nodeType, node.path.slice(0, -1));
  }

  /**
   * Navigate to a specific path.
   */
  navigateToPath(path: string[]): void {
    if (path.length === 0) {
      this.loadNode('root', 'summary');
      return;
    }

    this.http
      .get<DrillDownResponse>(`${environment.apiUrl}/api/reports/drilldown/path`, {
        params: { path: path.join(',') },
      })
      .subscribe({
        next: (response) => {
          this.currentNode.set(response.node);
          this.breadcrumbs.set(response.breadcrumbs);
          this.currentPath.set(response.node.path);
        },
        error: (err) => {
          console.error('[DrillDown] Path navigation failed:', err);
        },
      });
  }

  /**
   * Get display title for a node.
   */
  getTitle(node: DrillDownNode): string {
    if (this.i18n.currentLang() === 'ar' && node.titleAr) {
      return node.titleAr;
    }
    return node.title || node.nodeId;
  }

  /**
   * Format node data for preview.
   */
  formatData(data: GrcRecord): string {
    // Limit preview size
    const str = JSON.stringify(data, null, 2);
    if (str.length > 500) {
      return str.substring(0, 500) + '...';
    }
    return str;
  }
}
