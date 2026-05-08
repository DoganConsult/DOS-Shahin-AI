// F10 — Foundation domain renderer components.
// Doctrine:
//   - Zero placeholder. Each component is a real renderer.
//   - Zero hardcoded user-facing labels. All display text comes from `surface.props` (camelCase).
//   - Empty / missing props => visible diagnostic-safe empty state. No fabricated business data.
//   - All components accept `surface = input.required<FcWorkspaceSurface>()`.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { FcWorkspaceSurface } from '@fc/ui-contracts';

// ── foundation.section.heading ───────────────────────────────────────
interface SectionHeadingProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly level?: 1 | 2 | 3 | 4 | 5 | 6;
}
@Component({
  selector: 'fc-foundation-section-heading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="fc-section-heading"
            [attr.data-surface-id]="surface().surfaceId"
            [attr.data-level]="level()">
      @if (title()) {
        @switch (level()) {
          @case (1) { <h1 class="fc-section-heading__title">{{ title() }}</h1> }
          @case (2) { <h2 class="fc-section-heading__title">{{ title() }}</h2> }
          @case (3) { <h3 class="fc-section-heading__title">{{ title() }}</h3> }
          @case (4) { <h4 class="fc-section-heading__title">{{ title() }}</h4> }
          @case (5) { <h5 class="fc-section-heading__title">{{ title() }}</h5> }
          @case (6) { <h6 class="fc-section-heading__title">{{ title() }}</h6> }
        }
      } @else {
        <span class="fc-section-heading__diag">missing prop: title</span>
      }
      @if (subtitle()) {
        <p class="fc-section-heading__subtitle">{{ subtitle() }}</p>
      }
    </header>
  `,
  styles: [
    `
      .fc-section-heading { display: block; padding: 0.75rem 0; }
      .fc-section-heading__title { margin: 0; font-weight: 600; }
      .fc-section-heading__subtitle { margin: 0.25rem 0 0; opacity: 0.75; }
      .fc-section-heading__diag { font: 12px/1.4 ui-monospace, monospace; opacity: 0.6; }
    `,
  ],
})
export class FoundationSectionHeadingComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly title = computed<string>(() => {
    const p = this.surface().props as SectionHeadingProps;
    return p.title ?? '';
  });
  readonly subtitle = computed<string>(() => {
    const p = this.surface().props as SectionHeadingProps;
    return p.subtitle ?? '';
  });
  readonly level = computed<1 | 2 | 3 | 4 | 5 | 6>(() => {
    const p = this.surface().props as SectionHeadingProps;
    const lv = p.level;
    return lv === 1 || lv === 2 || lv === 3 || lv === 4 || lv === 5 || lv === 6 ? lv : 2;
  });
}

// ── foundation.tile.metric ───────────────────────────────────────────
interface MetricTileProps {
  readonly label?: string;
  readonly value?: string | number;
  readonly unit?: string;
  readonly trend?: 'up' | 'down' | 'flat';
}
@Component({
  selector: 'fc-foundation-tile-metric',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="fc-metric"
             [attr.data-surface-id]="surface().surfaceId"
             [attr.data-trend]="trend()">
      @if (label()) {
        <h4 class="fc-metric__label">{{ label() }}</h4>
      } @else {
        <span class="fc-metric__diag">missing prop: label</span>
      }
      @if (hasValue()) {
        <div class="fc-metric__value-row">
          <span class="fc-metric__value">{{ value() }}</span>
          @if (unit()) { <span class="fc-metric__unit">{{ unit() }}</span> }
        </div>
      } @else {
        <span class="fc-metric__diag">missing prop: value</span>
      }
    </article>
  `,
  styles: [
    `
      .fc-metric { display: block; padding: 1rem; border: 1px solid currentColor; min-width: 12rem; }
      .fc-metric__label { margin: 0 0 0.5rem; font-size: 0.875rem; opacity: 0.75; font-weight: 500; }
      .fc-metric__value-row { display: flex; align-items: baseline; gap: 0.25rem; }
      .fc-metric__value { font-size: 1.75rem; font-weight: 600; line-height: 1; }
      .fc-metric__unit { font-size: 0.875rem; opacity: 0.75; }
      .fc-metric__diag { font: 12px/1.4 ui-monospace, monospace; opacity: 0.6; display: block; }
      .fc-metric[data-trend='up']   { border-left: 3px solid #007d3a; }
      .fc-metric[data-trend='down'] { border-left: 3px solid #b00020; }
    `,
  ],
})
export class FoundationTileMetricComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly label = computed<string>(() => (this.surface().props as MetricTileProps).label ?? '');
  readonly value = computed<string | number>(() => {
    const v = (this.surface().props as MetricTileProps).value;
    return v ?? '';
  });
  readonly hasValue = computed<boolean>(() => {
    const v = (this.surface().props as MetricTileProps).value;
    return v !== undefined && v !== null && v !== '';
  });
  readonly unit = computed<string>(() => (this.surface().props as MetricTileProps).unit ?? '');
  readonly trend = computed<'up' | 'down' | 'flat' | ''>(() => {
    const t = (this.surface().props as MetricTileProps).trend;
    return t === 'up' || t === 'down' || t === 'flat' ? t : '';
  });
}

// ── foundation.list.simple ───────────────────────────────────────────
interface SimpleListItem {
  readonly id?: string;
  readonly label?: string;
  readonly hint?: string;
}
interface SimpleListProps {
  readonly items?: readonly SimpleListItem[];
  readonly emptyMessage?: string;
}
@Component({
  selector: 'fc-foundation-list-simple',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="fc-list" [attr.data-surface-id]="surface().surfaceId">
      @for (item of items(); track item.id ?? $index) {
        <li class="fc-list__item" [attr.data-item-id]="item.id ?? null">
          @if (item.label) {
            <span class="fc-list__label">{{ item.label }}</span>
          } @else {
            <span class="fc-list__diag">missing item.label</span>
          }
          @if (item.hint) { <span class="fc-list__hint">{{ item.hint }}</span> }
        </li>
      } @empty {
        <li class="fc-list__empty">
          @if (emptyMessage()) { {{ emptyMessage() }} }
          @else { <span class="fc-list__diag">empty list (no items prop)</span> }
        </li>
      }
    </ul>
  `,
  styles: [
    `
      .fc-list { list-style: none; padding: 0; margin: 0; }
      .fc-list__item { display: flex; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid currentColor; }
      .fc-list__label { font-weight: 500; }
      .fc-list__hint { opacity: 0.75; font-size: 0.875rem; }
      .fc-list__empty { padding: 0.5rem 0; opacity: 0.75; }
      .fc-list__diag { font: 12px/1.4 ui-monospace, monospace; opacity: 0.6; }
    `,
  ],
})
export class FoundationListSimpleComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly items = computed<readonly SimpleListItem[]>(() => {
    const p = this.surface().props as SimpleListProps;
    return Array.isArray(p.items) ? p.items : [];
  });
  readonly emptyMessage = computed<string>(() => {
    const p = this.surface().props as SimpleListProps;
    return p.emptyMessage ?? '';
  });
}

// ── foundation.dashboard.summary ─────────────────────────────────────
// Dashboard composes other approved tiles via a metrics array. Items are camelCase MetricTileProps.
interface DashboardSummaryProps {
  readonly title?: string;
  readonly metrics?: readonly MetricTileProps[];
}
@Component({
  selector: 'fc-foundation-dashboard-summary',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fc-dashboard" [attr.data-surface-id]="surface().surfaceId">
      @if (title()) {
        <h2 class="fc-dashboard__title">{{ title() }}</h2>
      }
      <div class="fc-dashboard__grid">
        @for (m of metrics(); track $index) {
          <article class="fc-metric"
                   [attr.data-trend]="m.trend ?? ''">
            @if (m.label) {
              <h4 class="fc-metric__label">{{ m.label }}</h4>
            } @else {
              <span class="fc-metric__diag">missing metric.label</span>
            }
            @if (m.value !== undefined && m.value !== null && m.value !== '') {
              <div class="fc-metric__value-row">
                <span class="fc-metric__value">{{ m.value }}</span>
                @if (m.unit) { <span class="fc-metric__unit">{{ m.unit }}</span> }
              </div>
            } @else {
              <span class="fc-metric__diag">missing metric.value</span>
            }
          </article>
        } @empty {
          <span class="fc-dashboard__diag">no metrics (props.metrics is empty)</span>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .fc-dashboard { display: block; padding: 0.5rem 0; }
      .fc-dashboard__title { margin: 0 0 1rem; font-size: 1.125rem; font-weight: 600; }
      .fc-dashboard__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 0.75rem; }
      .fc-dashboard__diag { font: 12px/1.4 ui-monospace, monospace; opacity: 0.6; }
      .fc-metric { display: block; padding: 1rem; border: 1px solid currentColor; }
      .fc-metric__label { margin: 0 0 0.5rem; font-size: 0.875rem; opacity: 0.75; font-weight: 500; }
      .fc-metric__value-row { display: flex; align-items: baseline; gap: 0.25rem; }
      .fc-metric__value { font-size: 1.75rem; font-weight: 600; line-height: 1; }
      .fc-metric__unit { font-size: 0.875rem; opacity: 0.75; }
      .fc-metric__diag { font: 12px/1.4 ui-monospace, monospace; opacity: 0.6; display: block; }
      .fc-metric[data-trend='up']   { border-left: 3px solid #007d3a; }
      .fc-metric[data-trend='down'] { border-left: 3px solid #b00020; }
    `,
  ],
})
export class FoundationDashboardSummaryComponent {
  readonly surface = input.required<FcWorkspaceSurface>();
  readonly title = computed<string>(() => {
    const p = this.surface().props as DashboardSummaryProps;
    return p.title ?? '';
  });
  readonly metrics = computed<readonly MetricTileProps[]>(() => {
    const p = this.surface().props as DashboardSummaryProps;
    return Array.isArray(p.metrics) ? p.metrics : [];
  });
}
