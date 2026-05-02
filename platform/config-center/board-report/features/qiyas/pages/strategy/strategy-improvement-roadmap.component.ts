// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { DropdownModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { QiyasStrategyApiService } from '../services/qiyas-strategy-api.service';
import { PageHeaderComponent } from '../../../../../shared/components/page-chrome/page-header.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state.component';

@Component({
    selector: 'app-strategy-improvement-roadmap', changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, RouterModule, TableModule, TagModule, ButtonModule, ProgressBarModule, DropdownModule, SkeletonModule, PageHeaderComponent, EmptyStateComponent],
    template: `
    <app-page-header titleEn="Improvement Roadmap" titleAr="خارطة التحسين" icon="pi-map"
                     subtitleEn="Plan and track maturity improvement initiatives" subtitleAr="خطط وتتبع مبادرات تحسين النضج">
      <button pButton label="New Item" icon="pi pi-plus" class="p-button-sm" routerLink="/qiyas/strategy/roadmap" [queryParams]="{action:'create'}"></button>
    </app-page-header>

    <div class="rm-filters">
      <select class="filter-select" [(ngModel)]="phaseFilter" (ngModelChange)="load()">
        <option value="">All Phases</option>
        <option value="plan">Plan</option><option value="build">Build</option><option value="test">Test</option>
        <option value="deploy">Deploy</option><option value="operate">Operate</option>
      </select>
      <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="load()">
        <option value="">All Statuses</option>
        <option value="planned">Planned</option><option value="in_progress">In Progress</option>
        <option value="blocked">Blocked</option><option value="completed">Completed</option>
      </select>
    </div>

    <!-- Phase Summary -->
    @if (!loading()) {
      <div class="phase-strip">
        @for (ph of ['plan','build','test','deploy','operate']; track ph) {
          <div class="phase-card" [class.active]="phaseFilter === ph" (click)="phaseFilter = ph; load()">
            <span class="phase-name">{{ ph | titlecase }}</span>
            <span class="phase-count">{{ countByPhase(ph) }}</span>
          </div>
        }
      </div>
    }

    @if (loading()) { <p-skeleton width="100%" height="400px" /> }
    @else if (items().length) {
      <p-table [value]="items()" [paginator]="items().length > 20" [rows]="20" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Type</th><th>Phase</th><th>Priority</th><th>Status</th><th>Owner</th><th>Progress</th><th>Target Date</th></tr></ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td>{{ item.title_en }}</td>
            <td><p-tag [value]="item.item_type" /></td>
            <td><p-tag [value]="item.phase" severity="info" /></td>
            <td><p-tag [value]="item.priority" [severity]="item.priority === 'critical' ? 'danger' : 'info'" /></td>
            <td><p-tag [value]="item.status" [severity]="item.status === 'blocked' ? 'danger' : item.status === 'completed' ? 'success' : 'info'" /></td>
            <td>{{ item.owner_id || '—' }}</td>
            <td><p-progressBar [value]="item.progress_pct || 0" [showValue]="true" /></td>
            <td>{{ item.target_date || '—' }}</td>
          </tr>
        </ng-template>
      </p-table>
    } @else { <app-empty-state variant="info" titleEn="No roadmap items" titleAr="لا توجد عناصر خارطة" /> }
  `,
    styles: [`:host { display: block; padding: 0 16px 24px; }
    .rm-filters { display: flex; gap: 8px; margin: 12px 0; }
    .filter-select { padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: var(--font-size-tag); }
    .phase-strip { display: flex; gap: 8px; margin: 12px 0; }
    .phase-card { padding: 8px 16px; border-radius: var(--radius); border: 1px solid var(--border); cursor: pointer; text-align: center; transition: all 0.15s; }
    .phase-card:hover, .phase-card.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .phase-name { display: block; font-size: var(--font-size-caption); font-weight: 600; }
    .phase-count { display: block; font-size: var(--font-size-body-lg); font-weight: 700; }`]
})
export class StrategyImprovementRoadmapComponent implements OnInit {
  private readonly api = inject(QiyasStrategyApiService);
  loading = signal(true);
  items = signal<any[]>([]);
  allItems = signal<any[]>([]);
  phaseFilter = '';
  statusFilter = '';

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    this.api.getRoadmap({ phase: this.phaseFilter || undefined, status: this.statusFilter || undefined }).subscribe({
      next: d => { this.items.set(d.items || []); this.allItems.set(d.items || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
  countByPhase(phase: string): number { return this.allItems().filter(i => i.phase === phase).length; }
}
