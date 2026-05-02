import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/infrastructure';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-governance-ai-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-shell" [dir]="i18n.direction()">
      <h2>Governance AI — Administration</h2>
      <div class="admin-sections">
        <div class="admin-card">
          <h3>Settings</h3>
          <div *ngIf="loading()" class="loading-state"><div class="skeleton"></div></div>
          <div *ngIf="!loading()">
            <div class="setting-row" *ngFor="let s of settings()">
              <span class="setting-key">{{ s.key }}</span>
              <span class="setting-value">{{ s.value }}</span>
            </div>
            <p *ngIf="settings().length === 0" class="empty-text">No settings configured</p>
          </div>
        </div>
        <div class="admin-card">
          <h3>Health</h3>
          <div class="health-indicator" [class.healthy]="health() === 'healthy'" [class.degraded]="health() === 'degraded'" [class.critical]="health() === 'critical'">
            {{ health() || i18n.translate('common.unknown') }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-shell { padding: 24px 28px; }
    h2 { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .admin-sections { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
    .admin-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-lg); padding: 20px; }
    .admin-card h3 { margin: 0 0 16px; font-size: var(--font-size-md); font-weight: 600; }
    .loading-state { display: flex; flex-direction: column; gap: 8px; }
    .skeleton { height: 32px; background: var(--surface-hover, #f3f4f6); border-radius: var(--radius-sm); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .setting-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--surface-50); font-size: var(--font-size-base); }
    .setting-key { color: var(--text-color-secondary); }
    .setting-value { font-weight: 500; }
    .empty-text { color: var(--text-color-secondary); font-size: var(--font-size-xs-plus); }
    .health-indicator { display: inline-block; padding: 6px 16px; border-radius: var(--radius); font-weight: 600; font-size: var(--font-size-base); text-transform: uppercase; }
    .healthy { background: var(--green-50); color: var(--green-700); }
    .degraded { background: var(--yellow-50); color: var(--yellow-700); }
    .critical { background: var(--red-50); color: var(--red-700); }
  `],
})
export class GovernanceAiAdminComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  settings = signal<Array<{ key: string; value: string }>>([]);
  health = signal<string>('healthy');

  ngOnInit(): void {
    this.http.get<{ data: Array<{ key: string; value: string }> }>(`/api/governance-ai/admin/settings`).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of({ data: [] })),
    ).subscribe(res => {
      this.settings.set(res.data || []);
      this.loading.set(false);
    });

    this.http.get<{ data: { overallHealth?: string } }>(`/api/governance-ai/admin/diagnostics`).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of({ data: { overallHealth: 'healthy' } })),
    ).subscribe(res => {
      this.health.set(res.data?.overallHealth || 'healthy');
    });
  }
}
