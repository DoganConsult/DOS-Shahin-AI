import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components';
import { TeamService, Team } from '../../services/team.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-team-hub',
  imports: [CommonModule, RouterModule, EmptyStateComponent],
  template: `
    <div class="page-shell" [dir]="i18n.direction()">
      <div class="page-header">
        <div class="title-row">
          <div class="icon-wrap" style="background: var(--blue-50, #eff6ff)">
            <i class="pi pi-users" style="color: var(--blue-500)"></i>
          </div>
          <div>
            <h1>Teams</h1>
            <p class="subtitle">Manage cross-functional units and organizational squads</p>
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
          <div class="stat-card">
            <span class="stat-value">{{ items().length }}</span>
            <span class="stat-label">Total Teams</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ totalMembers() }}</span>
            <span class="stat-label">Total Members</span>
          </div>
        </div>
        <div class="main-content">
          <div *ngIf="loading()" class="loading-state">
            <div class="skeleton" *ngFor="let i of [1,2,3,4,5]"></div>
          </div>
          <app-empty-state
            *ngIf="!loading() && items().length === 0"
            title="No Teams Configured"
            description="Create your first team to assign responsibilities."
            actionLabel="Create Team"
            (action)="refresh()" />
          <div *ngIf="!loading() && items().length > 0" class="data-list">
            <a [routerLink]="['/teams', item.team_id]" class="list-item" *ngFor="let item of items()" style="text-decoration:none">
              <div class="item-icon"><i class="pi pi-users"></i></div>
              <div class="item-content">
                <span class="item-title">{{ item.name_en }}</span>
                <span class="item-meta">Code: {{ item.code || 'N/A' }} · Members: {{ item.member_count || 0 }}</span>
              </div>
              <span class="item-badge" [class]="'badge-' + item.status">{{ item.status }}</span>
            </a>
          </div>
        </div>
      </div>
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
    .item-icon { width: 36px; height: 36px; border-radius: var(--radius); background: var(--blue-50, #eff6ff); display: flex; align-items: center; justify-content: center; }
    .item-icon i { font-size: var(--font-size-md); color: var(--blue-500); }
    .item-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .item-title { font-size: var(--font-size-body-sm); font-weight: 500; color: var(--text-heading); }
    .item-meta { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .item-badge { font-size: var(--font-size-xs); font-weight: 600; padding: 3px 8px; border-radius: var(--radius-sm); text-transform: uppercase; }
    .badge-active { background: var(--green-50, #f0fdf4); color: var(--green-700, #15803d); }
    .badge-draft { background: var(--yellow-50, #fefce8); color: var(--yellow-700, #a16207); }
    .badge-archived { background: var(--surface-200); color: var(--surface-700); }
  `]
})
export class TeamHubComponent implements OnInit {
  private teamService = inject(TeamService);
  public i18n = inject(I18nService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  items = signal<Team[]>([]);
  totalMembers = signal(0);

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.teamService.getTeams()
      .pipe(
        catchError(() => of({ data: [] })),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(res => {
        const teams = res.data || [];
        this.items.set(teams);
        this.totalMembers.set(teams.reduce((acc, t) => acc + (t.member_count || 0), 0));
        this.loading.set(false);
      });
  }
}
