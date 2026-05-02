import {
  Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, OnInit, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';
import { FoundationApiService, FoundationOverviewData } from '../services/foundation-api.service';

/**
 * Foundation module dashboard component.
 *
 * Top-level summary dashboard for the Foundation module. Displays KPI tiles
 * for users, departments, teams, positions, organizations, and committees.
 * Uses the `/api/foundation/overview` aggregate endpoint via `getOverviewData()`.
 *
 * Standalone component — can be embedded in the Foundation workspace shell
 * or in any product that composes the Foundation module.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-foundation-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="foundation-dashboard">
      <header class="dashboard-header">
        <h1 class="dashboard-title">Foundation</h1>
        <p class="dashboard-subtitle">Organisational structure overview</p>
      </header>

      @if (loading()) {
        <div class="dashboard-loading" role="status" aria-live="polite">
          <span class="pi pi-spin pi-spinner" aria-hidden="true"></span>
          <span>Loading dashboard…</span>
        </div>
      } @else if (loadError()) {
        <div class="dashboard-error" role="alert">
          <span class="pi pi-exclamation-triangle"></span>
          <span>{{ loadError() }}</span>
        </div>
      } @else {
        <section class="kpi-grid" aria-label="Key performance indicators">
          <div class="kpi-tile">
            <span class="kpi-icon pi pi-users" aria-hidden="true"></span>
            <span class="kpi-value">{{ counts().users }}</span>
            <span class="kpi-label">Users</span>
          </div>
          <div class="kpi-tile">
            <span class="kpi-icon pi pi-sitemap" aria-hidden="true"></span>
            <span class="kpi-value">{{ counts().departments }}</span>
            <span class="kpi-label">Departments</span>
          </div>
          <div class="kpi-tile">
            <span class="kpi-icon pi pi-building" aria-hidden="true"></span>
            <span class="kpi-value">{{ counts().organizations }}</span>
            <span class="kpi-label">Organizations</span>
          </div>
          <div class="kpi-tile">
            <span class="kpi-icon pi pi-share-alt" aria-hidden="true"></span>
            <span class="kpi-value">{{ counts().teams }}</span>
            <span class="kpi-label">Teams</span>
          </div>
          <div class="kpi-tile">
            <span class="kpi-icon pi pi-briefcase" aria-hidden="true"></span>
            <span class="kpi-value">{{ counts().positions }}</span>
            <span class="kpi-label">Positions</span>
          </div>
          <div class="kpi-tile">
            <span class="kpi-icon pi pi-calendar" aria-hidden="true"></span>
            <span class="kpi-value">{{ counts().committees }}</span>
            <span class="kpi-label">Committees</span>
          </div>
        </section>

        @if (overviewData()?.loadErrors) {
          <div class="partial-error-banner" role="alert">
            Some data could not be loaded. Dashboard may be incomplete.
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .foundation-dashboard { padding: 1.5rem; }
    .dashboard-header { margin-bottom: 1.5rem; }
    .dashboard-title {
      font-size: 1.5rem; font-weight: 700;
      color: var(--text-heading, #111827); margin: 0 0 0.25rem;
    }
    .dashboard-subtitle { color: var(--text-secondary, #6b7280); margin: 0; }
    .dashboard-loading, .dashboard-error {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 2rem; color: var(--text-secondary, #6b7280);
    }
    .dashboard-error { color: var(--color-error, #dc2626); }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 1rem; margin-bottom: 1rem;
    }
    .kpi-tile {
      display: flex; flex-direction: column; align-items: center;
      padding: 1.25rem 1rem; border: 1px solid var(--surface-border, #e5e7eb);
      border-radius: 0.5rem; background: var(--surface-card, #fff);
      text-align: center; gap: 0.25rem;
    }
    .kpi-icon { font-size: 1.5rem; color: var(--primary-500, #3b82f6); margin-bottom: 0.25rem; }
    .kpi-value { font-size: 1.75rem; font-weight: 700; color: var(--text-heading, #111827); }
    .kpi-label { font-size: 0.75rem; color: var(--text-secondary, #6b7280); text-transform: uppercase; letter-spacing: 0.05em; }
    .partial-error-banner {
      padding: 0.625rem 1rem; border-radius: 0.375rem;
      background: var(--color-warning-50, #fffbeb);
      border: 1px solid var(--color-warning-200, #fde68a);
      color: var(--color-warning-700, #92400e); font-size: 0.875rem;
    }
  `],
})
export class FoundationDashboardComponent implements OnInit {
  private readonly api = inject(FoundationApiService);
  readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly overviewData = signal<FoundationOverviewData | null>(null);
  readonly counts = signal({
    users: 0,
    departments: 0,
    organizations: 0,
    teams: 0,
    positions: 0,
    committees: 0,
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.api.getOverviewData({ includeWorkflowSlices: false }).subscribe({
      next: (data) => {
        this.overviewData.set(data);
        this.counts.set({
          users:         this.countSlice(data.users, 'users'),
          departments:   this.countSlice(data.departments, 'departments'),
          organizations: this.countSlice(data.organizations, 'organizations'),
          teams:         this.countSlice(data.teams, 'teams'),
          positions:     this.countSlice(data.positions, 'positions'),
          committees:    this.countSlice(data.committees, 'committees'),
        });
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.loadError.set(FoundationApiService.formatLoadError(err));
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private countSlice(slice: Record<string, unknown> | unknown, key: string): number {
    if (!slice || typeof slice !== 'object') return 0;
    const arr = (slice as Record<string, unknown>)[key];
    return Array.isArray(arr) ? arr.length : 0;
  }
}
