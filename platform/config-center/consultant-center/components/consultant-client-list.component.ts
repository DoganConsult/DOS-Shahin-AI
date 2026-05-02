/**
 * ConsultantClientListComponent — Dumb presentational component
 * Renders the portfolio health dashboard and client card grid.
 * Parent: ConsultantCenterComponent
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import {
  Client,
  PortfolioHealth,
} from '@app/core/services/portals/consultant-center.service';

@Component({
  selector: 'app-consultant-client-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AppDatePipe],
  template: `
    <!-- Health summary -->
    <div class="dashboard-grid" *ngIf="portfolioHealth">
      <div class="stat-card">
        <span class="stat-label">Total Clients</span>
        <span class="stat-value">{{ portfolioHealth.totalClients }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Avg Compliance</span>
        <span class="stat-value" [class]="scoreClass(portfolioHealth.avgComplianceScore)">
          {{ portfolioHealth.avgComplianceScore }}%
        </span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Avg Engagement</span>
        <span class="stat-value" [class]="engagementClass(portfolioHealth.avgEngagementScore)">
          {{ portfolioHealth.avgEngagementScore }}/100
        </span>
      </div>
      <div class="stat-card">
        <span class="stat-label">High Risk</span>
        <span class="stat-value score-red">{{ portfolioHealth.highRiskClients }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Medium Risk</span>
        <span class="stat-value score-yellow">{{ portfolioHealth.mediumRiskClients }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Low Risk</span>
        <span class="stat-value score-green">{{ portfolioHealth.lowRiskClients }}</span>
      </div>
    </div>

    <!-- Client list -->
    <h3 class="sub-heading">Assigned Clients</h3>
    <div *ngIf="clients.length === 0" class="empty-state">No clients assigned.</div>
    <div class="client-grid" *ngIf="clients.length > 0">
      <div *ngFor="let c of clients" class="client-card"
           (click)="clientSelected.emit(c)" role="button" tabindex="0"
           (keydown.enter)="clientSelected.emit(c)">
        <div class="client-card-header">
          <h4>{{ c.name }}</h4>
          <span class="status-indicator" [attr.data-status]="c.status">
            {{ c.status | titlecase }}
          </span>
        </div>
        <div class="client-card-stats">
          <div class="client-stat">
            <span class="client-stat-label">Compliance</span>
            <span class="client-stat-value" [class]="scoreClass(c.complianceScore)">
              {{ c.complianceScore }}%
            </span>
          </div>
          <div class="client-stat">
            <span class="client-stat-label">Risk</span>
            <span class="client-stat-value risk-level" [attr.data-risk]="c.riskLevel">
              {{ c.riskLevel | titlecase }}
            </span>
          </div>
          <div class="client-stat">
            <span class="client-stat-label">Engagement</span>
            <span class="client-stat-value" [class]="engagementClass(c.engagementScore)">
              {{ c.engagementScore }}
            </span>
          </div>
        </div>
        <div class="client-card-footer" *ngIf="c.lastAssessmentDate">
          Last assessment: {{ c.lastAssessmentDate | appDate:'medium' }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
    .stat-card {
      background: var(--surface, #fff); border-radius: var(--radius-md, 8px);
      padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; box-shadow: var(--shadow-sm);
    }
    .stat-label { font-size: var(--font-size-caption); color: var(--text-muted, var(--text-muted)); text-transform: uppercase; letter-spacing: 0.03em; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-heading, #1a1a2e); }
    .score-green { color: var(--success, var(--success)); }
    .score-yellow { color: var(--warning, #ca8a04); }
    .score-red { color: var(--error, var(--error)); }
    .sub-heading { font-size: var(--font-size-md); margin: 1.5rem 0 0.75rem; color: var(--text-heading, #1a1a2e); }
    .empty-state { text-align: center; padding: 2rem; color: var(--text-muted, var(--text-muted)); }

    .client-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .client-card {
      background: var(--surface, #fff); border-radius: var(--radius-md, 8px);
      padding: 1.25rem; cursor: pointer; box-shadow: var(--shadow-sm); transition: box-shadow 0.15s, transform 0.15s;
    }
    .client-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
    .client-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .client-card-header h4 { margin: 0; font-size: var(--font-size-md); color: var(--text-heading, #1a1a2e); }
    .client-card-stats { display: flex; gap: 1.5rem; }
    .client-stat { display: flex; flex-direction: column; gap: 0.2rem; }
    .client-stat-label { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); text-transform: uppercase; letter-spacing: 0.03em; }
    .client-stat-value { font-size: var(--font-size-body-md); font-weight: 700; color: var(--text-heading, #1a1a2e); }
    .client-card-footer { margin-top: 0.75rem; font-size: var(--font-size-caption); color: var(--text-muted, var(--text-muted)); }

    .status-indicator {
      display: inline-block; padding: 0.2rem 0.6rem; border-radius: var(--radius-lg);
      font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase;
    }
    [data-status="active"] { background: #dcfce7; color: #166534; }
    [data-status="partial"], [data-status="pending"] { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    [data-status="non_compliant"] { background: #fee2e2; color: #991b1b; }
    [data-risk="high"] { color: var(--error, var(--error)); }
    [data-risk="medium"] { color: var(--warning, #ca8a04); }
    [data-risk="low"] { color: var(--success, var(--success)); }
  `],
})
export class ConsultantClientListComponent {
  i18n = inject(I18nService);

  @Input() clients: Client[] = [];
  @Input() portfolioHealth: PortfolioHealth | null = null;

  @Output() clientSelected = new EventEmitter<Client>();

  scoreClass(score: number): string {
    if (score >= 70) return 'stat-value score-green';
    if (score >= 40) return 'stat-value score-yellow';
    return 'stat-value score-red';
  }

  engagementClass(score: number): string {
    if (score >= 70) return 'stat-value score-green';
    if (score >= 40) return 'stat-value score-yellow';
    return 'stat-value score-red';
  }
}
