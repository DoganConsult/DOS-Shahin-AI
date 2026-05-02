import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { GrcOperationsService } from '@app/grc/services/grc-governance.service';

interface TeamCard { team_id: string; name: string; description: string; members: Record<string, unknown>[]; memberCount: number; openTasks: number; }

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-team-command-center',
  standalone: true,
  imports: [CommonModule, RouterLink, CardModule, BadgeModule, TagModule, SkeletonModule, ButtonModule],
  template: `
    <section class="page-shell">
      <header class="page-header">
        <div class="header-row">
          <div>
            <h2>{{ i18n.translate('Team Command Center') }}</h2>
            <p class="text-muted">{{ i18n.translate('Overview of all teams and their current workload') }}</p>
          </div>
          <p-button [label]="i18n.translate('Create Team')" icon="pi pi-plus" routerLink="/team-management" />
        </div>
      </header>

      <p-skeleton *ngIf="loading" width="100%" height="200px" />

      <div class="team-grid" *ngIf="!loading">
        <div *ngFor="let team of teams" class="team-card" [routerLink]="['/team-management']" [queryParams]="{team: team.team_id}">
          <div class="team-header">
            <div class="team-avatar"><i class="pi pi-users"></i></div>
            <div class="team-info">
              <h3 class="team-name">{{ team.name }}</h3>
              <p class="team-desc">{{ team.description || i18n.translate('No description') }}</p>
            </div>
          </div>
          <div class="team-stats">
            <div class="stat">
              <span class="stat-value">{{ team.memberCount }}</span>
              <span class="stat-label">{{ i18n.translate('Members') }}</span>
            </div>
            <div class="stat">
              <span class="stat-value" [class.has-tasks]="team.openTasks > 0">{{ team.openTasks }}</span>
              <span class="stat-label">{{ i18n.translate('Open Tasks') }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loading && teams.length === 0">
        <i class="pi pi-users empty-icon"></i>
        <p>{{ i18n.translate('No teams created yet. Create your first team to get started.') }}</p>
        <p-button [label]="i18n.translate('Create Team')" icon="pi pi-plus" routerLink="/team-management" />
      </div>
    </section>
  `,
  styles: [`
    .page-shell { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h2 { font-size: var(--font-size-3xl); font-weight: 300; color: var(--text-heading); margin: 0; }
    .text-muted { color: var(--text-muted); margin-top: 4px; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
    .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .team-card { background: var(--surface); border-radius: var(--radius); padding: 20px; border: 1px solid var(--border-subtle); cursor: pointer; transition: all 200ms; }
    .team-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .team-header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 16px; }
    .team-avatar { width: 44px; height: 44px; border-radius: var(--radius-pill); background: var(--primary-light, #e0f2fe); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .team-avatar .pi { font-size: var(--font-size-xl); color: var(--primary); }
    .team-info { flex: 1; min-width: 0; }
    .team-name { margin: 0; font-size: var(--font-size-md); font-weight: 600; color: var(--text-heading); }
    .team-desc { margin: 4px 0 0; font-size: var(--font-size-sm); color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .team-stats { display: flex; gap: 24px; padding-top: 12px; border-top: 1px solid var(--border-subtle); }
    .stat { display: flex; flex-direction: column; align-items: center; }
    .stat-value { font-size: var(--font-size-xl); font-weight: 700; color: var(--text-heading); }
    .stat-value.has-tasks { color: var(--warning); }
    .stat-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .empty-state { text-align: center; padding: 80px 24px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 16px; opacity: 0.3; }
  `]
})
export class TeamCommandCenterComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  teams: TeamCard[] = [];
  loading = true;

  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  ngOnInit(): void {
    this.operationsSvc.getTeams().subscribe({
      next: (res: Record<string, unknown>) => {
        const raw = res.teams || res || [];
        this.teams = raw.map((t: Record<string, unknown>) => ({
          team_id: t.teamId || t.team_id || t.id,
          name: t.nameEn || t.name_en || t.name || 'Unnamed Team',
          description: t.descriptionEn || t.description_en || t.description || '',
          members: t.members || [],
          memberCount: t.memberCount || t.member_count || t.members?.length || 0,
          openTasks: t.openTaskCount || t.open_task_count || t.openTasks || t.open_tasks || 0,
        }));
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.teams = []; this.loading = false; this.cdr.markForCheck(); },
    });
  }

}
