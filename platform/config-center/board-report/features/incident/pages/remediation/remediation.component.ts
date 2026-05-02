import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-remediation',
    imports: [CommonModule, EmptyStateComponent],
    template: `
    <div class="remediation-panel">
      <app-empty-state
        *ngIf="!loading() && items().length === 0"
        title="No remediation plans"
        description="Create remediation plans to address incidents and gaps."
        actionLabel="Create Plan"
        (action)="refresh()" />
      <div *ngIf="loading()" class="skeleton-list">
        <div class="skeleton" *ngFor="let i of [1,2,3]"></div>
      </div>
    </div>
  `,
    styles: [`
    .remediation-panel { padding: 16px; }
    .skeleton-list { display: flex; flex-direction: column; gap: 12px; }
    .skeleton { height: 48px; background: var(--surface-hover, #f3f4f6); border-radius: var(--radius); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  `]
})
export class RemediationComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  loading = signal(true);
  items = signal<unknown[]>([]);
  stats = signal<Array<{ value: string; label: string }>>([]);

  ngOnInit(): void { this.refresh(); }
  refresh(): void {
    this.loading.set(true);
    this.http.get<Record<string, unknown>>(`${environment.apiUrl}/remediation`).pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of({}))).subscribe(res => { const arr = Array.isArray(res) ? res : ((res as Record<string, unknown>)?.['data'] as unknown[] || []); this.items.set(arr.slice(0, 50).map((r: unknown) => ({ title: String((r as Record<string, unknown>)['title'] || (r as Record<string, unknown>)['name'] || ''), status: String((r as Record<string, unknown>)['status'] || 'active'), date: String((r as Record<string, unknown>)['created_at'] || new Date().toISOString()), severity: String((r as Record<string, unknown>)['severity'] || 'info'), }))); this.stats.set([{ value: String(arr.length), label: 'Total' }, { value: '0', label: 'Active' }, { value: '0', label: 'Pending' }, { value: '0', label: 'Completed' }]); this.loading.set(false); });
  }
}
