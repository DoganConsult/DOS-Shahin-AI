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
    const p: Record<string, unknown> = (b.props ?? {}) as Record<string, unknown>;

    // Resolver → template @Input alias map. The ui-os resolver returns
    // archetype-specific data under domain-named keys (orgChartNodes,
    // ownershipEdges, …); the templates declare shorter @Input names
    // (nodes, edges, …). This map closes the gap so both halves of the
    // dynamic-routing contract agree without renaming either side.
    const ALIAS: Record<string, string> = {
      orgChartNodes:           'nodes',
      ownershipEdges:          'edges',
      workflowTimelineSteps:   'steps',
      agentFlowSteps:          'steps',
      auditLedgerRows:         'rows',
      auditEvidenceArtifacts:  'artifacts',
      exportArtifacts:         'artifacts',
      followUpItems:           'items',
      delegationRules:         'rules',
      agentRegistry:           'agents',
      roadmapMilestones:       'milestones',
      calendarEvents:          'events',
      incidentRunbookSteps:    'runbook',
      incidentCommunications:  'communications',
      // case-finalization resolver already returns 'cases' which the
      // template input is also called 'cases' — no alias needed.
      // ─── Phase F-F8 — base-array → archetype-template @Input aliases ──
      // command-home expects `nbaActions`; resolver returns `nextBestActions`.
      nextBestActions:         'nbaActions',
      // evidence-reports expects `reports`; resolver returns `reportCards`.
      reportCards:             'reports',
      // module-settings expects `sections`; resolver returns `settingsSections`.
      settingsSections:        'sections',
      // workflow-control expects `tabs` (already a base array) plus
      // `progressSteps` which the F8 resolver now returns natively.
    };

    // 1. Spread the entire resolver payload so any new key the resolver
    //    later adds (e.g. for archetypes without an explicit forward
    //    mapping) reaches the template automatically.
    const out: Record<string, unknown> = { ...p };

    // 2. Apply the alias map. Keep the original key too so DB-driven
    //    consumers/tests can still introspect by domain name.
    for (const [from, to] of Object.entries(ALIAS)) {
      if (p[from] !== undefined && out[to] === undefined) {
        out[to] = p[from];
      }
    }

    // 3. Provide stable defaults for the 8 base arrays so every
    //    template's `@Input ... = []` keeps its empty-state contract
    //    even when the resolver omits them.
    out['kpis']             ??= [];
    out['columns']          ??= [];
    out['tabs']             ??= [];
    out['nextBestActions']  ??= [];
    out['settingsSections'] ??= [];
    out['reportCards']      ??= [];
    out['workqueueGroups']  ??= [];
    out['heatmapAxes']      ??= [];
    out['pillars']          ??= this.fallbackPillars;

    // 4. Surface masthead scalars from props.masthead (Phase F-F7) so
    //    every template gets a populated header without needing per-
    //    page bespoke wiring. ui-os-service derives `masthead` from the
    //    new title_en/ar, subtitle_en/ar, eyebrow_en/ar, ai_headline_en/ar,
    //    status_tags, primary_action columns on
    //    `dos.ui_route_template_binding` (migration 0120).
    const masthead = (p['masthead'] as Record<string, unknown> | undefined) ?? {};
    if (masthead['title']        !== undefined) out['title']        ??= masthead['title'];
    if (masthead['subtitle']     !== undefined) out['subtitle']     ??= masthead['subtitle'];
    if (masthead['eyebrow']      !== undefined) out['eyebrow']      ??= masthead['eyebrow'];
    if (masthead['aiHeadline']   !== undefined) out['aiHeadline']   ??= masthead['aiHeadline'];
    if (masthead['statusTags']   !== undefined) out['statusTags']   ??= masthead['statusTags'];
    if (masthead['primaryAction']!== undefined) out['primaryAction']??= masthead['primaryAction'];

    // 5. Always last — never let a template-supplied prop override
    //    these contract metadata fields.
    out['archetype'] = b.archetype;
    out['route']     = b.route;
    return out;
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
