/**
 * Breadcrumb Trail Component
 * 
 * Displays navigation path with collapsible long trails.
 * Uses BreadcrumbService to avoid code duplication (FINDING-002 fix).
 * Requirements: 1.2, 1.3
 */
import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { BreadcrumbService } from '@app/shared/services/breadcrumb.service';
import { Subject, filter, takeUntil } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-breadcrumb-trail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="breadcrumb-trail" aria-label="Breadcrumb">
      <ol>
        <li *ngFor="let crumb of visibleCrumbs; let last = last">
          <a *ngIf="!last" [routerLink]="crumb.url">
            <i *ngIf="crumb.icon" class="pi" [ngClass]="crumb.icon"></i>
            {{ i18n.localize(crumb.label, crumb.labelAr) }}
          </a>
          <span *ngIf="last" class="current" aria-current="page">
            {{ i18n.localize(crumb.label, crumb.labelAr) }}
          </span>
          <i *ngIf="!last" class="pi pi-chevron-right separator"></i>
        </li>
      </ol>
    </nav>
  `,
  styles: [`
    .breadcrumb-trail ol { display: flex; align-items: center; list-style: none; margin: 0; padding: 8px 0; gap: 4px; flex-wrap: wrap; }
    .breadcrumb-trail a { color: var(--primary-color, #4f46e5); text-decoration: none; font-size: var(--font-size-tag); display: flex; align-items: center; gap: 4px; }
    .breadcrumb-trail a:hover { text-decoration: underline; }
    .breadcrumb-trail .current { font-size: var(--font-size-tag); color: var(--text-color, #333); font-weight: 500; }
    .separator { font-size: var(--font-size-2xs); color: var(--text-color-secondary, #aaa); margin: 0 2px; }
  `]
})
export class BreadcrumbTrailComponent implements OnInit, OnDestroy {
  visibleCrumbs: ReturnType<BreadcrumbService['getCurrent']> = [];
  private destroy$ = new Subject<void>();
  i18n = inject(I18nService);
  private breadcrumbService = inject(BreadcrumbService);

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => this.updateBreadcrumbs());
    this.updateBreadcrumbs();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  /**
   * FINDING-002 Fix: Use BreadcrumbService instead of duplicating logic
   * This eliminates code duplication and ensures consistency across the app
   */
  private updateBreadcrumbs(): void {
    const crumbs = this.breadcrumbService.getCurrent();
    // Use BreadcrumbService's collapse method for consistency
    this.visibleCrumbs = this.breadcrumbService.collapse(crumbs, 4);
  }

}
