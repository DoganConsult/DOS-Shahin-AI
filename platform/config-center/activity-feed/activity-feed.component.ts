import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcOperationsService } from '@app/grc/services/grc-operations.service';
import { ApiClientService } from '@app/core/services/api-client.service';
import { EmptyStateComponent } from '@app/shared/components';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { PageShellComponent } from '@app/shared/components/page-chrome/page-shell.component';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, TagModule, ButtonModule, DropdownModule, ToolbarModule, InputTextModule, TooltipModule],
  template: `
    <app-page-shell icon="history" [title]="i18n.translate('activityFeed.title')"
      [subtitle]="i18n.translate('activityFeed.subtitle')"
      [breadcrumbs]="[i18n.translate('nav.dashboard'), i18n.translate('activityFeed.breadcrumb')]" [loading]="loading">

      <!-- Summary Stats -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-icon-wrap"><i class="pi pi-list"></i></div>
          <div>
            <div class="kpi-value">{{ feed.length }}</div>
            <div class="kpi-label">{{ i18n.translate('activityFeed.totalActivities') }}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap green"><i class="pi pi-plus-circle"></i></div>
          <div>
            <div class="kpi-value">{{ countAction('create') }}</div>
            <div class="kpi-label">{{ i18n.translate('activityFeed.created') }}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap blue"><i class="pi pi-pencil"></i></div>
          <div>
            <div class="kpi-value">{{ countAction('update') }}</div>
            <div class="kpi-label">{{ i18n.translate('activityFeed.updated') }}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap purple"><i class="pi pi-check-circle"></i></div>
          <div>
            <div class="kpi-value">{{ countAction('approve') }}</div>
            <div class="kpi-label">{{ i18n.translate('activityFeed.approved') }}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap red"><i class="pi pi-trash"></i></div>
          <div>
            <div class="kpi-value">{{ countAction('delete') }}</div>
            <div class="kpi-label">{{ i18n.translate('activityFeed.deleted') }}</div>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="moduleOptions" [(ngModel)]="selectedModule" [placeholder]="i18n.translate('activityFeed.allModules')" [showClear]="true" (onChange)="loadFeed()" />
          <input pInputText [(ngModel)]="searchText" [placeholder]="i18n.translate('activityFeed.searchPlaceholder')" [attr.aria-label]="i18n.translate('activityFeed.searchPlaceholder')" class="ml-2" style="width:200px" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button icon="pi pi-refresh" [outlined]="true" (onClick)="loadFeed()" [pTooltip]="i18n.translate('common.refresh')" />
        </ng-template>
      </p-toolbar>

      <!-- Activity Timeline -->
      <div class="feed-list">
        @for (item of filteredFeed(); track item.activity_id || $index) {
          <div class="feed-item" [class.feed-create]="item.action === 'create'" [class.feed-delete]="item.action === 'delete'">
            <div class="feed-icon"><i class="pi" [ngClass]="actionIcon(item.action)"></i></div>
            <div class="feed-body">
              <div class="feed-title">{{ item.description || item.action }}</div>
              <div class="feed-meta">
                <p-tag [value]="item.module || 'system'" severity="info" />
                <p-tag [value]="item.action || '—'" [severity]="actionSeverity(item.action)" />
                <span class="feed-user" *ngIf="item.user_name || item.user_id">
                  <i class="pi pi-user"></i> {{ item.user_name || item.user_id }}
                </span>
                <span class="feed-time">{{ item.created_at | appDate:'short' }}</span>
              </div>
              <div class="feed-entity" *ngIf="item.entity_type">
                <span class="entity-badge">{{ item.entity_type }}</span>
                <span class="entity-id" *ngIf="item.entity_id">{{ item.entity_id | slice:0:8 }}...</span>
              </div>
            </div>
          </div>
        }
        @if (filteredFeed().length === 0 && !loading) {
          <div class="empty-state">
            <i class="pi pi-history empty-icon"></i>
            <p>{{ i18n.translate('operationsHub.noActivityRecorded') }}</p>
          </div>
        }
      </div>

      <!-- Load More -->
      @if (feed.length >= 50) {
        <div class="text-center mt-3">
          <p-button [label]="i18n.translate('home.loadMore')" icon="pi pi-chevron-down" [outlined]="true" (onClick)="loadMore()" />
        </div>
      }
    </app-page-shell>
  `,
  styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: var(--radius-lg); background: var(--bg-1, var(--surface-ice)); border: 1px solid var(--border, var(--border-subtle)); }
    .kpi-icon-wrap { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; background: var(--primary-light, #eff6ff); color: var(--primary, #2563eb); font-size: var(--font-size-lg); }
    .kpi-icon-wrap.green { background: var(--status-success-bg, #defbe6); color: var(--success); }
    .kpi-icon-wrap.blue { background: #eff6ff; color: var(--primary); }
    .kpi-icon-wrap.purple { background: var(--purple-50, #f5f3ff); color: #7c3aed; }
    .kpi-icon-wrap.red { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-0); }
    .kpi-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); text-transform: uppercase; letter-spacing: 0.5px; }
    .mb-3 { margin-bottom: 16px; } .ml-2 { margin-inline-start: 8px; } .mt-3 { margin-top: 16px; }
    .feed-list { display: flex; flex-direction: column; gap: 8px; }
    .feed-item { display: flex; gap: 14px; padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border, var(--border-subtle)); background: var(--bg-0, #fff); transition: all 200ms; }
    .feed-item:hover { border-color: var(--primary, #1e40af); box-shadow: var(--shadow-sm); }
    .feed-item.feed-create { border-inline-start: 3px solid var(--success); }
    .feed-item.feed-delete { border-inline-start: 3px solid var(--error); }
    .feed-icon { width: 36px; height: 36px; border-radius: var(--radius); background: var(--surface-ground, var(--surface-ice)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .feed-icon i { font-size: var(--font-size-md); color: var(--primary, #1e40af); }
    .feed-body { flex: 1; min-width: 0; }
    .feed-title { font-size: var(--font-size-base); font-weight: 600; margin-bottom: 6px; }
    .feed-meta { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); flex-wrap: wrap; }
    .feed-user { font-weight: 600; } .feed-user i { margin-inline-end: 3px; font-size: var(--font-size-xs); }
    .feed-time { margin-inline-start: auto; }
    .feed-entity { margin-top: 6px; }
    .entity-badge { background: var(--bg-1, var(--surface-ice)); padding: 2px 8px; border-radius: var(--radius-xs); font-size: var(--font-size-xs); font-weight: 600; }
    .entity-id { font-size: var(--font-size-xs); color: var(--text-muted); margin-inline-start: 4px; font-family: monospace; }
    .empty-state { text-align: center; padding: 48px; color: var(--text-muted); }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
    .text-center { text-align: center; }
  `]
})
export class ActivityFeedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  feed: Record<string, any>[] = [];
  selectedModule: string | null = null;
  searchText = '';
  offset = 0;
  /** Computed dropdown options that react to language changes */
  get moduleOptions() {
    return [
      { label: this.i18n.translate('activityFeed.moduleGovernance'), value: 'governance' },
      { label: this.i18n.translate('activityFeed.moduleRisk'), value: 'risk' },
      { label: this.i18n.translate('activityFeed.moduleCompliance'), value: 'compliance' },
      { label: this.i18n.translate('activityFeed.moduleAudit'), value: 'audit' },
      { label: this.i18n.translate('activityFeed.moduleIncidents'), value: 'incidents' },
      { label: this.i18n.translate('activityFeed.moduleVendors'), value: 'vendors' },
      { label: this.i18n.translate('activityFeed.moduleEvidence'), value: 'evidence' },
      { label: this.i18n.translate('activityFeed.moduleWorkflows'), value: 'workflows' },
    ];
  }

  private ops = inject(GrcOperationsService);
  private api = inject(ApiClientService);
  constructor(public i18n: I18nService) {}
  ngOnInit() { this.loadFeed(); }

  loadFeed() {
    this.loading = true;
    this.offset = 0;
    this.ops.getActivityFeed(this.selectedModule || undefined).subscribe({
      next: (d: Record<string, any>) => {
        const raw = Array.isArray(d) ? d : (d.activities || d.feed || []);
        this.feed = raw.map((x: Record<string, any>) => ({ ...x, created_at: x.created_at ?? x.createdAt }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  loadMore() {
    this.offset += 50;
    this.api.get(`/activity-feed?offset=${this.offset}&module=${this.selectedModule || ''}`).subscribe({
      next: (d: Record<string, any>) => {
        const more = Array.isArray(d) ? d : d.activities || [];
        this.feed = [...this.feed, ...more];
      }
    });
  }

  filteredFeed(): Record<string, any>[] {
    if (!this.searchText) return this.feed;
    const q = this.searchText.toLowerCase();
    return this.feed.filter(f =>
      (f.description || '').toLowerCase().includes(q) ||
      (f.module || '').toLowerCase().includes(q) ||
      (f.user_name || '').toLowerCase().includes(q)
    );
  }

  countAction(action: string): number {
    return this.feed.filter(f => f.action === action).length;
  }

  actionIcon(action: string): string {
    const m: Record<string, string> = { create: 'pi-plus-circle', update: 'pi-pencil', delete: 'pi-trash', approve: 'pi-check-circle', login: 'pi-sign-in', export: 'pi-download' };
    return m[action] || 'pi-circle';
  }

  actionSeverity(action: string): 'success' | 'warning' | 'danger' | 'info' {
    const m: Record<string, any> = { create: 'success', update: 'info', delete: 'danger', approve: 'success' };
    return m[action] || 'info';
  }
}
