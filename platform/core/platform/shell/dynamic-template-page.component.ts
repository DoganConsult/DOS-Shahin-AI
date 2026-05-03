/**
 * Phase F-F3 — DynamicTemplatePageComponent
 *
 * Generic Angular page component used as a `loadComponent` host for any
 * route that wants its archetype + props resolved from the DB instead of
 * hardcoded in the SPA route table.
 *
 * Behaviour:
 *   1. Reads the current router URL.
 *   2. Asks `TemplateBindingService` for the binding row (cached).
 *   3. Looks the export name up in the local archetype registry.
 *   4. Lazy-imports the template Type and renders it via NgComponentOutlet.
 *   5. Passes resolved `props` into the live instance via @Input setters
 *      that match the template-template.types contract (kpis, columns,
 *      tabs, pillars, …). Unknown props are ignored — never thrown.
 *   6. If no binding exists OR the export is not registered, renders an
 *      `<dos-insight-bar>`-only safe fallback so the page is never blank.
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  Type,
  Injector,
  effect,
  EnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgComponentOutlet } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs/operators';
import { TemplateBindingService, type TemplateBinding } from './template-binding.service';
import { loadArchetypeTemplate } from './template-binding.registry';
import { DosInsightBarComponent } from './templates/dos-insight-bar.component';
import type { ModuleInsightPillars } from './templates/module-template.types';

@Component({
  selector: 'dos-dynamic-template-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgComponentOutlet, DosInsightBarComponent],
  template: `
    @if (template(); as tpl) {
      <ng-container
        *ngComponentOutlet="tpl; injector: tplInjector(); inputs: tplInputs()"
      ></ng-container>
    } @else if (loading()) {
      <div class="dos-tpl-loading" data-testid="dos-tpl-loading">Loading…</div>
    } @else {
      <div class="dos-tpl-fallback" data-testid="dos-tpl-fallback">
        <dos-insight-bar [pillars]="fallbackPillars" archetype="empty"></dos-insight-bar>
        <p class="dos-tpl-fallback__msg">
          No template binding for <code>{{ currentRoute() }}</code>.
        </p>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .dos-tpl-loading { padding: 2rem; color: var(--cds-text-secondary, #6f6f6f); }
    .dos-tpl-fallback { padding: 1rem 0; }
    .dos-tpl-fallback__msg {
      margin: 1rem; font-size: 0.875rem; color: var(--cds-text-secondary, #6f6f6f);
    }
  `],
})
export class DynamicTemplatePageComponent {
  private readonly router = inject(Router);
  private readonly bindings = inject(TemplateBindingService);
  private readonly envInjector = inject(EnvironmentInjector);

  readonly currentRoute = signal<string>(this.normalize(this.router.url));
  readonly binding = signal<TemplateBinding | null>(null);
  readonly template = signal<Type<unknown> | null>(null);
  readonly loading = signal<boolean>(true);

  readonly tplInjector = computed(() => this.envInjector);
  readonly tplInputs = computed<Record<string, unknown>>(() => {
    const b = this.binding();
    if (!b) return {};
    const p = b.props ?? {};
    // Map DB-resolved arrays to the template @Input names.
    return {
      kpis: p.kpis ?? [],
      columns: p.columns ?? [],
      tabs: p.tabs ?? [],
      nextBestActions: p.nextBestActions ?? [],
      settingsSections: p.settingsSections ?? [],
      reportCards: p.reportCards ?? [],
      workqueueGroups: p.workqueueGroups ?? [],
      heatmapAxes: p.heatmapAxes ?? [],
      pillars: p.pillars ?? this.fallbackPillars,
      archetype: b.archetype,
      route: b.route,
    };
  });

  readonly fallbackPillars: ModuleInsightPillars = {
    whatChanged: 'No DB-driven content yet for this route.',
    evidence: 'Phase F template-binding row missing — falling back to safe shell.',
  };

  constructor() {
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.currentRoute.set(this.normalize(this.router.url));
      });

    effect(() => {
      const route = this.currentRoute();
      this.loading.set(true);
      this.binding.set(null);
      this.template.set(null);
      runInInjectionContext(this.envInjector, () => {
        this.bindings.resolve(route).subscribe(async (b) => {
          this.binding.set(b);
          if (!b?.template_export) {
            this.loading.set(false);
            return;
          }
          const promise = loadArchetypeTemplate(b.template_export);
          if (!promise) {
            this.loading.set(false);
            return;
          }
          try {
            const cmp = await promise;
            // Drop result if the user navigated away while we awaited.
            if (this.currentRoute() !== route) return;
            this.template.set(cmp);
          } finally {
            this.loading.set(false);
          }
        });
      });
    });
  }

  private normalize(url: string): string {
    const q = url.indexOf('?');
    const u = q === -1 ? url : url.slice(0, q);
    return u.length > 1 && u.endsWith('/') ? u.slice(0, -1) : u;
  }
}
