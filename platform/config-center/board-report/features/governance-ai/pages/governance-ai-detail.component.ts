import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/infrastructure';
import { DisplayValuePipe } from '@app/shared/pipes';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-governance-ai-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DisplayValuePipe],
  template: `
    <div class="detail-shell" [dir]="i18n.direction()">
      <header class="detail-header">
        <button class="back-btn" routerLink=".."><i class="pi pi-arrow-left"></i> Back</button>
        <h2>{{ entity()?.title || 'Governance AI Detail' }}</h2>
      </header>
      <div class="detail-body">
        <div *ngIf="loading()" class="loading-state">
          <div class="skeleton" *ngFor="let i of [1,2,3]"></div>
        </div>
        <div *ngIf="!loading() && entity()" class="detail-content">
          <div class="detail-grid">
            <div class="field"><label>Status</label><span class="badge">{{ entity()?.status }}</span></div>
            <div class="field"><label>Category</label><span>{{ entity()?.category | displayValue }}</span></div>
            <div class="field"><label>Owner</label><span>{{ entity()?.owner || 'Unassigned' }}</span></div>
            <div class="field"><label>Created</label><span>{{ entity()?.created_at }}</span></div>
          </div>
          <div class="description-block" *ngIf="entity()?.description">
            <label>Description</label>
            <p>{{ entity()?.description }}</p>
          </div>
        </div>
        <div *ngIf="!loading() && !entity()" class="empty-detail">
          <p>Record not found.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-shell { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .detail-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .back-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius); background: var(--surface-card); cursor: pointer; font-size: var(--font-size-xs-plus); }
    h2 { margin: 0; font-size: var(--font-size-xl); font-weight: 600; }
    .detail-body { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-lg); padding: 24px; }
    .loading-state { display: flex; flex-direction: column; gap: 12px; }
    .skeleton { height: 48px; background: var(--surface-hover, #f3f4f6); border-radius: var(--radius); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; color: var(--text-color-secondary); }
    .badge { display: inline-block; padding: 3px 10px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: 600; background: var(--blue-50); color: var(--blue-700); }
    .description-block label { font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; color: var(--text-color-secondary); display: block; margin-bottom: 6px; }
    .description-block p { font-size: var(--font-size-base); line-height: 1.6; color: var(--text-color); }
    .empty-detail { text-align: center; padding: 40px; color: var(--text-color-secondary); }
  `],
})
export class GovernanceAiDetailComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  entity = signal<Record<string, unknown> | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.http.get<Record<string, unknown>>(`/api/governance-ai/${id}`).pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null)),
      ).subscribe(data => {
        this.entity.set(data);
        this.loading.set(false);
      });
    } else {
      this.loading.set(false);
    }
  }
}
