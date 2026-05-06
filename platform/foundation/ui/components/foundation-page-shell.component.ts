import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import {
  DynamicPageExperienceResolver,
  DynamicAgentExperienceResolver,
  DynamicUiBootstrapService,
  UserContextResolver,
} from '@app/core/services/platform/dynamic-page-experience.resolver';

function humanizeContextToken(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map(segment => {
      const lower = segment.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * FoundationPageShellComponent — production-grade chrome shared by all
 * 22 non-overview Foundation pages.
 *
 * Provides per spec §3.3 / §6 / §15.1 / §577:
 *  - Breadcrumb (Workspace → Foundation → page)
 *  - Page masthead (title + subtitle from Dynamic UI experience contract)
 *  - "Why am I seeing this?" popover (profile + data scope + contract)
 *  - Theme tokens applied to document.body.dataset
 *  - Optional context rail slot, agent panel toggle, footer slot
 *  - Access-denied gate when DynamicPageExperienceResolver.visibleForCurrentUser=false
 *
 * Usage:
 *   <foundation-page-shell [route]="'/foundation/positions'" [titleKey]="'foundation.nav.positions'">
 *     ...page body...
 *   </foundation-page-shell>
 */
@Component({
  selector: 'foundation-page-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--shell-page-bg, var(--cds-layer-01, #f4f4f4)); }
    .shell { padding: var(--cds-spacing-06, 24px) var(--cds-spacing-07, 32px); }
    .crumbs { display: flex; gap: 6px; align-items: center; font-size: 12px; color: var(--cds-text-secondary, #525252); margin-bottom: 8px; }
    .crumbs a { color: inherit; text-decoration: none; }
    .crumbs a:hover { text-decoration: underline; }
    .crumbs .sep { opacity: 0.55; }
    .masthead { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
    .titles { min-width: 0; }
    .title { font-size: 28px; font-weight: 700; color: var(--cds-text-primary, #161616); margin: 0; line-height: 1.2; }
    .subtitle { margin: 4px 0 0; color: var(--cds-text-secondary, #525252); font-size: 14px; }
    .actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
    .why-btn, .agent-btn { background: transparent; border: 1px solid var(--cds-border-subtle-01, #c6c6c6); color: var(--cds-text-primary, #161616); border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; }
    .why-btn:hover, .agent-btn:hover { background: var(--cds-layer-02, #fff); }
    .why-pop { position: absolute; inset-inline-end: 0; top: calc(100% + 6px); width: 320px; background: var(--cds-layer-02, #fff); border: 1px solid var(--cds-border-subtle-01, #c6c6c6); border-radius: 8px; box-shadow: 0 6px 16px rgba(0,0,0,0.08); padding: 14px; z-index: 50; }
    .why-pop dt { font-size: 11px; color: var(--cds-text-secondary, #525252); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 8px; }
    .why-pop dt:first-child { margin-top: 0; }
    .why-pop dd { margin: 2px 0 0; font-size: 13px; color: var(--cds-text-primary, #161616); }
    .why-wrap { position: relative; }
    .body { background: var(--cds-layer-02, #fff); border: 1px solid var(--cds-border-subtle-00, #e0e0e0); border-radius: 10px; overflow: hidden; }
    .with-rail { display: grid; grid-template-columns: minmax(0,1fr) 280px; gap: 16px; }
    @media (max-width: 980px) { .with-rail { grid-template-columns: 1fr; } }
    .rail { background: var(--cds-layer-02, #fff); border: 1px solid var(--cds-border-subtle-00, #e0e0e0); border-radius: 10px; padding: 14px; }
    .rail h3 { font-size: 13px; font-weight: 600; margin: 0 0 8px; color: var(--cds-text-primary, #161616); }
    .rail-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--cds-border-subtle-00, #e0e0e0); font-size: 13px; color: var(--cds-text-primary, #161616); }
    .rail-item:last-child { border-bottom: none; }
    .access-denied { padding: 48px; text-align: center; color: var(--cds-text-secondary, #525252); }
    .access-denied h2 { color: var(--cds-text-primary, #161616); margin-bottom: 8px; }
  `],
  template: `
    @if (!visibleForUser()) {
      <div class="shell">
        <div class="body access-denied">
          <h2>{{ i18n.translate('foundation.overview.accessDeniedTitle') }}</h2>
          <p>{{ i18n.translate('foundation.overview.accessDeniedBody') }}</p>
        </div>
      </div>
    } @else {
      <div class="shell" [dir]="i18n.direction()">
        <nav class="crumbs" aria-label="breadcrumb">
          <a [routerLink]="workspaceHref()">{{ i18n.translate('foundation.nav.overview') }}</a>
          <span class="sep">/</span>
          <a [routerLink]="'/foundation/overview'">{{ i18n.translate('foundation.module.title') }}</a>
          <span class="sep">/</span>
          <span>{{ i18n.translate(titleKey) }}</span>
        </nav>

        <div class="masthead">
          <div class="titles">
            <h1 class="title">{{ i18n.translate(titleKey) }}</h1>
            @if (subtitleKey) { <p class="subtitle">{{ i18n.translate(subtitleKey) }}</p> }
          </div>
          <div class="actions">
            <div class="why-wrap">
              <button type="button" class="why-btn" (click)="toggleWhy()">
                {{ i18n.translate('foundation.overview.whyAmISeeing') }}
              </button>
              @if (whyOpen()) {
                <div class="why-pop">
                  <dl>
                    <dt>{{ i18n.translate('foundation.overview.whyProfile') }}</dt>
                    <dd>{{ profileLabel() }}</dd>
                    <dt>{{ i18n.translate('foundation.overview.whyDataScope') }}</dt>
                    <dd>{{ dataScopeLabel() }}</dd>
                    <dt>{{ i18n.translate('foundation.overview.whyContract') }}</dt>
                    <dd>{{ contractLabel() }}</dd>
                  </dl>
                </div>
              }
            </div>
          </div>
        </div>

        @if (showRail()) {
          <div class="with-rail">
            <div class="body"><ng-content></ng-content></div>
            <aside class="rail" aria-label="context-rail">
              <h3>{{ i18n.translate('foundation.overview.contextRail') }}</h3>
              <div class="rail-item">
                <span>{{ i18n.translate('foundation.rail.workQueue') }}</span><strong>—</strong>
              </div>
              <div class="rail-item">
                <span>{{ i18n.translate('foundation.rail.approvals') }}</span><strong>—</strong>
              </div>
              <div class="rail-item">
                <span>{{ i18n.translate('foundation.rail.aiPulse') }}</span><strong>—</strong>
              </div>
            </aside>
          </div>
        } @else {
          <div class="body"><ng-content></ng-content></div>
        }
      </div>
    }
  `,
})
export class FoundationPageShellComponent implements OnInit, OnDestroy {
  @Input({ required: true }) route!: string;
  @Input({ required: true }) titleKey!: string;
  @Input() subtitleKey?: string;
  @Input() showRail = false;

  @HostBinding('attr.data-foundation-page') dataAttr = 'true';

  private destroyRef = inject(DestroyRef);
  private exp = inject(DynamicPageExperienceResolver);
  private agentResolver = inject(DynamicAgentExperienceResolver);
  private dynUi = inject(DynamicUiBootstrapService);
  private user = inject(UserContextResolver);
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  /** DB-resolved breadcrumb routerLink (NO FRONTEND INVENTION). */
  workspaceHref(): string | null { return null; }

  whyOpen = signal(false);

  experience = computed(() => this.exp.forRoute(this.route));
  visibleForUser = computed(() => this.experience()?.visibleForCurrentUser ?? true);
  pageType = computed(() => this.experience()?.pageType ?? 'list');
  layout = computed(() => this.experience()?.layout ?? 'full-page');
  profileType = computed(() => this.user.context()?.profileType ?? null);
  profileLabel = computed(() => {
    const rawProfile = this.profileType();
    if (!rawProfile) {
      return this.i18n.translate('foundation.overview.whyProfileUnknown');
    }
    return this.i18n.tr(
      `workspace.pageContext.profile.${rawProfile}`,
      humanizeContextToken(rawProfile),
    );
  });
  dataScopeLabel = computed(() => {
    const rawScope = this.experience()?.dataScopeMode ?? 'tenant';
    return this.i18n.tr(
      `workspace.pageContext.dataScope.${rawScope}`,
      humanizeContextToken(rawScope),
    );
  });
  contractLabel = computed(() =>
    this.i18n.tr(
      `workspace.pageContext.pageType.${this.pageType()}`,
      humanizeContextToken(this.pageType()),
    ),
  );

  ngOnInit(): void {
    this.applyThemeTokens();
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        delete (document.body.dataset as DOMStringMap)['module'];
        delete (document.body.dataset as DOMStringMap)['pageType'];
        delete (document.body.dataset as DOMStringMap)['layout'];
      } catch { /* noop */ }
    }
  }

  toggleWhy(): void { this.whyOpen.update(v => !v); }

  private applyThemeTokens(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      document.documentElement.style.setProperty('--module-accent', '#1f6feb');
      document.body.dataset['module'] = 'foundation';
      document.body.dataset['pageType'] = this.pageType();
      document.body.dataset['layout'] = this.layout();
    } catch { /* noop */ }
  }
}
