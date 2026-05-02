import {
  Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-portals-overview',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, ModuleOverviewKitComponent],
  template: `
    <div class="page-shell">
      <div class="page-header">
        <div class="title-row">
          <div class="icon-wrap" style="background: var(--indigo-50, #eef2ff)">
            <i class="pi pi-globe" style="color: var(--indigo-500)"></i>
          </div>
          <div>
            <h1>Portals Management</h1>
            <p class="subtitle">Stakeholder portals, access lifecycle, and provisioning</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="refresh()">
            <i class="pi pi-refresh"></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>
      <div class="content-area">
        <div class="stats-row" *ngIf="!loading()">
          <div class="stat-card" *ngFor="let stat of stats()">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
        <div class="main-content">
          <div *ngIf="loading()" class="loading-state">
            <div class="skeleton" *ngFor="let i of [1,2,3,4,5]"></div>
          </div>
          <app-empty-state
            *ngIf="!loading() && items().length === 0"
            title="No portals configured"
            description="Portals will appear here once provisioned."
            actionLabel="Get Started"
            (action)="refresh()" />
          <div *ngIf="!loading() && items().length > 0" class="data-list">
            <div class="list-item" *ngFor="let item of items()">
              <div class="item-icon"><i class="pi pi-globe"></i></div>
              <div class="item-content">
                <span class="item-title">{{ item.title }}</span>
                <span class="item-meta">{{ item.status }} · {{ item.date }}</span>
              </div>
              <span class="item-badge" [class]="'badge-' + item.severity">{{ item.severity }}</span>
            </div>
          </div>
        </div>
      </div>

      <app-module-overview-kit [config]="moduleKitConfig()"></app-module-overview-kit>
    </div>
  `,
  styles: [`
    .page-shell { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; }
    .icon-wrap i { font-size: var(--font-size-2xl); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; color: var(--text-heading); }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius); background: var(--primary); color: white; cursor: pointer; font-size: var(--font-size-base); font-weight: 500; }
    .btn-primary:hover { filter: brightness(0.92); }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; display: flex; flex-direction: column; gap: 4px; }
    .stat-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--text-heading); }
    .stat-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .main-content { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px; }
    .loading-state { display: flex; flex-direction: column; gap: 12px; }
    .skeleton { height: 48px; background: var(--surface-hover, #f3f4f6); border-radius: var(--radius); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .data-list { display: flex; flex-direction: column; gap: 8px; }
    .list-item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid var(--border); border-radius: var(--radius-md); transition: background 0.15s; }
    .list-item:hover { background: var(--surface-hover, #f9fafb); }
    .item-icon { width: 36px; height: 36px; border-radius: var(--radius); background: var(--indigo-50, #eef2ff); display: flex; align-items: center; justify-content: center; }
    .item-icon i { font-size: var(--font-size-md); color: var(--indigo-500); }
    .item-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .item-title { font-size: var(--font-size-body-sm); font-weight: 500; color: var(--text-heading); }
    .item-meta { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .item-badge { font-size: var(--font-size-xs); font-weight: 600; padding: 3px 8px; border-radius: var(--radius-sm); text-transform: uppercase; }
    .badge-high { background: var(--red-50, #fef2f2); color: var(--red-600, #dc2626); }
    .badge-medium { background: var(--yellow-50, #fefce8); color: var(--yellow-700, #a16207); }
    .badge-low { background: var(--green-50, #f0fdf4); color: var(--green-700, #15803d); }
    .badge-info { background: var(--blue-50, #eff6ff); color: var(--blue-700, #1d4ed8); }
  `],
})
export class PortalsOverviewComponent implements OnInit {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);
  private destroyRef = inject(DestroyRef);

  readonly portalsAgents: AgentInfo[] = [];

  readonly portalsTransitions = [
    { from: 'draft', to: 'provisioning' },
    { from: 'provisioning', to: 'active', requiresApproval: true },
    { from: 'active', to: 'suspended' },
    { from: 'suspended', to: 'active' },
    { from: 'active', to: 'deactivated' },
    { from: 'suspended', to: 'deactivated' },
    { from: 'deactivated', to: 'draft' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'portals',
    tier: 'domain',
    automationLevel: 'semi',
    slaHours: 24,
    transitions: this.portalsTransitions,
    currentStatus: 'active',
    agents: this.portalsAgents,
    lang: this.i18n.currentLang() === 'ar' ? 'ar' : 'en',
  }));

  loading = signal(true);
  items = signal<Array<{ title: string; status: string; date: string; severity: string }>>([]);
  stats = signal<Array<{ value: string; label: string }>>([
    { value: '0', label: 'Total' },
    { value: '0', label: 'Active' },
    { value: '0', label: 'Suspended' },
    { value: '0', label: 'Draft' },
  ]);

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.http.get<{ data?: unknown[] }>(`${environment.apiUrl}/portals`).pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of({ data: [] }))).subscribe(res => { const arr = Array.isArray(res) ? res : (res?.data || []); this.items.set(arr.map((r: Record<string, unknown>) => ({ title: String(r['title'] || r['name'] || 'Portal'), status: String(r['status'] || 'active'), date: String(r['created_at'] || r['updatedAt'] || new Date().toISOString()), severity: String(r['severity'] || r['priority'] || 'info'), }))); this.stats.set([{ value: String(arr.length), label: 'Total' }, { value: String(arr.filter((r: Record<string, unknown>) => r['status'] === 'active').length), label: 'Active' }, { value: String(arr.filter((r: Record<string, unknown>) => r['status'] === 'suspended').length), label: 'Suspended' }, { value: String(arr.filter((r: Record<string, unknown>) => r['status'] === 'draft').length), label: 'Draft' }]); this.loading.set(false); });
  }
}
