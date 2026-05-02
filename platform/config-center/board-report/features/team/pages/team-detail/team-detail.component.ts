import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, forkJoin, BehaviorSubject } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TeamService, Team, TeamMember, TeamCharter } from '../../services/team.service';
import { EmptyStateComponent } from '@app/shared/components';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-team-detail',
  imports: [CommonModule, RouterModule, EmptyStateComponent],
  template: `
    <div class="page-shell" [dir]="i18n.direction()">
      <div *ngIf="loading()" class="loading-state" style="padding: 24px;">
        <div class="skeleton" *ngFor="let i of [1,2,3,4]"></div>
      </div>
      <div *ngIf="!loading() && !team()" style="padding: 24px;">
         <app-empty-state title="Team Not Found" description="The requested team does not exist or you lack viewing permissions." actionLabel="Back to Teams" [actionLink]="['/teams']" />
      </div>
      
      <ng-container *ngIf="!loading() && team() as t">
        <div class="page-header">
          <div class="title-row">
            <a routerLink="/teams" class="back-btn"><i class="pi pi-arrow-left"></i></a>
            <div class="icon-wrap" style="background: var(--blue-50, #eff6ff)">
              <i class="pi pi-id-card" style="color: var(--blue-500)"></i>
            </div>
            <div>
              <div style="display:flex; align-items:center; gap: 8px;">
                <h1>{{ t.name_en }}</h1>
                <span class="item-badge" [class]="'badge-' + t.status">{{ t.status }}</span>
              </div>
              <p class="subtitle">{{ t.code ? 'Code: ' + t.code : 'No Code' }}</p>
            </div>
          </div>
        </div>

        <div class="tabs-container">
            <div class="tab" [class.active]="activeTab() === 'members'" (click)="activeTab.set('members')">Members ({{ members().length }})</div>
            <div class="tab" [class.active]="activeTab() === 'charters'" (click)="activeTab.set('charters')">Charters</div>
            <div class="tab" [class.active]="activeTab() === 'capacity'" (click)="activeTab.set('capacity')">Capacity</div>
        </div>

        <div class="content-area">
          <div class="main-content" *ngIf="activeTab() === 'members'">
             <h3>Team Roster</h3>
             <div class="data-list">
                 <div class="list-item" *ngFor="let m of members()">
                     <div class="item-icon" style="background:var(--surface-300); color:black"><i class="pi pi-user"></i></div>
                     <div class="item-content">
                         <span class="item-title">{{ m.full_name || m.user_id }}</span>
                         <span class="item-meta">{{ m.email || 'No email' }}</span>
                     </div>
                     <span class="item-badge" style="background:var(--surface-100); color:black">{{ m.role_in_team || 'Member' }}</span>
                 </div>
                 <app-empty-state *ngIf="members().length === 0" title="No Members" description="This team has no assigned members." />
             </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .page-shell { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .back-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; color: var(--text-color-secondary); cursor: pointer; text-decoration: none; border: 1px solid var(--border); transition: all 0.2s; }
    .back-btn:hover { background: var(--surface-hover); color: var(--text-heading); }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; }
    .icon-wrap i { font-size: var(--font-size-2xl); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; color: var(--text-heading); }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    
    .tabs-container { display:flex; gap: 24px; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
    .tab { padding: 12px 0; font-weight: 500; color: var(--text-color-secondary); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
    .tab:hover { color: var(--text-heading); }
    .tab.active { color: var(--primary); border-bottom-color: var(--primary); }
    
    .item-badge { font-size: var(--font-size-xs); font-weight: 600; padding: 3px 8px; border-radius: var(--radius-sm); text-transform: uppercase; }
    .badge-active { background: var(--green-50, #f0fdf4); color: var(--green-700, #15803d); }
    .badge-draft { background: var(--yellow-50, #fefce8); color: var(--yellow-700, #a16207); }
    .badge-archived { background: var(--surface-200); color: var(--surface-700); }

    .main-content { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px; }
    h3 { margin-top:0; margin-bottom: 16px; color: var(--text-heading); font-weight: 600; font-size: 16px; }
    
    .data-list { display: flex; flex-direction: column; gap: 8px; }
    .list-item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid var(--border); border-radius: var(--radius-md); }
    .item-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .item-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .item-title { font-size: var(--font-size-body-sm); font-weight: 500; color: var(--text-heading); }
    .item-meta { font-size: var(--font-size-sm); color: var(--text-color-secondary); }

    .loading-state { display: flex; flex-direction: column; gap: 12px; }
    .skeleton { height: 48px; background: var(--surface-hover, #f3f4f6); border-radius: var(--radius); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  `]
})
export class TeamDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private teamService = inject(TeamService);
  public i18n = inject(I18nService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  team = signal<Team | null>(null);
  members = signal<TeamMember[]>([]);
  activeTab = signal<'members' | 'charters' | 'capacity'>('members');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    
    forkJoin({
        team: this.teamService.getTeamById(id).pipe(catchError(() => of({ data: null as any }))),
        members: this.teamService.getMembers(id).pipe(catchError(() => of({ data: [] })))
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
        this.team.set(res.team.data);
        this.members.set(res.members.data || []);
        this.loading.set(false);
    });
  }
}
