import {
  ChangeDetectionStrategy, Component, OnInit, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconModule } from 'carbon-components-angular';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { filter } from 'rxjs';
import { WhyAmISeeingThisResolver } from '../../services/platform/why-am-i-seeing-this.resolver';
import { DynamicPageExperienceResolver } from '../../services/platform/dynamic-page-experience.resolver';
import { DynamicWidgetResolver } from '../../services/platform/dynamic-widget.resolver';
import { DynamicAgentExperienceResolver } from '../../services/platform/dynamic-agent-experience.resolver';
import { UserContextResolver } from '../../services/platform/user-context.resolver';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import {
  formatSignatureWidgetLabel,
  humanizeContextToken,
  routeModuleCode,
  stripModulePrefix,
} from './page-context-labels';

@Component({
  selector: 'app-dynamic-page-context-bar',
  standalone: true,
  imports: [CommonModule, IconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="pcb">
        <div class="pcb-left">
          @if (displaySignatureWidget()) {
            <span class="pcb-chip pcb-chip--signature" [attr.title]="i18n.translate('workspace.pageContext.signatureWidgetTitle')">
              <svg cdsIcon="star--filled" size="14"></svg> {{ displaySignatureWidget() }}
            </span>
          }
          <span class="pcb-chip" [attr.title]="i18n.translate('workspace.pageContext.pageTypeTitle')">{{ displayPageType() }}</span>
          @if (displayIntent()) {
            <span class="pcb-chip pcb-chip--intent">{{ displayIntent() }}</span>
          }
          @if (evidenceRequired()) {
            <span class="pcb-chip pcb-chip--evidence" [attr.title]="i18n.translate('workspace.pageContext.evidenceRequired')">
              <svg cdsIcon="security" size="14"></svg> {{ i18n.translate('workspace.pageContext.evidenceRequired') }}
            </span>
          }
          @for (a of displayAgentActions(); track a.action_id) {
            <button class="pcb-agent" type="button" [attr.data-risk]="a.risk_level"
                    [attr.aria-label]="a.label"
                    [attr.title]="a.title">
              <svg cdsIcon="lightning" size="14"></svg> {{ a.label }}
            </button>
          }
        </div>
        <div class="pcb-right">
          <button class="pcb-why" type="button" (click)="toggle()" aria-expanded="{{ expanded() }}">
            <svg cdsIcon="information" size="14"></svg>
            {{ expanded() ? i18n.translate('workspace.hide') : i18n.translate('workspace.whyAmISeeingThis') }}
          </button>
        </div>
      </div>
      @if (expanded()) {
        <div class="pcb-why-panel" role="region" [attr.aria-label]="i18n.translate('workspace.whyAmISeeingThis')">
          @if (why(); as w) {
            <div class="pcb-why-head">
              <span [class]="w.visible ? 'pcb-dot pcb-dot--ok' : 'pcb-dot pcb-dot--no'"></span>
              <strong>{{ w.visible ? i18n.translate('workspace.pageContext.visibleToYou') : i18n.translate('workspace.pageContext.hiddenRestricted') }}</strong>
              <span class="pcb-why-route">{{ w.route }}</span>
            </div>
            <ul class="pcb-why-list">
              @for (r of w.reasons; track r) { <li>{{ r }}</li> }
            </ul>
          }
        </div>
      }
    }
  `,
  styles: [`
    .pcb {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--cds-spacing-03); padding: var(--cds-spacing-02) var(--cds-spacing-06); flex-wrap: wrap;
      background: var(--cds-layer-01);
      border-bottom: 1px solid var(--shell-card-border);
      font-size: var(--cds-body-compact-01-size);
    }
    .pcb-left { display: flex; gap: var(--cds-spacing-02); flex-wrap: wrap; align-items: center; }
    .pcb-right { display: flex; gap: var(--cds-spacing-02); align-items: center; }
    .pcb-chip {
      display: inline-flex; align-items: center; gap: var(--cds-spacing-02);
      padding: var(--cds-spacing-01) var(--cds-spacing-03); border-radius: var(--radius-pill);
      background: var(--shell-card-bg);
      border: 1px solid var(--shell-card-border);
      color: var(--shell-text-secondary); font-weight: 500;
    }
    .pcb-chip--signature { color: var(--cds-support-warning); border-color: var(--shell-card-border); background: var(--shell-status-warning-bg); }
    .pcb-chip--intent { color: var(--cds-link-primary); border-color: var(--shell-card-border); background: var(--shell-status-info-bg); }
    .pcb-chip--evidence { color: var(--cds-support-error); border-color: var(--shell-card-border); background: var(--shell-status-danger-bg); }
    .pcb-agent {
      display: inline-flex; align-items: center; gap: var(--cds-spacing-02);
      padding: var(--cds-spacing-01) var(--cds-spacing-03); border-radius: var(--radius-sm); cursor: pointer;
      background: var(--shell-status-info-bg); color: var(--cds-support-info); border: 1px solid var(--shell-card-border);
      font-weight: 600; font-size: var(--font-size-xs);
    }
    .pcb-agent[data-risk="high"], .pcb-agent[data-risk="critical"] {
      background: var(--shell-status-danger-bg); color: var(--cds-support-error); border-color: var(--shell-card-border);
    }
    .pcb-why {
      background: transparent; border: 0; cursor: pointer; padding: var(--cds-spacing-02) var(--cds-spacing-03);
      border-radius: var(--radius-sm); color: var(--cds-link-primary);
      font-weight: 600; font-size: var(--cds-body-compact-01-size);
    }
    .pcb-why:hover { background: var(--cds-layer-01); }
    .pcb-why-panel {
      padding: var(--cds-spacing-03) var(--cds-spacing-06) var(--cds-spacing-04); background: var(--cds-layer-01);
      border-bottom: 1px solid var(--shell-card-border);
      font-size: var(--cds-body-compact-01-size); color: var(--shell-text-primary);
    }
    .pcb-why-head { display: flex; align-items: center; gap: var(--cds-spacing-03); margin-bottom: var(--cds-spacing-02); }
    .pcb-why-route { font-family: monospace; color: var(--shell-text-secondary); }
    .pcb-why-list { margin: 0; padding-inline-start: calc(var(--cds-spacing-05) + var(--cds-spacing-02)); }
    .pcb-dot { display: inline-block; width: var(--cds-spacing-03); height: var(--cds-spacing-03); border-radius: 50%; }
    .pcb-dot--ok { background: var(--cds-support-success); }
    .pcb-dot--no { background: var(--cds-support-error); }
  `],
})
export class DynamicPageContextBarComponent implements OnInit {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private exp = inject(DynamicPageExperienceResolver);
  private widgets = inject(DynamicWidgetResolver);
  private agents = inject(DynamicAgentExperienceResolver);
  private why_ = inject(WhyAmISeeingThisResolver);
  private user = inject(UserContextResolver);
  i18n = inject(I18nService);

  readonly currentRoute = signal<string>('');
  readonly expanded = signal(false);

  readonly experience = computed(() => this.exp.forRoute(this.currentRoute()));
  readonly visible = computed(() => !!this.experience());
  readonly moduleCode = computed(() => routeModuleCode(this.currentRoute()));
  readonly pageType = computed(() => this.experience()?.pageType ?? 'list');
  readonly intent = computed(() => this.experience()?.userIntent ?? null);
  readonly evidenceRequired = computed(() => !!this.experience()?.evidenceRequired);
  readonly signatureWidget = computed(() => this.experience()?.signatureWidget ?? null);
  readonly agentActions = computed(() => this.agents.forRoute(this.currentRoute())?.actions ?? []);
  readonly why = computed(() => this.why_.explain(this.currentRoute()));
  readonly displaySignatureWidget = computed(() =>
    formatSignatureWidgetLabel(this.signatureWidget(), this.moduleCode()),
  );
  readonly displayPageType = computed(() =>
    this.i18n.tr(
      `workspace.pageContext.pageType.${this.pageType()}`,
      humanizeContextToken(this.pageType()),
    ),
  );
  readonly displayIntent = computed(() => {
    const rawIntent = this.intent();
    if (!rawIntent) return null;
    return this.i18n.tr(
      `workspace.pageContext.intent.${rawIntent}`,
      humanizeContextToken(rawIntent),
    );
  });
  readonly displayAgentActions = computed(() => this.agentActions().map(action => ({
    ...action,
    label: this.i18n.tr(
      action.label_key,
      humanizeContextToken(stripModulePrefix(action.action_id, this.moduleCode())),
    ),
    title: `${humanizeContextToken(action.agent_id)} · ${humanizeContextToken(action.level)}`,
  })));

  ngOnInit(): void {
    this.currentRoute.set(this.router.url.split('?')[0]);
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(e => {
      this.currentRoute.set(e.urlAfterRedirects.split('?')[0]);
      this.expanded.set(false);
    });
    // Touch widgets resolver to keep DI graph live (no-op signal read).
    void this.widgets.widgetsByRoute;
    void this.user.context;
  }

  toggle(): void { this.expanded.update(v => !v); }
}
