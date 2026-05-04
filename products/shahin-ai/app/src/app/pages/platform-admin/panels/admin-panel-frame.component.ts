import { Component, ChangeDetectionStrategy, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationModule } from 'carbon-components-angular/notification';
import { SkeletonModule } from 'carbon-components-angular/skeleton';
import { TilesModule } from 'carbon-components-angular/tiles';
import { ButtonModule } from 'carbon-components-angular/button';
import { ApiResult } from '../platform-admin-api.service';

/**
 * Reusable Carbon-only frame for every admin panel.
 * Renders one of: skeleton (loading), error (incl. 401/403), empty, content.
 */
@Component({
  selector: 'app-admin-panel-frame',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NotificationModule, SkeletonModule, TilesModule, ButtonModule],
  template: `
    <header style="margin-bottom:1.5rem">
      <h1 class="cds--type-productive-heading-04" style="margin:0">{{ title }}</h1>
      @if (subtitle) {
        <p class="cds--type-body-long-01" style="color:#525252;margin:.25rem 0 0">{{ subtitle }}</p>
      }
    </header>

    @if (loading()) {
      <div [attr.data-testid]="testid + '-loading'">
        <cds-skeleton-text [lines]="6"></cds-skeleton-text>
      </div>
    } @else if (errorState() === 'unauthorized') {
      <cds-notification
        [notificationObj]="{ type: 'error', title: 'Unauthorized', message: 'Your platform-admin session is missing or expired. Please sign in again.', lowContrast: true, showClose: false }"
        [attr.data-testid]="testid + '-unauthorized'">
      </cds-notification>
    } @else if (errorState() === 'forbidden') {
      <cds-notification
        [notificationObj]="{ type: 'error', title: 'Forbidden', message: 'You are signed in but do not hold the pillar role required for this surface.', lowContrast: true, showClose: false }"
        [attr.data-testid]="testid + '-forbidden'">
      </cds-notification>
    } @else if (errorState() === 'error') {
      <cds-notification
        [notificationObj]="{ type: 'error', title: 'Failed to load', message: errorMessage() || 'Unknown error', lowContrast: true, showClose: false }"
        [attr.data-testid]="testid + '-error'">
      </cds-notification>
      <div style="margin-top:1rem">
        <button cdsButton="secondary" (click)="reload()">Retry</button>
      </div>
    } @else if (empty()) {
      <cds-tile [attr.data-testid]="testid + '-empty'">
        <p class="cds--type-body-long-01">No data returned from the BFF for this surface yet.</p>
      </cds-tile>
    } @else {
      <ng-content></ng-content>
    }
  `,
})
export class AdminPanelFrameComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() testid = 'admin-panel';

  loading = signal(true);
  errorState = signal<'ok' | 'error' | 'unauthorized' | 'forbidden'>('ok');
  errorMessage = signal<string | null>(null);
  empty = signal(false);

  private fetcher: (() => Promise<void>) | null = null;

  bind(fetcher: () => Promise<void>): void {
    this.fetcher = fetcher;
  }

  async load(): Promise<void> {
    if (!this.fetcher) return;
    this.loading.set(true);
    this.errorState.set('ok');
    this.errorMessage.set(null);
    this.empty.set(false);
    await this.fetcher();
    this.loading.set(false);
  }

  reload(): void { void this.load(); }

  applyResult<T>(r: ApiResult<T>, isEmpty: (data: T) => boolean): T | null {
    if (!r.ok) {
      if (r.status === 401) this.errorState.set('unauthorized');
      else if (r.status === 403) this.errorState.set('forbidden');
      else { this.errorState.set('error'); this.errorMessage.set(r.error); }
      return null;
    }
    if (r.data == null || isEmpty(r.data)) {
      this.empty.set(true);
      return null;
    }
    return r.data;
  }
}


