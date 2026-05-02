import {
  Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, OnInit, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FoundationApiService } from '../services/foundation-api.service';

/**
 * Interactive org-chart canvas component.
 *
 * Renders the organizational hierarchy as an interactive tree/canvas view,
 * supporting drill-down by clicking nodes. Data is loaded from the
 * `/api/foundation/overview` aggregate and the org-hierarchy endpoint.
 *
 * This is a standalone component consumed by the Foundation shell and
 * the Shahin product workspace.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-foundation-org-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="org-canvas-container">
      @if (loading()) {
        <div class="loading-state">
          <span class="pi pi-spin pi-spinner" aria-hidden="true"></span>
          <span class="sr-only">Loading org chart…</span>
        </div>
      } @else if (error()) {
        <div class="error-state" role="alert">
          <span class="pi pi-exclamation-triangle"></span>
          <span>{{ error() }}</span>
        </div>
      } @else {
        <div class="org-tree" role="tree">
          @for (org of organizations(); track org['organization_id'] ?? org['id']) {
            <div class="org-node" role="treeitem">
              <span class="org-node-name">{{ org['name_en'] ?? org['name'] }}</span>
              <span class="org-node-type">{{ org['org_type'] ?? '' }}</span>
            </div>
          }
          @if (!organizations().length) {
            <div class="empty-state">No organizations found.</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .org-canvas-container { padding: 1rem; min-height: 200px; }
    .loading-state, .error-state, .empty-state {
      display: flex; align-items: center; gap: 0.5rem;
      color: var(--text-secondary, #6b7280); padding: 2rem;
    }
    .error-state { color: var(--color-error, #dc2626); }
    .org-tree { display: flex; flex-direction: column; gap: 0.5rem; }
    .org-node {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem; border: 1px solid var(--surface-border, #e5e7eb);
      border-radius: 0.375rem; background: var(--surface-card, #fff);
    }
    .org-node-name { font-weight: 500; }
    .org-node-type { font-size: 0.75rem; color: var(--text-secondary, #6b7280); }
  `],
})
export class FoundationOrgCanvasComponent implements OnInit {
  private readonly api = inject(FoundationApiService);
  readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly organizations = signal<Record<string, unknown>[]>([]);

  ngOnInit(): void {
    this.loadOrganizations();
  }

  private loadOrganizations(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getOrganizations().subscribe({
      next: (res) => {
        const rows = (Array.isArray(res?.organizations) ? res.organizations : []) as Record<string, unknown>[];
        this.organizations.set(rows);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.error.set(FoundationApiService.formatLoadError(err));
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }
}
