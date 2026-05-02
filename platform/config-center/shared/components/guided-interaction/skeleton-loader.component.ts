/**
 * Canonical Skeleton Loader Component
 * 
 * This is the primary loading state component for pages, lists, and detail views.
 * Use this component to show loading states instead of custom loading UI.
 * 
 * @see STATE_PATTERNS.md for state pattern usage policy
 * 
 * Usage:
 * ```typescript
 * <app-skeleton-loader [variant]="'card'" />
 * <app-skeleton-loader [variant]="'list'" [rows]="5" />
 * <app-skeleton-loader [variant]="'detail'" />
 * ```
 * 
 * Requirements: 7.3
 */
import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-skeleton-loader',
    imports: [CommonModule],
    template: `
    <div class="skeleton-container" [attr.aria-label]="'Loading'" role="status">
      <ng-container [ngSwitch]="variant">
        <div *ngSwitchCase="'card'" class="skeleton-card">
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line medium"></div>
        </div>
        <div *ngSwitchCase="'list'">
          <div *ngFor="let _ of rows" class="skeleton-list-item">
            <div class="skeleton-circle"></div>
            <div class="skeleton-lines">
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
            </div>
          </div>
        </div>
        <div *ngSwitchCase="'detail'" class="skeleton-detail">
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line"></div>
        </div>
        <div *ngSwitchDefault class="skeleton-card">
          <div class="skeleton-line"></div>
          <div class="skeleton-line medium"></div>
        </div>
      </ng-container>
    </div>
  `,
    styles: [`
    @keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
    .skeleton-line {
      height: 14px;
      border-radius: var(--radius-xs);
      margin-bottom: var(--space-md);
      background: linear-gradient(90deg, var(--carbon-gray-10) 25%, var(--carbon-gray-20) 50%, var(--carbon-gray-10) 75%);
      background-size: 400px 100%;
      animation: shimmer 1.5s infinite;
    }
    .skeleton-line.short { width: 40%; }
    .skeleton-line.medium { width: 70%; }
    .skeleton-card {
      padding: var(--space-md);
      border: 1px solid var(--carbon-gray-10);
      border-radius: var(--radius);
    }
    .skeleton-list-item {
      display: flex;
      gap: var(--space-md);
      padding: var(--space-md) 0;
      align-items: center;
    }
    .skeleton-circle {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-pill);
      background: linear-gradient(90deg, var(--carbon-gray-10) 25%, var(--carbon-gray-20) 50%, var(--carbon-gray-10) 75%);
      background-size: 400px 100%;
      animation: shimmer 1.5s infinite;
      flex-shrink: 0;
    }
    .skeleton-lines { flex: 1; }
    .skeleton-detail { padding: var(--space-md); }
  `]
})
export class SkeletonLoaderComponent {
  @Input() variant: 'card' | 'list' | 'detail' = 'card';
  @Input() count = 3;
  get rows(): number[] { return Array(this.count).fill(0); }

}
