import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface Role { id?: string; code?: string; name_en?: string; name_ar?: string; description_en?: string; is_system?: boolean; user_count?: number; permissions?: string[]; status?: string; [k: string]: unknown; }

@Component({
  selector: 'app-foundation-roles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FormsModule, FoundationPageShellComponent],
  styles: [`
    .roles-page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0; }
    .btn-primary { background: var(--primary-color); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); }
    .search-bar { margin-bottom: 16px; }
    .search-bar input { width: 100%; max-width: 320px; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); }
    .roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .role-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); padding: 16px; transition: box-shadow .15s; cursor: pointer; text-decoration: none; color: inherit; display: block; }
    .role-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); }
    .role-name { font-weight: 600; font-size: var(--font-size-md); margin-bottom: 4px; }
    .role-code { font-family: monospace; font-size: var(--font-size-xs); color: var(--text-color-secondary); margin-bottom: 8px; }
    .role-meta { display: flex; gap: 12px; font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: var(--font-size-2xs); font-weight: 600; }
    .badge.system { background: var(--blue-100); color: var(--blue-700); }
    .badge.custom { background: var(--surface-section); color: var(--text-color-secondary); }
    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary); }
    .error-msg { color: var(--red-500); font-size: var(--font-size-sm); margin-bottom: 12px; }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/roles'" [titleKey]="'foundation.nav.roles'" [showRail]="true">
    <div class="roles-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h2 class="page-title">{{ i18n.tr('nav.foundationRoles', 'Roles & Permissions') }}</h2>
      </div>
      @if (error()) { <div class="error-msg">{{ error() }}</div> }
      <div class="search-bar">
        <input type="text" [(ngModel)]="searchTerm" placeholder="Search roles…" (input)="applyFilter()" />
      </div>
      @if (loading()) {
        <div class="empty-state">Loading…</div>
      } @else if (filtered().length === 0) {
        <div class="empty-state">No roles found.</div>
      } @else {
        <div class="roles-grid">
          @for (role of filtered(); track role.id ?? role.code) {
            <a class="role-card" [routerLink]="[role.id || role.code]">
              <div class="role-name">{{ role.name_en || role.code }}</div>
              <div class="role-code">{{ role.code }}</div>
              <div class="role-meta">
                <span class="badge" [class.system]="role.is_system" [class.custom]="!role.is_system">{{ role.is_system ? 'System' : 'Custom' }}</span>
                <span>{{ role.user_count ?? 0 }} users</span>
                <span>{{ (role.permissions || []).length }} perms</span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationRolesComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  loading = signal(true); error = signal<string | null>(null);
  items = signal<Role[]>([]); filtered = signal<Role[]>([]); searchTerm = '';

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.api.getFoundationRoles().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => { this.items.set((res as any).profiles ?? (res as any).roles ?? []); this.applyFilter(); this.loading.set(false); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.loading.set(false); },
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) { this.filtered.set(this.items()); return; }
    this.filtered.set(this.items().filter(r => (r.name_en ?? r.code ?? '').toLowerCase().includes(term)));
  }
}
