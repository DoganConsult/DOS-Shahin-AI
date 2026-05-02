import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  computed, signal, inject, OnInit, DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface StickyFooterConfig {
  selectedCount: number;
  pendingChanges: number;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSavedIso?: string;
  lang: 'en' | 'ar';
}

@Component({
    selector: 'app-module-sticky-footer',
    imports: [CommonModule, ButtonModule, TooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <footer class="msf" [attr.dir]="config.lang === 'ar' ? 'rtl' : 'ltr'" *ngIf="isVisible">
      <div class="msf-start">
        <span class="msf-selected" *ngIf="config.selectedCount > 0">
          <i class="pi pi-check-square"></i>
          {{ config.selectedCount }} {{ config.lang === 'ar' ? 'محدد' : 'selected' }}
          <button class="msf-clear" (click)="clearSelection.emit()">
            <i class="pi pi-times"></i>
          </button>
        </span>
        <span class="msf-pending" *ngIf="config.pendingChanges > 0">
          <i class="pi pi-pencil"></i>
          {{ config.pendingChanges }} {{ config.lang === 'ar' ? 'تغييرات معلقة' : 'pending' }}
        </span>
      </div>

      <div class="msf-center" *ngIf="config.selectedCount > 0">
        <ng-content select="[footerBulkActions]"></ng-content>
      </div>

      <div class="msf-end">
        <span class="msf-sync" [class]="'msf-sync--' + config.syncStatus"
              [pTooltip]="syncTooltip">
          <i class="pi" [ngClass]="syncIcon"></i>
          {{ syncLabel }}
        </span>
        <span class="msf-saved" *ngIf="config.lastSavedIso">
          {{ savedLabel() }}
        </span>
      </div>
    </footer>
  `,
    styles: [`
    .msf { position: sticky; bottom: 0; z-index: var(--z-elevated, 10); display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 24px; background: var(--surface-0, #fff); border-top: 1px solid var(--border-subtle, #e5e7eb); box-shadow: 0 -2px 8px rgba(var(--color-black-rgb), 0.04); min-height: 36px; }
    .msf-start { display: flex; align-items: center; gap: 12px; }
    .msf-center { display: flex; gap: 6px; }
    .msf-end { display: flex; align-items: center; gap: 10px; margin-inline-start: auto; }
    .msf-selected { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-caption); font-weight: 600; color: var(--primary); }
    .msf-clear { border: none; background: none; cursor: pointer; color: var(--text-muted); padding: 0 2px; }
    .msf-clear:hover { color: var(--error); }
    .msf-pending { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-sm); font-weight: 600; color: var(--warning); }
    .msf-sync { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); font-weight: 600; padding: 2px 8px; border-radius: var(--radius-md); }
    .msf-sync--synced { color: var(--success); background: rgba(var(--module-accent-green-rgb), 0.08); }
    .msf-sync--syncing { color: var(--primary); background: rgba(var(--module-accent-blue-rgb), 0.08); }
    .msf-sync--syncing .pi { animation: spin 1s linear infinite; }
    .msf-sync--offline { color: var(--text-muted); background: var(--surface-100, #f3f4f6); }
    .msf-sync--error { color: var(--error); background: rgba(var(--module-accent-red-rgb), 0.08); }
    .msf-saved { font-size: var(--font-size-xs); color: var(--text-muted); }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 768px) { .msf { padding: 6px 12px; } .msf-center { display: none; } }
  `]
})
export class ModuleStickyFooterComponent implements OnInit {
  @Input() config!: StickyFooterConfig;
  @Output() clearSelection = new EventEmitter<void>();

  private destroyRef = inject(DestroyRef);
  private now = signal(Date.now());

  get isVisible(): boolean {
    return this.config.selectedCount > 0 || this.config.pendingChanges > 0 || this.config.syncStatus !== 'synced';
  }

  get syncIcon(): string {
    const m: Record<string, string> = { synced: 'pi-check-circle', syncing: 'pi-spin pi-spinner', offline: 'pi-wifi-off', error: 'pi-exclamation-triangle' };
    return m[this.config.syncStatus] || 'pi-check-circle';
  }

  get syncLabel(): string {
    const m: Record<string, string> = { synced: 'Synced', syncing: 'Syncing...', offline: 'Offline', error: 'Sync error' };
    return m[this.config.syncStatus] || '';
  }

  get syncTooltip(): string {
    if (this.config.syncStatus === 'error') return 'Last sync failed. Click to retry.';
    return '';
  }

  savedLabel = computed(() => {
    if (!this.config?.lastSavedIso) return '';
    const diff = this.now() - new Date(this.config.lastSavedIso).getTime();
    if (diff < 60000) return 'Saved just now';
    if (diff < 3600000) return 'Saved ' + Math.floor(diff / 60000) + 'm ago';
    return 'Saved ' + Math.floor(diff / 3600000) + 'h ago';
  });

  ngOnInit() {
    interval(30000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.now.set(Date.now()));
  }
}
