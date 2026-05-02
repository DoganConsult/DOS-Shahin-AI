import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosEmptyStateComponent } from '@dos/ui-system';

/**
 * ComplianceEmptyState — thin compliance-flavored wrapper over the canonical
 * `DosEmptyStateComponent` from `@dos/ui-system`. Provides a `variant` input
 * that maps compliance entity kinds (frameworks/domains/obligations/gaps/roadmap)
 * to a Carbon icon glyph; everything else is forwarded to the universal
 * empty-state primitive.
 *
 * Migrated from PrimeNG (ButtonModule + `pi pi-*` icons) to `@dos/ui-system`
 * to satisfy §11 (Universal UI Design Standards) and §6 (Renderer Registry).
 */
export type EmptyVariant = 'frameworks' | 'domains' | 'obligations' | 'gaps' | 'roadmap';

const VARIANT_ICONS: Record<EmptyVariant, string> = {
  frameworks: 'apps',
  domains: 'tree',
  obligations: 'list',
  gaps: 'search',
  roadmap: 'map',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-empty-state',
  standalone: true,
  imports: [CommonModule, DosEmptyStateComponent],
  template: `
    <dos-empty-state
      [title]="title"
      [description]="subtitle"
      [icon]="iconKey"
      [primaryAction]="ctaLabel || undefined"
      (primary)="ctaClick.emit()"
    ></dos-empty-state>
  `,
})
export class ComplianceEmptyStateComponent {
  @Input() variant: EmptyVariant = 'frameworks';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() ctaLabel = '';
  @Output() ctaClick = new EventEmitter<void>();

  get iconKey(): string {
    return VARIANT_ICONS[this.variant] || 'inbox';
  }
}
