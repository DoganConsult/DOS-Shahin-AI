import { Component, ChangeDetectionStrategy, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface RoleDetail {
  id?: string;
  code?: string;
  name_en?: string;
  name_ar?: string;
  description_en?: string;
  tier?: string;
  status?: string;
  is_system?: boolean;
  user_count?: number;
  permissions?: string[];
  [key: string]: unknown;
}

@Component({
  selector: 'app-foundation-role-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FoundationPageShellComponent],
  template: `
    <foundation-page-shell [route]="'/foundation/roles/:id'" [titleKey]="'foundation.nav.roles'">
    <section class="foundation-page p-4" [attr.dir]="'ltr'">
      <a routerLink="../roles" class="text-primary mb-3 inline-block">&larr; Back to Roles</a>

      @if (loading()) {
        <div class="flex items-center gap-2 mt-4"><i class="pi pi-spin pi-spinner"></i> Loading role detail…</div>
      } @else if (error()) {
        <div class="p-4 bg-red-50 text-red-700 rounded mt-4">{{ error() }}</div>
      } @else if (role()) {
        <div class="mt-4">
          <h2 class="text-xl font-semibold mb-1">{{ role()!.name_en || role()!.code }}</h2>
          @if (role()!.name_ar) { <p class="text-surface-500 mb-4" dir="rtl">{{ role()!.name_ar }}</p> }

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="p-3 border rounded">
              <span class="text-xs text-surface-400 uppercase">Code</span>
              <p class="font-mono text-sm mt-1">{{ role()!.code }}</p>
            </div>
            <div class="p-3 border rounded">
              <span class="text-xs text-surface-400 uppercase">Status</span>
              <p class="mt-1"><span class="px-2 py-0.5 rounded text-xs" [ngClass]="role()!.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-surface-100 text-surface-600'">{{ role()!.status || 'active' }}</span></p>
            </div>
            <div class="p-3 border rounded">
              <span class="text-xs text-surface-400 uppercase">System Role</span>
              <p class="mt-1">{{ role()!.is_system ? 'Yes' : 'No' }}</p>
            </div>
            <div class="p-3 border rounded">
              <span class="text-xs text-surface-400 uppercase">Assigned Users</span>
              <p class="mt-1 text-lg font-semibold">{{ role()!.user_count ?? 0 }}</p>
            </div>
          </div>

          @if (role()!.description_en) {
            <div class="mb-6">
              <h3 class="text-sm font-medium text-surface-500 mb-1">Description</h3>
              <p>{{ role()!.description_en }}</p>
            </div>
          }

          <div>
            <h3 class="text-sm font-medium text-surface-500 mb-2">Permissions ({{ (role()!.permissions || []).length }})</h3>
            @if ((role()!.permissions || []).length === 0) {
              <p class="text-surface-400 text-sm">No permissions assigned.</p>
            } @else {
              <div class="flex flex-wrap gap-2">
                @for (perm of role()!.permissions; track perm) {
                  <span class="px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs font-mono">{{ perm }}</span>
                }
              </div>
            }
          </div>
        </div>
      } @else {
        <p class="text-surface-400 mt-4">Role not found.</p>
      }
    </section>
  
    </foundation-page-shell>
  `,
})
export class FoundationRoleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(FoundationApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly role = signal<RoleDetail | null>(null);

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('code');
    if (!code) {
      this.error.set('No role code provided');
      this.loading.set(false);
      return;
    }
    this.api.getRoleDetail(code).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => {
        this.role.set(res?.data ?? res ?? null);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(FoundationApiService.formatLoadError(err));
        this.loading.set(false);
      },
    });
  }
}
