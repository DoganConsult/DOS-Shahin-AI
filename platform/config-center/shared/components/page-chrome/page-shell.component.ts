import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-shell',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-shell">
      <header class="page-shell__head">
        <div class="page-shell__title">
          @if (icon) {
            <span class="page-shell__icon" aria-hidden="true">{{ icon }}</span>
          }
          <div class="page-shell__text">
            <h1 class="page-shell__h">{{ title }}</h1>
            @if (subtitle) {
              <p class="page-shell__sub">{{ subtitle }}</p>
            }
          </div>
        </div>
        @if (breadcrumbs && breadcrumbs.length > 0) {
          <nav class="page-shell__crumbs" aria-label="Breadcrumb">
            <span *ngFor="let c of breadcrumbs; let last = last">
              <span>{{ c }}</span>
              <span *ngIf="!last" aria-hidden="true"> / </span>
            </span>
          </nav>
        }
      </header>

      @if (loading) {
        <div class="page-shell__loading" role="status" aria-live="polite">Loading…</div>
      }

      <div class="page-shell__body">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styles: [`
    .page-shell { display: block; }
    .page-shell__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .page-shell__title { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .page-shell__icon { font-size: 1.25rem; color: var(--cds-text-secondary, #525252); }
    .page-shell__h { margin: 0; font-size: 1.25rem; font-weight: 700; }
    .page-shell__sub { margin: 4px 0 0; color: var(--cds-text-secondary, #525252); }
    .page-shell__crumbs { color: var(--cds-text-secondary, #525252); font-size: 0.875rem; }
    .page-shell__loading { margin: 8px 0 16px; color: var(--cds-text-secondary, #525252); }
    .page-shell__body { min-width: 0; }
  `],
})
export class PageShellComponent {
  @Input() icon?: string;
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() breadcrumbs: string[] = [];
  @Input() loading = false;
}

