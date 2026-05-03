import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import type { DosNavGroup, DosNavItem } from '@dos/ui-contracts';

export interface Breadcrumb {
  label: string;
  route?: string;
}

/**
 * BreadcrumbService — auto-derives breadcrumbs from the active URL + nav groups.
 *
 * Rather than requiring every route to declare static breadcrumb data,
 * this service matches the current router URL against the resolved nav groups
 * (from WorkspaceNavigationAdapter) and builds a 2-level trail:
 *   [Group Label] > [Item Label (current page)]
 *
 * Falls back to empty array when no match is found (e.g. workspace-home).
 * Consumer calls `setCrumbs(groups)` after nav refresh to keep the mapping fresh.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router);

  private _groups: ReadonlyArray<DosNavGroup> = [];

  /** Update the nav groups used for breadcrumb resolution. Called by the shell after nav refresh. */
  setGroups(groups: ReadonlyArray<DosNavGroup>): void {
    this._groups = groups;
    this._resolveNow();
  }

  private _crumbs: Breadcrumb[] = [];
  private _listeners: Array<(crumbs: Breadcrumb[]) => void> = [];

  readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this._resolveNow());
  }

  get crumbs(): Breadcrumb[] {
    return this._crumbs;
  }

  private _resolveNow(): void {
    this._crumbs = this._build(this.router.url.split('?')[0]);
    this._listeners.forEach((fn) => fn(this._crumbs));
  }

  /** Returns current breadcrumbs immediately and calls cb on every navigation. */
  subscribe(cb: (crumbs: Breadcrumb[]) => void): () => void {
    this._listeners.push(cb);
    cb(this._crumbs);
    return () => {
      this._listeners = this._listeners.filter((f) => f !== cb);
    };
  }

  private _build(url: string): Breadcrumb[] {
    for (const group of this._groups) {
      for (const item of group.items ?? []) {
        const route = (item as DosNavItem).route?.split('?')[0];
        if (!route) continue;
        if (url === route || url.startsWith(`${route}/`)) {
          const groupLabel = (group as { label?: string }).label ?? group.id;
          const itemLabel = (item as DosNavItem & { label?: string }).label ?? item.id;
          return [
            { label: groupLabel },
            { label: itemLabel, route },
          ];
        }
      }
    }
    return [];
  }
}
