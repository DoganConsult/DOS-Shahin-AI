import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Type,
  ViewChild,
  ViewContainerRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { auditTime } from 'rxjs/operators';
import { DynamicWidgetResolver, type ResolvedWidgetSlot } from '../services/dynamic-widget.resolver';
import { resolveWidgetComponent } from '../registry/widget-key-map';
import { notifyRenderMiss } from '../telemetry/render-miss.sink';
import { WebSocketService, type WSEvent } from '@app/websocket';

type ZoneId = ResolvedWidgetSlot['zone'];

const ZONE_ORDER: ZoneId[] = ['header', 'signature', 'main', 'side', 'footer', 'context-rail'];

/**
 * DynamicPageHostComponent — generic page host that resolves the route's
 * widget contract from `dos.dynamic_ui_widgets` (via DynamicWidgetResolver)
 * and instantiates each widget's component into the matching zone slot.
 *
 * Used by routes that have moved to the spec §7 dynamic-UI pipeline: route
 * config points at this host with `data.contractRoute` (or relies on the
 * router URL) and the widget is picked from the DB. To swap a page's
 * contents per tenant, change the seed row — no code change required.
 *
 * Spec-compliance notes:
 *  - Widgets are filtered by permission/profile at the resolver layer.
 *  - Each zone is an independent ViewContainerRef. If no widget resolves
 *    for a route, the host renders an explicit empty-state so the failure
 *    is visible (not silently a blank page).
 */
@Component({
  selector: 'app-dynamic-page-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }
    .dph-empty {
      padding: 32px;
      text-align: center;
      color: var(--text-color-secondary, #6b7280);
      font-size: var(--font-size-sm, 0.875rem);
    }
    .dph-empty code { background: var(--surface-section, #f4f4f4); padding: 2px 6px; border-radius: 4px; }
  `],
  template: `
    <div class="dph-zone dph-zone--header"><ng-container #headerSlot /></div>
    <div class="dph-zone dph-zone--signature"><ng-container #signatureSlot /></div>
    <div class="dph-zone dph-zone--main"><ng-container #mainSlot /></div>
    <div class="dph-zone dph-zone--side"><ng-container #sideSlot /></div>
    <div class="dph-zone dph-zone--footer"><ng-container #footerSlot /></div>
    <div class="dph-zone dph-zone--context-rail"><ng-container #contextRailSlot /></div>
    @if (empty()) {
      <div class="dph-empty">
        No widget configured for <code>{{ resolvedRoute() || '(unknown route)' }}</code>.
        Check <code>dos.dynamic_ui_widgets</code> seeds for this route.
      </div>
    }
  `,
})
export class DynamicPageHostComponent implements AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly resolver = inject(DynamicWidgetResolver);
  private readonly ws = inject(WebSocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly resolvedRoute = signal<string>('');
  readonly empty = signal(false);

  @ViewChild('headerSlot', { read: ViewContainerRef, static: true }) headerSlot!: ViewContainerRef;
  @ViewChild('signatureSlot', { read: ViewContainerRef, static: true }) signatureSlot!: ViewContainerRef;
  @ViewChild('mainSlot', { read: ViewContainerRef, static: true }) mainSlot!: ViewContainerRef;
  @ViewChild('sideSlot', { read: ViewContainerRef, static: true }) sideSlot!: ViewContainerRef;
  @ViewChild('footerSlot', { read: ViewContainerRef, static: true }) footerSlot!: ViewContainerRef;
  @ViewChild('contextRailSlot', { read: ViewContainerRef, static: true }) contextRailSlot!: ViewContainerRef;

  ngAfterViewInit(): void {
    void this.render();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => { void this.render(); });
    this.ws.dataUpdates$
      .pipe(auditTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe((event: WSEvent) => {
        const d = (event?.data ?? {}) as Record<string, unknown>;
        const eventType = (d['eventType'] as string | undefined) ?? event.type;
        if (eventType !== 'ui.dynamic_ui.changed' && eventType !== 'ui.widget.invalidate' && eventType !== 'ui.route.invalidate') return;
        const route = typeof d['route'] === 'string'
          ? (d['route'] as string)
          : (typeof d['contractRoute'] === 'string' ? (d['contractRoute'] as string) : null);
        if (!route || route === this.resolvedRoute()) void this.render();
      });
  }

  private vcrFor(zone: ZoneId): ViewContainerRef {
    switch (zone) {
      case 'header': return this.headerSlot;
      case 'signature': return this.signatureSlot;
      case 'side': return this.sideSlot;
      case 'footer': return this.footerSlot;
      case 'context-rail': return this.contextRailSlot;
      case 'main':
      default: return this.mainSlot;
    }
  }

  private clearAll(): void {
    for (const z of ZONE_ORDER) this.vcrFor(z).clear();
  }

  private resolveRoutePath(): string {
    const fromData = this.route.snapshot.data?.['contractRoute'] as string | undefined;
    if (fromData) return fromData;
    const url = this.router.url.split('?')[0].split('#')[0];
    return url || '/';
  }

  private async render(): Promise<void> {
    const routePath = this.resolveRoutePath();
    this.resolvedRoute.set(routePath);
    this.clearAll();

    const slots = this.resolver.forRoute(routePath);
    if (!slots || slots.length === 0) {
      notifyRenderMiss({ topic: 'ui.render.miss', reason: 'empty_route', route: routePath, widget_key: null });
      this.empty.set(true);
      return;
    }

    const sorted = [...slots].sort((a, b) => ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone) || a.order - b.order);
    let rendered = 0;
    for (const slot of sorted) {
      const loader = resolveWidgetComponent(slot.widgetKey);
      if (!loader) {
        notifyRenderMiss({
          topic: 'ui.render.miss', reason: 'missing_loader',
          route: routePath, widget_key: slot.widgetKey, zone: slot.zone,
        });
        continue;
      }
      try {
        const ComponentType = (await loader()) as Type<unknown>;
        const ref = this.vcrFor(slot.zone).createComponent(ComponentType);
        const instance = ref.instance as Record<string, unknown>;
        if (slot.config && 'config' in instance) (instance as { config: unknown }).config = slot.config;
        if ('widgetKey' in instance) (instance as { widgetKey: string }).widgetKey = slot.widgetKey;
        rendered++;
      } catch (err) {
        notifyRenderMiss({
          topic: 'ui.render.miss', reason: 'render_error',
          route: routePath, widget_key: slot.widgetKey, zone: slot.zone,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    this.empty.set(rendered === 0);
  }
}
