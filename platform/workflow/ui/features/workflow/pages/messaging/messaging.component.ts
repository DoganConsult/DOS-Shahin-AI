import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { EmptyStateComponent } from '@app/shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-messagingcomponent',
    imports: [CommonModule, EmptyStateComponent],
    template: `
    <div class="tab-panel">
      <div class="tab-header">
        <i class="pi pi-comments"></i>
        <h2>Messaging</h2>
      </div>
      <div *ngIf="loading()" class="loading-state">
        <div class="skeleton" *ngFor="let i of [1,2,3]"></div>
      </div>
      <app-empty-state
        *ngIf="!loading() && items().length === 0"
        title="No messaging records"
        description="Records will appear here once data is available."
        actionLabel="Refresh"
        (action)="refresh()" />
      <div *ngIf="!loading() && items().length > 0" class="data-list">
        <div class="list-item" *ngFor="let item of items()">
          <div class="item-content">
            <span class="item-title">{{ item.title }}</span>
            <span class="item-meta">{{ item.status }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .tab-panel { padding: 20px 0; }
    .tab-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .tab-header i { font-size: var(--font-size-xl); color: var(--primary); }
    .tab-header h2 { margin: 0; font-size: var(--font-size-lg); font-weight: 600; }
    .loading-state { display: flex; flex-direction: column; gap: 10px; }
    .skeleton { height: 44px; background: var(--surface-hover, #f3f4f6); border-radius: var(--radius); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .data-list { display: flex; flex-direction: column; gap: 8px; }
    .list-item { padding: 12px 16px; border: 1px solid var(--border); border-radius: var(--radius); }
    .list-item:hover { background: var(--surface-hover, #f9fafb); }
    .item-content { display: flex; flex-direction: column; gap: 2px; }
    .item-title { font-weight: 500; color: var(--text-heading); }
    .item-meta { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
  `]
})
export class MessagingComponent implements OnInit {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  loading = signal(true);
  items = signal<Array<{ title: string; status: string }>>([]);
  stats = signal<Array<{ value: string; label: string }>>([]);

  ngOnInit(): void { this.refresh(); }
  refresh(): void {
    this.loading.set(true);
    this.http.get<Record<string, unknown>>(`${environment.apiUrl}/messaging`).pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of({}))).subscribe(res => { const arr = Array.isArray(res) ? res : ((res as Record<string, unknown>)?.['data'] as unknown[] || []); this.items.set(arr.slice(0, 50).map((r: unknown) => ({ title: String((r as Record<string, unknown>)['title'] || (r as Record<string, unknown>)['name'] || ''), status: String((r as Record<string, unknown>)['status'] || 'active'), date: String((r as Record<string, unknown>)['created_at'] || new Date().toISOString()), severity: String((r as Record<string, unknown>)['severity'] || 'info'), }))); this.stats.set([{ value: String(arr.length), label: 'Total' }, { value: '0', label: 'Active' }, { value: '0', label: 'Pending' }, { value: '0', label: 'Completed' }]); this.loading.set(false); });
  }
}
