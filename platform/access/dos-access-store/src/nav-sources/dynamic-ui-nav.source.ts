import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import type { DosNavItem } from '@dos/ui-contracts';
import type { NavCtx, NavSource, NavSourceResult } from './nav-source';

type DynamicUiNavItem = DosNavItem & {
  permission?: string | null;
};

/**
 * L1 — Dynamic UI nav source.
 * GET /api/dynamic-ui/workspace/nav with 800ms timeout. Tolerant: any
 * non-2xx, network error, timeout, or malformed payload returns null
 * (skip layer). The dynamic-ui service is currently `.skipped`, so this
 * source's null-return is the default state until that backend lands.
 */
@Injectable({ providedIn: 'root' })
export class DynamicUiNavSource implements NavSource {
  readonly id = 'dynamic-ui';
  private readonly http = inject(HttpClient);

  async resolve(_ctx: NavCtx): Promise<NavSourceResult> {
    const result = await firstValueFrom(
      this.http
        .get<{ items?: DynamicUiNavItem[] }>('/api/dynamic-ui/workspace/nav', { withCredentials: true })
        .pipe(timeout(800), catchError(() => of(null))),
    );
    if (!result || !Array.isArray(result.items)) return null;
    return result.items.map((it) => {
      const rawLabel = typeof it.label === 'string' ? it.label.trim() : '';
      const labelLooksLikeKey = rawLabel.includes('.') && !rawLabel.includes(' ');
      return {
        ...it,
        labelKey: it.labelKey ?? (labelLooksLikeKey ? rawLabel : undefined),
        requiredPermission: it.requiredPermission ?? it.permission ?? undefined,
        group: it.group ?? this.id,
      };
    });
  }
}
