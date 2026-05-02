import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QiyasService } from '../../qiyas.service';
import { QiyasRecommendation } from '../../qiyas.models';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-recommendations',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.translate('qiyas.recommendations') }}</h1>
          <p class="subtitle">{{ i18n.translate('qiyas.recommendationsSubtitle') }}</p>
        </div>
        <a routerLink="/qiyas/roadmap" class="btn-outline">
          <i class="pi pi-map"></i> {{ i18n.translate('qiyas.viewRoadmap') }}
        </a>
      </div>

      <!-- Summary strip -->
      <div class="stat-grid" *ngIf="recommendations().length > 0">
        <div class="stat-card">
          <div class="stat-value">{{ totalCount() }}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-value">{{ pendingCount() }}</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">{{ acceptedCount() }}</div>
          <div class="stat-label">Accepted</div>
        </div>
        <div class="stat-card completed">
          <div class="stat-value">{{ completedCount() }}</div>
          <div class="stat-label">Completed</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()" class="input-sm">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select [(ngModel)]="filterPriority" (ngModelChange)="applyFilters()" class="input-sm">
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <!-- Cards -->
      <div class="rec-list">
        <div class="empty" *ngIf="filtered().length === 0 && !loading()">{{ i18n.translate('qiyas.noData') }}</div>
        <div *ngFor="let r of filtered()" class="rec-card">
          <div class="rec-top">
            <div class="rec-title">{{ r.title_en }}</div>
            <div class="rec-badges">
              <span class="badge priority" [class]="'priority-' + r.priority">{{ r.priority }}</span>
              <span class="badge status" [class]="'status-' + r.status">{{ r.status }}</span>
            </div>
          </div>
          <div class="rec-body">
            <div class="rec-domain" *ngIf="r.domain_name">{{ r.domain_name }}</div>
            <div class="rec-desc" *ngIf="r.description_en">{{ r.description_en }}</div>
            <div class="rec-estimates" *ngIf="r.effort_estimate || r.impact_estimate">
              <span *ngIf="r.effort_estimate" class="estimate">Effort: {{ r.effort_estimate }}</span>
              <span *ngIf="r.impact_estimate" class="estimate">Impact: {{ r.impact_estimate }}</span>
            </div>
          </div>
          <div class="rec-actions">
            <button class="btn-sm btn-accept" *ngIf="r.status === 'pending'" (click)="updateStatus(r.recommendation_id, 'accepted')">{{ i18n.translate('qiyas.accept') }}</button>
            <button class="btn-sm btn-reject" *ngIf="r.status === 'pending'" (click)="updateStatus(r.recommendation_id, 'rejected')">{{ i18n.translate('qiyas.reject') }}</button>
            <button class="btn-sm btn-complete" *ngIf="r.status === 'accepted' || r.status === 'in_progress'" (click)="updateStatus(r.recommendation_id, 'completed')">{{ i18n.translate('qiyas.markComplete') }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-heading); margin: 0; }
    .subtitle { color: var(--text-muted); margin-top: 2px; font-size: var(--font-size-base); }
    .btn-outline { display: flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: var(--radius); border: 1.5px solid var(--primary); background: transparent; color: var(--primary); cursor: pointer; font-weight: 600; font-size: var(--font-size-base); text-decoration: none; transition: background 0.15s; }
    .btn-outline:hover { background: var(--surface-ice); }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #fff; border: 1.5px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; text-align: center; }
    .stat-card.accent { border-color: var(--primary); }
    .stat-card.success { border-color: var(--success); }
    .stat-card.completed { border-color: #6366f1; }
    .stat-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--text-heading); }
    .stat-label { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    .filters { display: flex; gap: 10px; margin-bottom: 16px; }
    .input-sm { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .rec-list { display: flex; flex-direction: column; gap: 12px; }
    .rec-card { background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px 18px; transition: border-color 0.15s; }
    .rec-card:hover { border-color: var(--primary); }
    .rec-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .rec-title { font-weight: 600; font-size: var(--font-size-base); color: var(--text-heading); flex: 1; margin-right: 12px; }
    .rec-badges { display: flex; gap: 6px; flex-shrink: 0; }
    .badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .priority-critical { background: #fce4ec; color: #c62828; }
    .priority-high { background: #fff3e0; color: #e65100; }
    .priority-medium { background: #fff8e1; color: #f57f17; }
    .priority-low { background: var(--surface-ice); color: var(--text-muted); }
    .status-pending { background: #fff8e1; color: #f57f17; }
    .status-accepted { background: #dbeafe; color: #1d4ed8; }
    .status-rejected { background: #fce4ec; color: #c62828; }
    .status-in_progress { background: #e0f2f1; color: #00695c; }
    .status-completed { background: #dcfce7; color: var(--success); }
    .rec-body { margin-bottom: 10px; }
    .rec-domain { font-size: var(--font-size-sm); color: var(--primary); font-weight: 500; margin-bottom: 4px; }
    .rec-desc { font-size: var(--font-size-sm); color: var(--text-muted); line-height: 1.5; }
    .rec-estimates { display: flex; gap: 16px; margin-top: 6px; }
    .estimate { font-size: var(--font-size-xs); color: var(--text-muted); background: var(--surface-ice); padding: 2px 8px; border-radius: var(--radius-xs); }
    .rec-actions { display: flex; gap: 8px; }
    .btn-sm { padding: 6px 14px; border-radius: var(--radius-sm); border: none; cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); transition: opacity 0.15s; }
    .btn-sm:hover { opacity: 0.85; }
    .btn-accept { background: var(--primary); color: #fff; }
    .btn-reject { background: #fce4ec; color: #c62828; }
    .btn-complete { background: #dcfce7; color: var(--success); }
    .empty { color: var(--text-muted); text-align: center; padding: 32px; }
    @media (max-width: 768px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class QiyasRecommendationsComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);

  recommendations = signal<QiyasRecommendation[]>([]);
  filtered = signal<QiyasRecommendation[]>([]);
  loading = signal(false);
  filterStatus = '';
  filterPriority = '';

  totalCount = signal(0);
  pendingCount = signal(0);
  acceptedCount = signal(0);
  completedCount = signal(0);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.listRecommendations().subscribe({
      next: (res) => {
        this.recommendations.set(res.recommendations);
        this.computeCounts(res.recommendations);
        this.applyFilters();
        this.loading.set(false);
      },
      error: () => { this.recommendations.set([]); this.filtered.set([]); this.loading.set(false); },
    });
  }

  applyFilters() {
    let list = this.recommendations();
    if (this.filterStatus) list = list.filter(r => r.status === this.filterStatus);
    if (this.filterPriority) list = list.filter(r => r.priority === this.filterPriority);
    this.filtered.set(list);
  }

  computeCounts(recs: QiyasRecommendation[]) {
    this.totalCount.set(recs.length);
    this.pendingCount.set(recs.filter(r => r.status === 'pending').length);
    this.acceptedCount.set(recs.filter(r => r.status === 'accepted').length);
    this.completedCount.set(recs.filter(r => r.status === 'completed').length);
  }

  updateStatus(id: string, status: string) {
    this.svc.updateRecommendationStatus(id, status).subscribe({
      next: () => this.load(),
    });
  }
}
