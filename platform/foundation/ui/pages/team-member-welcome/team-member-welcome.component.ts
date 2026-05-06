import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy, inject, HostListener, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionService } from '@app/core/dauth/session/session.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { StepsModule } from 'primeng/steps';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { StorageService } from '@app/infrastructure';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClientService } from '@app/core/services/api-client.service';
import { GrcOperationsService } from '@app/grc/services/grc-governance.service';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : Number(value ?? fallback) || fallback;
}

interface WelcomeData {
  userName: string;
  orgName: string;
  role: string;
  teams: Array<{ team_id: string; name: string; description?: string }>;
  raciSummary: Array<{ scope_type: string; raci_role: string; count: number }>;
  pendingTasks: number;
  playbookUrl?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-team-member-welcome',
    imports: [CommonModule, ButtonModule, CardModule, TagModule, StepsModule],
    template: `
    <div class="welcome-overlay" *ngIf="!dismissed()" (click)="dismiss()">
      <div class="welcome-card" [dir]="i18n.direction()" (click)="$event.stopPropagation()">
        <div class="welcome-header">
          <div class="welcome-icon"><i class="pi pi-star-fill"></i></div>
          <h1 [dir]="i18n.direction()">{{ i18n.translate('teamMemberWelcome.welcome') }}{{ i18n.isAr() ? '، ' : ', ' }}<bdi>{{ data()?.userName || 'Team Member' }}</bdi>!</h1>
          <p class="text-color-secondary">{{ data()?.orgName }}</p>
        </div>

        <div class="welcome-steps" *ngIf="step() === 0">
          <h3><i class="pi pi-id-card mr-2"></i>{{ i18n.translate('teamMemberWelcome.yourRole') }}</h3>
          <p-tag [value]="formatRole(data()?.role || '')" severity="info" [rounded]="true" styleClass="text-base px-3 py-1"></p-tag>
          <p class="mt-3 text-color-secondary">{{ i18n.translate('teamMemberWelcome.roleAssigned') }}</p>
          <button pButton [label]="i18n.translate('teamMemberWelcome.next')" icon="pi pi-arrow-right" class="mt-3" (click)="step.set(1)"></button>
        </div>

        <div class="welcome-steps" *ngIf="step() === 1">
          <h3><i class="pi pi-users mr-2"></i>{{ i18n.translate('teamMemberWelcome.yourTeams') }}</h3>
          <div *ngIf="data()?.teams?.length; else noTeams">
            <div *ngFor="let team of data()?.teams" class="surface-card border-round p-3 mb-2">
              <div class="font-semibold">{{ team.name }}</div>
              <div class="text-xs text-color-secondary" *ngIf="team.description">{{ team.description }}</div>
            </div>
          </div>
          <ng-template #noTeams>
            <p class="text-color-secondary">{{ i18n.translate('teamMemberWelcome.noTeams') }}</p>
          </ng-template>
          <div class="flex gap-2 mt-3">
            <button pButton [label]="i18n.translate('teamMemberWelcome.back')" icon="pi pi-arrow-left" class="p-button-outlined" (click)="step.set(0)"></button>
            <button pButton [label]="i18n.translate('teamMemberWelcome.next')" icon="pi pi-arrow-right" (click)="step.set(2)"></button>
          </div>
        </div>

        <div class="welcome-steps" *ngIf="step() === 2">
          <h3><i class="pi pi-sitemap mr-2"></i>{{ i18n.translate('teamMemberWelcome.responsibilities') }}</h3>
          <div *ngIf="data()?.raciSummary?.length; else noRaci">
            <div *ngFor="let r of data()?.raciSummary" class="flex align-items-center gap-2 mb-2">
              <p-tag [value]="r.raci_role" [severity]="getRaciSeverity(r.raci_role)" [rounded]="true"></p-tag>
              <span>{{ r.count }} {{ r.scope_type }}(s)</span>
            </div>
          </div>
          <ng-template #noRaci>
            <p class="text-color-secondary">{{ i18n.translate('teamMemberWelcome.noRaci') }}</p>
          </ng-template>
          <div class="flex gap-2 mt-3">
            <button pButton [label]="i18n.translate('teamMemberWelcome.back')" icon="pi pi-arrow-left" class="p-button-outlined" (click)="step.set(1)"></button>
            <button pButton [label]="i18n.translate('teamMemberWelcome.next')" icon="pi pi-arrow-right" (click)="step.set(3)"></button>
          </div>
        </div>

        <div class="welcome-steps" *ngIf="step() === 3">
          <h3><i class="pi pi-inbox mr-2"></i>{{ i18n.translate('teamMemberWelcome.pendingTasks') }}</h3>
          <div class="text-4xl font-bold text-primary mb-2">{{ data()?.pendingTasks || 0 }}</div>
          <p class="text-color-secondary">{{ i18n.translate('teamMemberWelcome.tasksAwaiting') }}</p>
          <div class="flex gap-2 mt-4">
            <button pButton [label]="i18n.translate('teamMemberWelcome.back')" icon="pi pi-arrow-left" class="p-button-outlined" (click)="step.set(2)"></button>
            <button pButton [label]="i18n.translate('teamMemberWelcome.goToTasks')" icon="pi pi-inbox" class="p-button-success" (click)="goToTasks()"></button>
            <button pButton [label]="i18n.translate('teamMemberWelcome.goToDashboard')" icon="pi pi-home" class="p-button-outlined" (click)="goToDashboard()"></button>
          </div>
        </div>

        <button class="welcome-skip" (click)="dismiss()">
          <i class="pi pi-times"></i> {{ i18n.translate('teamMemberWelcome.skip') }}
        </button>
      </div>
    </div>
  `,
    styles: [`
    .welcome-overlay {
      position: fixed; inset: 0; z-index: var(--z-splash);
      background: var(--opacity-overlay, rgba(var(--color-black-rgb), 0.5)); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }
    .welcome-card {
      background: var(--surface-card, #fff); border-radius: var(--radius-xl);
      padding: 2.5rem; max-width: 520px; width: 100%;
      box-shadow: 0 24px 48px rgba(var(--color-black-rgb), 0.15);
      position: relative;
    }
    .welcome-header { text-align: center; margin-bottom: 2rem; }
    .welcome-icon {
      width: 64px; height: 64px; border-radius: var(--radius-pill);
      background: linear-gradient(135deg, var(--primary), var(--primary-dark, var(--primary)));
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1rem;
    }
    .welcome-icon i { font-size: var(--font-size-2xl); color: var(--bg-0); }
    .welcome-header h1 { margin: 0 0 0.25rem; font-size: var(--font-size-2xl); }
    .welcome-steps h3 { margin: 0 0 1rem; }
    .welcome-skip {
      position: absolute; top: 1rem; inset-inline-end: 1rem;
      background: none; border: none; cursor: pointer;
      color: var(--text-color-secondary); font-size: var(--font-size-tag);
      display: flex; align-items: center; gap: 4px;
    }
    .welcome-skip:hover { color: var(--text-color); }
  `]
})
export class TeamMemberWelcomeComponent implements OnInit, OnDestroy {
    private operationsSvc = inject(GrcOperationsService);
  private destroyRef = inject(DestroyRef);
  private _storage = inject(StorageService);
  private _sub?: Subscription;
  step = signal(0);
  data = signal<WelcomeData | null>(null);
  dismissed = signal(false);

  constructor(
    private auth: SessionService,
    public i18n: I18nService,
    private router: Router, private apiclientSvc: ApiClientService
  ) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.dismissed()) this.dismiss();
  }

  ngOnInit() {
    if (this._storage.get('grc_member_onboarded') === 'true') {
      // Landing route is owned by dos.tenant_landing_config (UI-OS resolver).
      // No frontend invention: leave routing to the outer landing guard.
      return;
    }
    const profile = this.auth.userProfile();
    const userName = profile?.name || this._storage.get('grc_userName') || '';
    const orgName = this._storage.get('grc_orgName') || '';
    const role = this.auth.currentRole() || 'viewer';
    const userId = profile?.userId || '';

    this._sub = forkJoin({
      teams: this.apiclientSvc.get('/teams').pipe(catchError(() => of({ teams: [] }))),
      tasks: this.operationsSvc.getMyWorkItems({ status: 'pending' }).pipe(
        map((r) => ({ total: r?.count ?? r?.tasks?.length ?? 0 })),
        catchError(() => of({ total: 0 }))
      ),
      raci: userId ? this.apiclientSvc.get(`/teams/raci/by-user/${userId}`).pipe(catchError(() => of({ summary: [] }))) : of({ summary: [] }),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ teams, tasks, raci }: Record<string, unknown>) => {
        const teamsPayload = asRecord(teams);
        const allTeams = Array.isArray(teams) ? asRecordArray(teams) : asRecordArray(teamsPayload['teams']);
        const myTeams = allTeams.filter((team) =>
          asRecordArray(asRecord(team)['members']).some((member) => asString(member['user_id']) === userId)
        );
        const raciPayload = asRecord(raci);
        const tasksPayload = asRecord(tasks);
        this.data.set({
          userName, orgName, role,
          teams: (myTeams.length ? myTeams : allTeams.slice(0, 3)).map((team) => ({
            team_id: asString(team['team_id']),
            name: asString(team['name']),
            description: asString(team['description']) || undefined,
          })),
          raciSummary: asRecordArray(raciPayload['summary']).map((entry) => ({
            scope_type: asString(entry['scope_type']),
            raci_role: asString(entry['raci_role']),
            count: asNumber(entry['count']),
          })),
          pendingTasks: asNumber(tasksPayload['total']),
        });
      },
      error: () => {
        this.data.set({ userName, orgName, role, teams: [], raciSummary: [], pendingTasks: 0 });
      }
    });
  }

  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  formatRole(r: string): string {
    return r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getRaciSeverity(role: string): 'danger' | 'warning' | 'info' | 'success' | undefined {
    switch (role) {
      case 'responsible': return 'danger';
      case 'accountable': return 'warning';
      case 'consulted': return 'info';
      case 'informed': return 'success';
      default: return undefined;
    }
  }

  private markOnboarded(): void {
    this._storage.set('grc_member_onboarded', 'true');
    this.apiclientSvc.post('/auth/member-onboarded', {}).pipe(retry(2), catchError(() => of(null))).subscribe();
  }

  dismiss() {
    this.dismissed.set(true);
    this.markOnboarded();
    // No frontend invention: outer landing guard (DB-resolved via
    // TenantLandingConfigService) owns the post-dismiss target.
  }

  goToTasks() {
    this.markOnboarded();
    this.router.navigate(['/my-tasks']);
  }

  goToDashboard() {
    this.markOnboarded();
    // No frontend invention: outer landing guard (DB-resolved via
    // TenantLandingConfigService) owns the dashboard target.
  }

}
