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
  ComponentRef,
  ViewChild,
  ViewContainerRef,
  inject,
  signal,
  computed,
  Type,
  effect,
  EnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Router, NavigationEnd, ActivatedRoute, type ActivatedRouteSnapshot } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs/operators';
import { TemplateBindingService, type TemplateBinding } from './template-binding.service';
import { loadArchetypeTemplate } from './template-binding.registry';
import { RouteMetadataService } from './route-metadata.service';

import type { ModuleInsightPillars } from './templates/module-template.types';
import { AccessStore } from '@dos/access-store';
// Marketing-landing archetype — config + brand services injected here so
// DosMarketingHomePageComponent receives homeContent/nav/footer/agentStrip
// inputs via tplInputs() without needing a bespoke wrapper component.
import { BrandResolverService, DosEmptyStateComponent, MarketingPublicConfigService } from '@dos/ui-system';

@Component({
  selector: 'dos-dynamic-template-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DosEmptyStateComponent],
  template: `
    @if (deniedPermission(); as deniedPermission) {
      <dos-empty-state
        data-testid="dos-tpl-denied"
        title="Access denied"
        description="You do not have the required permission to open this page."
        icon="lock"
        tone="warning"
      ></dos-empty-state>
      <p class="dos-tpl-fallback__msg">
        Required permission: <code>{{ deniedPermission }}</code>
      </p>
    } @else if (loading() && !template()) {
      <div class="dos-tpl-loading" data-testid="dos-tpl-loading">Loading…</div>
    } @else if (shellOnly()) {
      <!--
        shell-only route — workspace runtime envelope is the sole
        content authority for this URL. The component intentionally
        renders nothing so the host's <router-outlet /> mount stays
        empty (no masthead, no empty-state placeholder, no demo).
      -->
    } @else if (!template() && !loading()) {
      <div class="dos-tpl-fallback" data-testid="dos-tpl-fallback">
        <dos-empty-state
          title=""
          description=""
          icon="information"
          tone="info"
        ></dos-empty-state>
      </div>
    }
    <ng-container #tplHost></ng-container>
  `,
  styles: [`
    :host { display: block; }
    .dos-tpl-loading { padding: 2rem; color: var(--cds-text-secondary); }
    .dos-tpl-fallback { padding: 1rem 0; }
    .dos-tpl-fallback__msg {
      margin: 1rem; font-size: 0.875rem; color: var(--cds-text-secondary);
    }
  `],
})
export class DynamicTemplatePageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly access = inject(AccessStore);
  private readonly bindings = inject(TemplateBindingService);
  private readonly routeMetadata = inject(RouteMetadataService);
  private readonly envInjector = inject(EnvironmentInjector);
  // Marketing-landing archetype hydration — injected lazily-safe; Angular
  // will create these as singletons via the DI tree without pulling
  // marketing code into non-marketing route bundles.
  private readonly marketingCfg = inject(MarketingPublicConfigService);
  private readonly brandResolver = inject(BrandResolverService);

  readonly currentRoute = signal<string>(this.normalize(this.router.url));
  readonly binding = signal<TemplateBinding | null>(null);
  readonly template = signal<Type<unknown> | null>(null);
  readonly deniedPermission = signal<string | null>(null);
  readonly loading = signal<boolean>(true);
  readonly shellOnly = signal<boolean>(false);

  @ViewChild('tplHost', { read: ViewContainerRef, static: true })
  private tplHost!: ViewContainerRef;
  private currentRef: ComponentRef<unknown> | null = null;
  private readonly outputSubs: Subscription[] = [];

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

    // COMPLIANCE: No auto-fill arrays. Templates receive only what the
    // DB resolver provides. Empty state is the template's responsibility.

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

    // 5. Marketing-landing archetype — inject live config signals so that
    //    DosMarketingHomePageComponent receives all required @Input() fields.
    //    homeContent carries hero/trustPills/valueProps/agenticProof/platform
    //    sections; nav/footer/flags come from the same config signal bundle.
    if (b.archetype === 'marketing-landing') {
      const cfg = this.marketingCfg;
      const locale = this.currentLocale();
      out['brandCode']        = 'shahin-ai';
      out['locale']           = locale;
      out['homeContent']      = p['homeContent'] ?? cfg.marketingHomeContent();
      out['navItems']         = p['navItems'] ?? cfg.marketingNavItems();
      out['navGroups']        = p['navGroups'] ?? cfg.marketingNavGroups();
      out['footerGroups']     = p['footerGroups'] ?? cfg.marketingFooterGroups();
      out['agentStripState']  = p['agentStripState'] ?? 'ready';
      out['agentStripSummary'] = p['agentStripSummary'] ?? null;
      out['downloadAssets']   = p['downloadAssets'] ?? [];
    }

    // 6. Always last — never let a template-supplied prop override
    //    these contract metadata fields.
    out['archetype'] = b.archetype;
    out['route']     = b.route;
    return out;
  });

  // COMPLIANCE: No fallback pillars. Pillar content must flow from
  // dos.ui_route_template_binding props.pillars — never hardcoded.

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
      this.deniedPermission.set(null);
      this.shellOnly.set(false);
      this.disposeMounted();
      runInInjectionContext(this.envInjector, () => {
        // Shell-only gate — for routes flagged
        // dos.dynamic_ui_route_metadata.render_mode='shell-only', the
        // workspace runtime envelope (loaded by ShellHostComponent) is
        // the sole content source. Skip the template-binding HTTP call
        // entirely so no demo/empty-state placeholder ever renders.
        this.routeMetadata.resolve(route).subscribe((meta) => {
          if (this.currentRoute() !== route) return;
          // Redirect render-mode — typed DB-stored navigation contract.
          // FE NEVER calls /api/ui-os/template-binding for these routes.
          if (meta?.renderMode === 'redirect') {
            const target = this.resolveRedirectTarget(meta);
            if (target && target !== route) {
              // eslint-disable-next-line no-console
              console.info('[dynamic-template] REDIRECT', { route, target });
              this.shellOnly.set(true);
              this.loading.set(false);
              this.router.navigateByUrl(target);
              return;
            }
            // No DB-declared target → render nothing (fail-closed).
            // eslint-disable-next-line no-console
            console.warn('[dynamic-template] REDIRECT_MISSING_TARGET', route);
            this.shellOnly.set(true);
            this.loading.set(false);
            return;
          }
          if (meta?.renderMode === 'shell-only' || meta?.templateBindingRequired === false) {
            // eslint-disable-next-line no-console
            console.info('[dynamic-template] SHELL_ONLY_ROUTE', route);
            this.shellOnly.set(true);
            this.loading.set(false);
            return;
          }
          this.resolveTemplateBinding(route);
        });
      });
    });
  }

  private resolveTemplateBinding(route: string): void {
    runInInjectionContext(this.envInjector, () => {
      this.bindings.resolve(route).subscribe(async (b) => {
          this.binding.set(b);
          const requiredPermission = this.resolveRequiredPermission(b);
          if (requiredPermission && !this.access.hasPermission(requiredPermission)) {
            this.deniedPermission.set(requiredPermission);
            this.loading.set(false);
            return;
          }
          if (!b?.template_export) {
            this.loading.set(false);
            return;
          }
          // Marketing-landing: eagerly hydrate config + brand so tplInputs()
          // signals are populated before the component is created.
          if (b.archetype === 'marketing-landing') {
            const locale = this.currentLocale();
            this.marketingCfg.init('shahin-ai', locale).catch(
              (e) => console.warn('[dynamic-template] marketing cfg init failed', e),
            );
            this.brandResolver.init('shahin-ai').catch(
              (e) => console.warn('[dynamic-template] brand init failed', e),
            );
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
            this.mountTemplate(cmp);
          } finally {
            this.loading.set(false);
          }
        });
    });
  }

  /**
   * Imperatively mount the resolved template component, apply props as
   * inputs, and wire every EventEmitter @Output to the DB-driven event
   * handler dispatcher (props.eventHandlers).
   */
  private mountTemplate(cmp: Type<unknown>): void {
    if (!this.tplHost) return;
    this.disposeMounted();
    const ref = this.tplHost.createComponent(cmp, { injector: this.envInjector });
    this.currentRef = ref;
    const inputs = this.tplInputs();
    for (const [k, v] of Object.entries(inputs)) {
      try {
        ref.setInput(k, v);
      } catch {
        // Unknown @Input — silently ignore per Phase F-F3 contract.
      }
    }
    // Wire any EventEmitter-shaped output to the dispatcher.
    const inst = ref.instance as Record<string, unknown>;
    for (const key of Object.keys(inst)) {
      const out = inst[key] as { subscribe?: (fn: (v: unknown) => void) => Subscription; emit?: unknown } | undefined;
      if (out && typeof out.subscribe === 'function' && typeof out.emit === 'function') {
        const sub = out.subscribe((evt) => this.dispatchEvent(evt));
        this.outputSubs.push(sub);
      }
    }
  }

  private disposeMounted(): void {
    while (this.outputSubs.length) {
      const s = this.outputSubs.pop();
      try { s?.unsubscribe(); } catch { /* noop */ }
    }
    if (this.currentRef) {
      try { this.currentRef.destroy(); } catch { /* noop */ }
      this.currentRef = null;
    }
    if (this.tplHost) {
      this.tplHost.clear();
    }
  }

  /**
   * Dispatch a template-emitted event through the DB-driven
   * `props.eventHandlers` table. The shape on the binding is:
   *   { eventHandlers: { "<event.key>": { method, url, ... } } }
   *
   * Supported handler methods:
   *   - "redirect" → full-page navigation to handler.url
   *   - "fetch"    → POST/GET handler.url with optional payload from
   *                  the event; on 2xx, optionally redirect to
   *                  handler.onSuccessRedirect; on non-2xx, optionally
   *                  redirect to handler.onErrorRedirect.
   *
   * Unknown keys / missing handlers are no-ops by design — auth pages
   * that emit purely presentational events (locale toggle, step change)
   * keep working without any FE-side coupling.
   */
  private dispatchEvent(evt: unknown): void {
    if (!evt || typeof evt !== 'object') return;
    const key = (evt as { key?: unknown }).key;
    if (typeof key !== 'string') return;
    const props = (this.binding()?.props ?? {}) as Record<string, unknown>;
    const handlers = props['eventHandlers'] as Record<string, unknown> | undefined;
    if (!handlers || typeof handlers !== 'object') return;
    const handler = handlers[key] as {
      method?: string;
      url?: string;
      http?: string;
      payloadFromEvent?: boolean;
      payload?: unknown;
      onSuccessRedirect?: string;
      onErrorRedirect?: string;
    } | undefined;
    if (!handler || typeof handler !== 'object') return;

    if (handler.method === 'redirect' && typeof handler.url === 'string' && handler.url) {
      if (typeof window !== 'undefined') {
        window.location.assign(handler.url);
      }
      return;
    }

    if (handler.method === 'fetch' && typeof handler.url === 'string' && handler.url) {
      const http = (handler.http || 'POST').toUpperCase();
      const body = handler.payloadFromEvent
        ? (evt as { payload?: unknown }).payload ?? null
        : handler.payload ?? null;
      const init: RequestInit = {
        method: http,
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
      };
      if (http !== 'GET' && http !== 'HEAD') {
        init.body = JSON.stringify(body ?? {});
      }
      if (typeof window === 'undefined' || typeof fetch !== 'function') return;
      void fetch(handler.url, init).then((resp) => {
        if (resp.ok && handler.onSuccessRedirect) {
          window.location.assign(handler.onSuccessRedirect);
        } else if (!resp.ok && handler.onErrorRedirect) {
          window.location.assign(handler.onErrorRedirect);
        }
      }).catch(() => {
        if (handler.onErrorRedirect) {
          window.location.assign(handler.onErrorRedirect);
        }
      });
    }
  }

  /**
   * Resolve the typed redirect target for a route flagged
   * `render_mode='redirect'`. Reads metadata.redirect from the
   * DB-stored row; selects between `anonymous` / `authenticated`
   * based on the live AccessStore session, falling back to
   * `default`. Returns null when the row carries no redirect
   * contract (the FE then renders nothing — fail-closed).
   */
  private resolveRedirectTarget(meta: { metadata?: { redirect?: { anonymous?: string; authenticated?: string; default?: string } } }): string | null {
    const r = meta?.metadata?.redirect;
    if (!r || typeof r !== 'object') return null;
    const snapshot = this.access.snapshot();
    const isAuthenticated = snapshot.loaded && snapshot.user !== null;
    const target = isAuthenticated
      ? (r.authenticated ?? r.default ?? null)
      : (r.anonymous ?? r.default ?? null);
    return typeof target === 'string' && target.length > 0 ? target : null;
  }

  private normalize(url: string): string {
    const q = url.indexOf('?');
    const u = q === -1 ? url : url.slice(0, q);
    return u.length > 1 && u.endsWith('/') ? u.slice(0, -1) : u;
  }

  private resolveRequiredPermission(binding: TemplateBinding | null): string | null {
    return this.routePermission(this.router.routerState.snapshot.root) ?? binding?.permission_key ?? null;
  }

  private routePermission(snapshot: ActivatedRouteSnapshot | null): string | null {
    if (!snapshot) return null;
    const childPermission = snapshot.firstChild ? this.routePermission(snapshot.firstChild) : null;
    if (childPermission) return childPermission;
    const value = snapshot.data?.['permission'];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private currentLocale(): 'en' | 'ar' {
    if (typeof window === 'undefined') return 'en';
    const queryLocale = new URLSearchParams(window.location.search).get('locale');
    const storedLocale = window.localStorage.getItem('locale');
    return queryLocale === 'ar' || storedLocale === 'ar' ? 'ar' : 'en';
  }
}
