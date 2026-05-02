import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Subscription } from 'rxjs';
import { WebSocketService } from '@app/websocket';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { environment } from '@env/environment';
import { ScopeSelection } from '@app/shared/layout/workspace-scope-filter.component';
import { StorageService } from '@app/infrastructure';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface CcmSummary {
  effectivenessPct: number;
  total: number;
  automatable: number;
  testPassed: number;
  testFailed: number;
  staleTests: number;
}

interface CcmSoxSummary {
  total: number;
  certified: number;
  designOk: number;
  operatingOk: number;
  deficient: number;
}

interface CcmStaleControl {
  control_ref: string;
  title: string;
  status: string;
  test_status: string;
  last_tested: string;
  testing_frequency: string;
}

interface CcmDashboardData {
  summary: CcmSummary;
  byStatus: { status: string; count: number }[];
  byFrequency: { frequency: string; count: number }[];
  byType: { type: string; count: number }[];
  sox: CcmSoxSummary;
  staleControls: CcmStaleControl[];
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-ccm-dashboard',
    imports: [CommonModule, AppDatePipe, RouterLink, PageShellComponent, StatusBadgeComponent, CardModule, TagModule, ButtonModule, TooltipModule, TableModule],
    template: `
    <app-page-shell
      icon="shield"
      [title]="i18n.translate('ccm.title')"
      [subtitle]="i18n.translate('ccm.subtitle')"
      [breadcrumbs]="['Dashboard', 'CCM']"
      [loading]="loading">

      <!-- Summary KPI Cards -->
      <div class="ccm-kpi-grid" *ngIf="data">
        <div class="ccm-kpi">
          <div class="ccm-kpi-icon" style="background:#dcfce7;color:var(--success)"><i class="pi pi-check-circle"></i></div>
          <div class="ccm-kpi-body">
            <div class="ccm-kpi-value">{{ data.summary.effectivenessPct }}%</div>
            <div class="ccm-kpi-label">Control Effectiveness</div>
          </div>
        </div>
        <div class="ccm-kpi">
          <div class="ccm-kpi-icon" style="background:#dbeafe;color:var(--primary)"><i class="pi pi-lock"></i></div>
          <div class="ccm-kpi-body">
            <div class="ccm-kpi-value">{{ data.summary.total }}</div>
            <div class="ccm-kpi-label">Total Controls</div>
          </div>
        </div>
        <div class="ccm-kpi">
          <div class="ccm-kpi-icon" style="background:var(--status-warning-bg, #fcf4d6);color:#d97706"><i class="pi pi-bolt"></i></div>
          <div class="ccm-kpi-body">
            <div class="ccm-kpi-value">{{ data.summary.automatable }}</div>
            <div class="ccm-kpi-label">Automatable</div>
          </div>
        </div>
        <div class="ccm-kpi">
          <div class="ccm-kpi-icon" style="background:#dcfce7;color:#15803d"><i class="pi pi-verified"></i></div>
          <div class="ccm-kpi-body">
            <div class="ccm-kpi-value">{{ data.summary.testPassed }}</div>
            <div class="ccm-kpi-label">Tests Passed</div>
          </div>
        </div>
        <div class="ccm-kpi">
          <div class="ccm-kpi-icon" style="background:#fee2e2;color:var(--error)"><i class="pi pi-times-circle"></i></div>
          <div class="ccm-kpi-body">
            <div class="ccm-kpi-value">{{ data.summary.testFailed }}</div>
            <div class="ccm-kpi-label">Tests Failed</div>
          </div>
        </div>
        <div class="ccm-kpi">
          <div class="ccm-kpi-icon" style="background:var(--status-danger-bg, #fff1f1);color:#991b1b"><i class="pi pi-clock"></i></div>
          <div class="ccm-kpi-body">
            <div class="ccm-kpi-value">{{ data.summary.staleTests }}</div>
            <div class="ccm-kpi-label">Stale Tests (&gt;90d)</div>
          </div>
        </div>
      </div>

      <!-- Distribution Charts -->
      <div class="ccm-charts" *ngIf="data">
        <div class="ccm-chart-card">
          <h4 class="ccm-chart-title"><i class="pi pi-chart-bar"></i> By Status</h4>
          <div class="ccm-hbar" *ngFor="let s of data.byStatus">
            <span class="ccm-hbar-label">{{ formatLabel(s.status) }}</span>
            <div class="ccm-hbar-track">
              <div class="ccm-hbar-fill" [style.width.%]="barPct(s.count, data.summary.total)" [style.background]="statusColor(s.status)"></div>
            </div>
            <span class="ccm-hbar-val">{{ s.count }}</span>
          </div>
        </div>
        <div class="ccm-chart-card">
          <h4 class="ccm-chart-title"><i class="pi pi-sync"></i> By Frequency</h4>
          <div class="ccm-hbar" *ngFor="let f of data.byFrequency">
            <span class="ccm-hbar-label">{{ formatLabel(f.frequency) }}</span>
            <div class="ccm-hbar-track">
              <div class="ccm-hbar-fill" [style.width.%]="barPct(f.count, data.summary.total)" style="background:#8b5cf6"></div>
            </div>
            <span class="ccm-hbar-val">{{ f.count }}</span>
          </div>
        </div>
        <div class="ccm-chart-card">
          <h4 class="ccm-chart-title"><i class="pi pi-sliders-h"></i> By Type</h4>
          <div class="ccm-hbar" *ngFor="let t of data.byType">
            <span class="ccm-hbar-label">{{ formatLabel(t.type) }}</span>
            <div class="ccm-hbar-track">
              <div class="ccm-hbar-fill" [style.width.%]="barPct(t.count, data.summary.total)" style="background:#0ea5e9"></div>
            </div>
            <span class="ccm-hbar-val">{{ t.count }}</span>
          </div>
        </div>
      </div>

      <!-- SOX Summary -->
      <div class="ccm-sox-section" *ngIf="data && data.sox.total > 0">
        <h4 class="ccm-section-title"><i class="pi pi-verified"></i> SOX Control Health</h4>
        <div class="ccm-sox-grid">
          <div class="ccm-sox-card">
            <span class="ccm-sox-val ccm-text-primary">{{ data.sox.total }}</span>
            <span class="ccm-sox-label">SOX Controls</span>
          </div>
          <div class="ccm-sox-card">
            <span class="ccm-sox-val ccm-text-success">{{ data.sox.certified }}</span>
            <span class="ccm-sox-label">Certified</span>
          </div>
          <div class="ccm-sox-card">
            <span class="ccm-sox-val ccm-text-success">{{ data.sox.designOk }}</span>
            <span class="ccm-sox-label">Design Effective</span>
          </div>
          <div class="ccm-sox-card">
            <span class="ccm-sox-val ccm-text-success">{{ data.sox.operatingOk }}</span>
            <span class="ccm-sox-label">Operating Effective</span>
          </div>
          <div class="ccm-sox-card">
            <span class="ccm-sox-val ccm-text-danger">{{ data.sox.deficient }}</span>
            <span class="ccm-sox-label">Deficient</span>
          </div>
        </div>
      </div>

      <!-- Stale Controls Table -->
      <div class="ccm-stale-section" *ngIf="data?.staleControls?.length">
        <h4 class="ccm-section-title"><i class="pi pi-exclamation-triangle"></i> Controls Requiring Re-testing <a routerLink="/compliance/controls" class="ccm-view-all"><i class="pi pi-arrow-right"></i> View All</a></h4>
        <p-table aria-label="Data table" [value]="data!.staleControls" styleClass="p-datatable-sm p-datatable-striped" [rows]="10" [paginator]="(data!.staleControls.length) > 10">
          <ng-template pTemplate="header">
            <tr>
              <th>Control</th>
              <th>Status</th>
              <th>Test Status</th>
              <th>Last Tested</th>
              <th>Frequency</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-c>
            <tr>
              <td><strong>{{ c.title }}</strong></td>
              <td><app-status-badge [status]="c.status" /></td>
              <td>
                <p-tag [value]="c.test_status || 'not_tested'"
                       [severity]="c.test_status === 'passed' ? 'success' : c.test_status === 'failed' ? 'danger' : 'warning'" />
              </td>
              <td>
                <span *ngIf="c.last_tested_at">{{ c.last_tested_at | appDate:'medium' }}</span>
                <span *ngIf="!c.last_tested_at" class="ccm-never">Never</span>
              </td>
              <td>{{ formatLabel(c.control_frequency || 'manual') }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="ccm-empty">All controls are up to date</td></tr>
          </ng-template>
        </p-table>
      </div>

      <div *ngIf="!loading && !data" class="ccm-empty-state">
        <i class="pi pi-shield" style="font-size:48px;color:var(--text-muted)"></i>
        <p>No control data available</p>
      </div>

    </app-page-shell>
  `,
    styles: [`
    .ccm-kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 24px; }
    .ccm-kpi {
      display: flex; align-items: center; gap: 12px; padding: 16px;
      background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border-subtle);
      box-shadow: var(--shadow-card);
    }
    .ccm-kpi-icon {
      width: 42px; height: 42px; border-radius: var(--radius);
      display: flex; align-items: center; justify-content: center; font-size: var(--font-size-lg); flex-shrink: 0;
    }
    .ccm-kpi-value { font-size: var(--font-size-2xl); font-weight: var(--font-black); color: var(--text-heading); line-height: 1; }
    .ccm-kpi-label { font-size: var(--font-size-xs); font-weight: var(--font-medium); color: var(--text-muted); text-transform: uppercase; margin-top: 2px; }

    .ccm-charts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .ccm-chart-card {
      padding: 18px; background: var(--surface); border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
    }
    .ccm-chart-title {
      font-size: var(--font-size-sm); font-weight: var(--font-bold); color: var(--text-heading); margin: 0 0 14px;
      display: flex; align-items: center; gap: 6px;
    }
    .ccm-chart-title .pi { color: var(--primary); font-size: var(--font-size-base); }

    .ccm-hbar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .ccm-hbar-label { font-size: var(--font-size-xs); font-weight: var(--font-medium); color: var(--text-muted); width: 80px; flex-shrink: 0; text-transform: capitalize; }
    .ccm-hbar-track { flex: 1; height: 8px; background: var(--surface-sunken); border-radius: var(--radius-pill); overflow: hidden; }
    .ccm-hbar-fill { height: 100%; border-radius: var(--radius-pill); transition: width 500ms; min-width: 2px; }
    .ccm-hbar-val { font-size: var(--font-size-sm); font-weight: var(--font-bold); color: var(--text-heading); width: 30px; text-align: end; }

    .ccm-section-title {
      font-size: var(--font-size-base); font-weight: var(--font-bold); color: var(--text-heading);
      margin: 0 0 14px; display: flex; align-items: center; gap: 8px;
    }
    .ccm-section-title .pi { color: var(--primary); }

    .ccm-sox-section { margin-bottom: 24px; }
    .ccm-sox-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
    .ccm-sox-card {
      display: flex; flex-direction: column; align-items: center; padding: 14px;
      background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border-subtle); text-align: center;
    }
    .ccm-sox-val { font-size: var(--font-size-2xl); font-weight: var(--font-black); line-height: 1; }
    .ccm-sox-label { font-size: var(--font-size-xs); font-weight: var(--font-medium); color: var(--text-muted); text-transform: uppercase; margin-top: 4px; }
    .ccm-text-primary { color: var(--primary); }
    .ccm-text-success { color: var(--success); }
    .ccm-text-danger { color: var(--error); }

    .ccm-stale-section { margin-bottom: 24px; }
    .ccm-view-all { margin-inline-start: auto; font-size: var(--font-size-sm); color: var(--primary); text-decoration: none; display: flex; align-items: center; gap: 4px; font-weight: var(--font-medium); }
    .ccm-never { color: var(--error); font-weight: var(--font-medium); font-size: var(--font-size-sm); }
    .ccm-empty { text-align: center; color: var(--text-muted); padding: 24px; }
    .ccm-empty-state { text-align: center; padding: 48px; color: var(--text-muted); }

    @media (max-width: 1024px) {
      .ccm-kpi-grid { grid-template-columns: repeat(3, 1fr); }
      .ccm-charts { grid-template-columns: 1fr; }
      .ccm-sox-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 768px) {
      .ccm-kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .ccm-sox-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class CcmDashboardComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private wsService = inject(WebSocketService);
  private _storage = inject(StorageService);
  private cdr = inject(ChangeDetectorRef);
  private wsSub?: Subscription;
  loading = true;
  data: CcmDashboardData | null = null;
  private api = environment.apiUrl;
  private scopeIds: string[] = [];

  constructor(public i18n: I18nService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.wsSub = this.wsService.dataUpdates$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(e => {
      if (e.data?.entityType === 'control') this.loadDashboard();
    });
  }

  ngOnDestroy(): void { this.wsSub?.unsubscribe(); }

  onScopeChange(selection: ScopeSelection): void {
    this.scopeIds = Object.values(selection).flat();
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loading = true;
    const workspaceId = this._storage.get('grc_active_workspace') || '';
    const parts: string[] = [];
    if (workspaceId) parts.push(`workspaceId=${workspaceId}`);
    if (this.scopeIds.length) parts.push(this.scopeIds.map(s => `scopeIds=${s}`).join('&'));
    const qs = parts.length ? '?' + parts.join('&') : '';
    this.http.get<CcmDashboardData>(`${this.api}/controls/ccm-dashboard${qs}`).subscribe({
      next: (d) => {
        this.data = {
          summary: d?.summary ?? { effectivenessPct: 0, total: 0, automatable: 0, testPassed: 0, testFailed: 0, staleTests: 0 },
          byStatus: d?.byStatus ?? [],
          byFrequency: d?.byFrequency ?? [],
          byType: d?.byType ?? [],
          sox: d?.sox ?? { total: 0, certified: 0, designOk: 0, operatingOk: 0, deficient: 0 },
          staleControls: d?.staleControls ?? [],
        };
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  barPct(value: number, total: number): number {
    if (!total) return 0;
    return Math.max(2, Math.round((value / total) * 100));
  }

  formatLabel(val: string): string {
    if (!val) return '-';
    return val.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  statusColor(status: string): string {
    switch (status) {
      case 'effective': case 'implemented': return 'var(--success)';
      case 'testing': return '#0ea5e9';
      case 'in_progress': return 'var(--warning)';
      case 'not_started': case 'draft': return 'var(--text-muted)';
      default: return 'var(--text-muted)';
    }
  }

}
