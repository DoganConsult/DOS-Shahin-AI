import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  TemplateRef, ContentChild, OnChanges, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconModule } from 'carbon-components-angular';
import type {
  ResolvedShellConfig,
  ShellSlotConfig,
  ShellSlotId,
} from '../../../shared/contracts/shell-engine.contracts';

@Component({
  selector: 'app-shell-renderer',
  standalone: true,
  imports: [CommonModule, IconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sr"
         [class]="'sr--' + config.layoutType"
         [attr.dir]="config.dir"
         [attr.data-module]="config.moduleCode"
         [attr.data-accent]="config.masthead.accentToken">

      <!-- L2: Masthead -->
      <header class="sr-masthead" *ngIf="isSlotVisible('masthead')">
        <div class="sr-masthead__breadcrumbs">
          <span *ngFor="let crumb of config.masthead.breadcrumbs; let last = last" class="sr-crumb">
            <a *ngIf="crumb.route && !last" [attr.href]="crumb.route" class="sr-crumb__link">
              {{ config.lang === 'ar' ? crumb.label.ar : crumb.label.en }}
            </a>
            <span *ngIf="!crumb.route || last" class="sr-crumb__text" [class.sr-crumb__text--active]="last">
              {{ config.lang === 'ar' ? crumb.label.ar : crumb.label.en }}
            </span>
            <span *ngIf="!last" class="sr-crumb__sep">/</span>
          </span>
        </div>
        <div class="sr-masthead__identity">
          <svg [attr.cdsIcon]="config.masthead.moduleIcon" size="24" class="sr-masthead__icon"></svg>
          <div class="sr-masthead__text">
            <h1 class="sr-masthead__title">{{ config.lang === 'ar' ? config.masthead.moduleName.ar : config.masthead.moduleName.en }}</h1>
            <p class="sr-masthead__purpose">{{ config.lang === 'ar' ? config.masthead.purposeLine.ar : config.masthead.purposeLine.en }}</p>
          </div>
          <span class="sr-masthead__health" [attr.data-level]="config.masthead.healthLevel">
            {{ config.masthead.healthLevel }}
          </span>
          <span class="sr-masthead__tier" [attr.data-tier]="config.meta.tier" title="Workflow Operability Tier">
            <svg cdsIcon="lightning" size="12" *ngIf="config.meta.tier === 'full'"></svg>
            {{ config.meta.tier === 'full' ? 'L3 AI Workflow' : (config.meta.tier === 'domain' ? 'L2 Domain Workflow' : 'L1 Platform Only') }}
          </span>
          <span *ngIf="config.masthead.dataFreshness" class="sr-masthead__freshness">
            {{ config.masthead.dataFreshness }}
          </span>
          <span *ngFor="let tag of config.masthead.contextTags" class="sr-masthead__tag" [style.background]="tag.color">
            {{ tag.label }}
          </span>
          <button *ngIf="config.masthead.primaryAiAction"
                  class="sr-masthead__ai-btn"
                  (click)="aiAction.emit(config.masthead.primaryAiAction!.id)">
            <svg [attr.cdsIcon]="config.masthead.primaryAiAction!.icon" size="16"></svg>
            {{ config.lang === 'ar' ? config.masthead.primaryAiAction!.label.ar : config.masthead.primaryAiAction!.label.en }}
          </button>
        </div>
        <ng-container *ngIf="mastheadExtra" [ngTemplateOutlet]="mastheadExtra"></ng-container>
      </header>

      <!-- L3: KPI Strip -->
      <section class="sr-kpi-strip" *ngIf="isSlotVisible('kpi-strip') && config.kpiStrip.cards.length > 0">
        <div *ngFor="let card of visibleKpis" class="sr-kpi-card" [style.borderColor]="card.color"
             (click)="kpiClick.emit(card.id)">
          <svg [attr.cdsIcon]="card.icon" size="20" [style.fill]="card.color"></svg>
          <span class="sr-kpi-card__label">{{ config.lang === 'ar' ? card.label.ar : card.label.en }}</span>
          <ng-container *ngIf="kpiValues" [ngTemplateOutlet]="kpiValues" [ngTemplateOutletContext]="{ $implicit: card }"></ng-container>
        </div>
      </section>

      <!-- L4: Action Bar -->
      <nav class="sr-action-bar" *ngIf="isSlotVisible('action-bar')">
        <ng-container *ngFor="let slot of visibleActions">
          <button class="sr-action-bar__btn"
                  [class.sr-action-bar__btn--primary]="slot.position === 'primary-create'"
                  [class.sr-action-bar__btn--ai]="slot.position === 'ai-assist'"
                  [disabled]="slot.disabled"
                  (click)="actionClick.emit(slot.actionId)">
            <svg [attr.cdsIcon]="slot.icon" size="16"></svg>
            <span class="sr-action-bar__label">{{ config.lang === 'ar' ? slot.label.ar : slot.label.en }}</span>
          </button>
        </ng-container>
        <div class="sr-action-bar__spacer"></div>
        <div class="sr-action-bar__search" *ngIf="config.actionBar.showSearch">
          <svg cdsIcon="search" size="16"></svg>
          <input type="text" [placeholder]="config.lang === 'ar' ? 'بحث...' : 'Search...'"
                 (input)="searchChange.emit($any($event.target).value)" />
        </div>
        <div class="sr-action-bar__views" *ngIf="config.actionBar.viewModes.length > 1">
          <button *ngFor="let vm of config.actionBar.viewModes"
                  class="sr-action-bar__view-btn"
                  [class.sr-action-bar__view-btn--active]="vm === config.actionBar.activeView"
                  (click)="viewChange.emit(vm)">
            {{ vm }}
          </button>
        </div>
        <ng-container *ngIf="actionBarExtra" [ngTemplateOutlet]="actionBarExtra"></ng-container>
      </nav>

      <!-- L7: Workflow Ribbon -->
      <section class="sr-workflow-ribbon" *ngIf="isSlotVisible('workflow-ribbon') && config.workflow.enabled">
        <ng-container *ngIf="workflowRibbon" [ngTemplateOutlet]="workflowRibbon"
                      [ngTemplateOutletContext]="{ $implicit: config.workflow }"></ng-container>
        <div *ngIf="!workflowRibbon && config.workflow.currentState" class="sr-workflow-ribbon__default">
          <span class="sr-workflow-ribbon__state">{{ config.workflow.currentState }}</span>
          <span *ngIf="config.workflow.owner" class="sr-workflow-ribbon__owner">{{ config.workflow.owner }}</span>
          <span *ngIf="config.workflow.slaDueDate" class="sr-workflow-ribbon__sla">SLA: {{ config.workflow.slaDueDate }}</span>
          <button *ngFor="let t of config.workflow.transitions"
                  class="sr-workflow-ribbon__transition"
                  (click)="workflowTransition.emit(t)">{{ t }}</button>
        </div>
      </section>

      <!-- L5: Primary Work Area (layout-driven body) -->
      <div class="sr-body" [class]="'sr-body--' + config.layoutType"
           *ngIf="!config.statePreset; else stateBlock">

        <!-- Left panel (list-detail filter, studio tree) -->
        <aside class="sr-panel sr-panel--left" *ngIf="leftPanelVisible">
          <ng-container *ngIf="leftPanel" [ngTemplateOutlet]="leftPanel"></ng-container>
        </aside>

        <!-- Tab bar -->
        <nav class="sr-tabs" *ngIf="config.tabs.length > 1">
          <button *ngFor="let tab of visibleTabs"
                  class="sr-tabs__tab"
                  [class.sr-tabs__tab--active]="tab.default"
                  (click)="tabChange.emit(tab.id)">
            <svg *ngIf="tab.icon" [attr.cdsIcon]="tab.icon" size="16"></svg>
            {{ config.lang === 'ar' ? tab.label.ar : tab.label.en }}
          </button>
        </nav>

        <!-- Main content area -->
        <main class="sr-main">
          <ng-content></ng-content>
        </main>

        <!-- L6: Right Context Rail -->
        <aside class="sr-panel sr-panel--right" *ngIf="isSlotVisible('context-rail')">
          <ng-container *ngIf="contextRail" [ngTemplateOutlet]="contextRail"></ng-container>
          <div *ngIf="!contextRail" class="sr-panel__placeholder">
            <ng-container *ngIf="aiSummary" [ngTemplateOutlet]="aiSummary"></ng-container>
            <ng-container *ngIf="activityFeed" [ngTemplateOutlet]="activityFeed"></ng-container>
            <ng-container *ngIf="relatedRecords" [ngTemplateOutlet]="relatedRecords"></ng-container>
            <ng-container *ngIf="auditTrail" [ngTemplateOutlet]="auditTrail"></ng-container>
            <ng-container *ngIf="notes" [ngTemplateOutlet]="notes"></ng-container>
          </div>
        </aside>
      </div>

      <!-- L8: State System -->
      <ng-template #stateBlock>
        <div class="sr-state" [attr.data-state]="config.statePreset">
          <ng-container *ngIf="stateTemplate" [ngTemplateOutlet]="stateTemplate"
                        [ngTemplateOutletContext]="{ $implicit: config.statePreset }"></ng-container>
          <div *ngIf="!stateTemplate" class="sr-state__default">
            <svg cdsIcon="information" size="48" class="sr-state__icon"></svg>
            <p class="sr-state__msg">{{ config.statePreset }}</p>
          </div>
        </div>
      </ng-template>

      <!-- Detail Drawer -->
      <aside class="sr-drawer" *ngIf="isSlotVisible('detail-drawer') && config.detailDrawer.enabled && drawerOpen"
             [style.width]="config.detailDrawer.width"
             [class]="'sr-drawer--' + config.detailDrawer.position">
        <ng-container *ngIf="detailDrawer" [ngTemplateOutlet]="detailDrawer"></ng-container>
      </aside>

      <!-- L9: Sticky Footer -->
      <footer class="sr-footer" *ngIf="isSlotVisible('sticky-footer') && config.footer.enabled">
        <ng-container *ngIf="footerContent" [ngTemplateOutlet]="footerContent"></ng-container>
        <div *ngIf="!footerContent" class="sr-footer__default">
          <span *ngIf="config.footer.showSelectionCount" class="sr-footer__selection">{{ selectionCount }} selected</span>
          <span *ngIf="config.footer.showSyncState" class="sr-footer__sync">{{ syncState }}</span>
          <span *ngIf="config.footer.showSaveStatus" class="sr-footer__save">{{ saveStatus }}</span>
        </div>
        <ng-container *ngIf="footerActions" [ngTemplateOutlet]="footerActions"></ng-container>
      </footer>
    </div>
  `,
  styles: [`
    .sr { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--shell-page-bg); font-family: var(--font-family, var(--shell-font-family-en)); }

    .sr-masthead { padding: var(--cds-spacing-04) var(--cds-spacing-06); background: var(--shell-card-bg); border-bottom: var(--shell-border-width) solid var(--shell-card-border); }
    .sr-masthead__breadcrumbs { display: flex; align-items: center; gap: var(--cds-spacing-02); font-size: var(--font-size-sm); color: var(--shell-text-secondary); margin-bottom: var(--cds-spacing-03); }
    .sr-crumb__link { color: var(--cds-link-primary); text-decoration: none; }
    .sr-crumb__text--active { font-weight: 600; color: var(--shell-text-primary); }
    .sr-crumb__sep { margin: 0 var(--cds-spacing-01); }
    .sr-masthead__identity { display: flex; align-items: center; gap: var(--cds-spacing-04); }
    .sr-masthead__icon { fill: var(--shell-text-primary); flex-shrink: 0; }
    .sr-masthead__title { font-size: var(--font-size-xl); font-weight: 600; margin: 0; }
    .sr-masthead__purpose { font-size: var(--font-size-xs-plus); color: var(--shell-text-secondary); margin: var(--cds-spacing-01) 0 0; }
    .sr-masthead__health { font-size: var(--font-size-2xs); padding: var(--cds-spacing-01) var(--cds-spacing-03); border-radius: var(--radius-pill); text-transform: uppercase; font-weight: 600; }
    .sr-masthead__health[data-level="healthy"] { background: color-mix(in srgb, var(--success) 15%, var(--bg-0)); color: var(--success); }
    .sr-masthead__health[data-level="warning"] { background: color-mix(in srgb, var(--warning) 15%, var(--bg-0)); color: var(--warning); }
    .sr-masthead__health[data-level="critical"] { background: color-mix(in srgb, var(--error) 15%, var(--bg-0)); color: var(--error); }
    .sr-masthead__health[data-level="unknown"] { background: var(--bg-0); color: var(--text-muted); }
    .sr-masthead__tier { font-size: var(--font-size-2xs); padding: var(--cds-spacing-01) var(--cds-spacing-03); border-radius: var(--radius-pill); text-transform: uppercase; font-weight: 600; border: var(--shell-border-width) solid currentColor; margin-inline-start: var(--cds-spacing-03); display: inline-flex; align-items: center; gap: var(--cds-spacing-02); }
    .sr-masthead__tier[data-tier="full"] { color: var(--cds-support-info); border-color: var(--cds-support-info); background: var(--shell-status-info-bg); }
    .sr-masthead__tier[data-tier="domain"] { color: var(--cds-link-primary); border-color: var(--cds-link-primary); background: var(--shell-tag-blue-bg); }
    .sr-masthead__tier[data-tier="platform"] { color: var(--shell-text-secondary); border-color: var(--shell-card-border); }
    .sr-masthead__tier svg { fill: currentColor; }
    .sr-masthead__freshness { font-size: var(--font-size-2xs); color: var(--shell-text-secondary); }
    .sr-masthead__tag { font-size: var(--font-size-2xs); padding: var(--cds-spacing-01) var(--cds-spacing-03); border-radius: var(--radius-xs); color: var(--shell-on-primary); }
    .sr-masthead__ai-btn { margin-inline-start: auto; display: flex; align-items: center; gap: var(--cds-spacing-02); padding: var(--cds-spacing-02) var(--cds-spacing-04); border: var(--shell-border-width) solid var(--shell-card-border); border-radius: var(--radius-sm); background: var(--shell-card-bg); cursor: pointer; font-size: var(--font-size-xs-plus); font-weight: 500; transition: background var(--cds-duration-fast-02) var(--cds-easing-standard); }
    .sr-masthead__ai-btn:hover { background: var(--cds-layer-01); }

    .sr-kpi-strip { display: flex; gap: var(--cds-spacing-04); padding: var(--cds-spacing-04) var(--cds-spacing-06); overflow-x: auto; }
    .sr-kpi-card { display: flex; align-items: center; gap: var(--cds-spacing-03); padding: var(--cds-spacing-04) var(--cds-spacing-05); background: var(--shell-card-bg); border-radius: var(--radius); border-inline-start: var(--cds-spacing-02) solid; min-width: var(--shell-kpi-card-min-width); cursor: pointer; transition: box-shadow var(--cds-duration-fast-02) var(--cds-easing-standard); }
    .sr-kpi-card:hover { box-shadow: var(--shell-elevation-01); }
    .sr-kpi-card__label { font-size: var(--font-size-xs-plus); color: var(--shell-text-secondary); }

    .sr-action-bar { display: flex; align-items: center; gap: var(--cds-spacing-03); padding: var(--cds-spacing-03) var(--cds-spacing-06); background: var(--shell-card-bg); border-bottom: var(--shell-border-width) solid var(--shell-card-border); flex-wrap: wrap; }
    .sr-action-bar__btn { display: inline-flex; align-items: center; gap: var(--cds-spacing-02); padding: var(--cds-spacing-02) var(--cds-spacing-04); border: var(--shell-border-width) solid var(--shell-card-border); border-radius: var(--radius-xs); background: transparent; cursor: pointer; font-size: var(--font-size-xs-plus); transition: background var(--cds-duration-fast-02) var(--cds-easing-standard); }
    .sr-action-bar__btn:hover:not(:disabled) { background: var(--cds-layer-01); }
    .sr-action-bar__btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .sr-action-bar__btn--primary { background: var(--cds-button-primary); color: var(--shell-on-primary); border-color: var(--cds-button-primary); }
    .sr-action-bar__btn--primary:hover:not(:disabled) { background: var(--cds-button-primary-hover); }
    .sr-action-bar__btn--ai { background: var(--cds-support-info); color: var(--shell-on-primary); border-color: transparent; }
    .sr-action-bar__spacer { flex: 1; }
    .sr-action-bar__search { display: flex; align-items: center; gap: var(--cds-spacing-02); padding: var(--cds-spacing-02) var(--cds-spacing-04); border: var(--shell-border-width) solid var(--shell-card-border); border-radius: var(--radius-xs); background: var(--cds-layer-01); }
    .sr-action-bar__search input { border: none; background: transparent; outline: none; font-size: var(--font-size-xs-plus); width: var(--shell-actionbar-search-width); }
    .sr-action-bar__label { white-space: nowrap; }
    .sr-action-bar__views { display: flex; gap: var(--cds-spacing-01); }
    .sr-action-bar__view-btn { padding: var(--cds-spacing-02) var(--cds-spacing-03); border: var(--shell-border-width) solid var(--shell-card-border); border-radius: var(--radius-xs); background: transparent; cursor: pointer; font-size: var(--font-size-sm); text-transform: capitalize; }
    .sr-action-bar__view-btn--active { background: var(--cds-layer-01); font-weight: 600; }

    .sr-workflow-ribbon { display: flex; align-items: center; gap: var(--cds-spacing-04); padding: var(--cds-spacing-03) var(--cds-spacing-06); background: var(--cds-layer-01); border-bottom: var(--shell-border-width) solid var(--shell-card-border); font-size: var(--font-size-xs-plus); }
    .sr-workflow-ribbon__default { display: flex; align-items: center; gap: var(--cds-spacing-04); }
    .sr-workflow-ribbon__state { padding: var(--cds-spacing-01) var(--cds-spacing-04); border-radius: var(--radius-pill); background: var(--shell-tag-blue-bg); color: var(--shell-tag-blue-text); font-weight: 600; }
    .sr-workflow-ribbon__owner { color: var(--shell-text-secondary); }
    .sr-workflow-ribbon__sla { color: var(--shell-text-secondary); }
    .sr-workflow-ribbon__transition { padding: var(--cds-spacing-02) var(--cds-spacing-04); border: var(--shell-border-width) solid var(--cds-interactive); border-radius: var(--radius-xs); background: transparent; color: var(--cds-link-primary); cursor: pointer; font-size: var(--font-size-sm); }

    .sr-body { display: flex; flex: 1; min-height: 0; overflow: hidden; }
    .sr-body--cockpit .sr-main, .sr-body--hub .sr-main { padding: var(--cds-spacing-05) var(--cds-spacing-06); }

    .sr-tabs { display: flex; gap: 0; border-bottom: var(--shell-border-width-02) solid var(--shell-card-border); padding: 0 var(--cds-spacing-06); background: var(--shell-card-bg); }
    .sr-tabs__tab { padding: var(--cds-spacing-03) var(--cds-spacing-05); border: none; border-bottom: var(--shell-border-width-02) solid transparent; background: transparent; cursor: pointer; font-size: var(--font-size-xs-plus); color: var(--shell-text-secondary); display: flex; align-items: center; gap: var(--cds-spacing-02); margin-bottom: calc(-1 * var(--shell-border-width-02)); }
    .sr-tabs__tab--active { border-bottom-color: var(--cds-interactive); color: var(--shell-text-primary); font-weight: 600; }

    .sr-panel { overflow-y: auto; background: var(--shell-card-bg); border-inline-start: var(--shell-border-width) solid var(--shell-card-border); flex-shrink: 0; }
    .sr-panel--left { border-inline-start: none; border-inline-end: var(--shell-border-width) solid var(--shell-card-border); width: var(--shell-panel-left-width); }
    .sr-panel--right { width: var(--shell-panel-right-width); }

    .sr-main { flex: 1; overflow-y: auto; min-width: 0; }

    .sr-state { display: flex; align-items: center; justify-content: center; flex: 1; padding: var(--cds-spacing-09); }
    .sr-state__default { text-align: center; color: var(--shell-text-secondary); }
    .sr-state__icon { margin-bottom: var(--cds-spacing-05); display: block; fill: var(--shell-text-secondary); }

    .sr-drawer { position: fixed; inset-block: 0; inset-inline-end: 0; z-index: var(--z-dropdown); background: var(--shell-card-bg); box-shadow: var(--shell-elevation-02); overflow-y: auto; }
    .sr-drawer--bottom { position: fixed; inset-inline: 0; inset-block-end: 0; inset-block-start: auto; height: 50vh; box-shadow: var(--shell-elevation-02); }

    .sr-footer { display: flex; align-items: center; gap: var(--cds-spacing-04); padding: var(--cds-spacing-03) var(--cds-spacing-06); background: var(--shell-card-bg); border-top: var(--shell-border-width) solid var(--shell-card-border); font-size: var(--font-size-xs-plus); }
    .sr-footer__default { display: flex; align-items: center; gap: var(--cds-spacing-05); flex: 1; }
    .sr-footer__selection { font-weight: 600; }
    .sr-footer__sync, .sr-footer__save { color: var(--shell-text-secondary); }

    @media (max-width: 1024px) {
      .sr-panel--left, .sr-panel--right { display: none; }
      .sr-kpi-strip { padding: var(--cds-spacing-03) var(--cds-spacing-04); }
      .sr-action-bar { padding: var(--cds-spacing-02) var(--cds-spacing-04); }
      .sr-masthead { padding: var(--cds-spacing-03) var(--cds-spacing-04); }
    }
  `],
})
export class ShellRendererComponent implements OnChanges {
  @Input() config!: ResolvedShellConfig;
  @Input() drawerOpen = false;
  @Input() selectionCount = 0;
  @Input() syncState = '';
  @Input() saveStatus = '';

  @Output() aiAction = new EventEmitter<string>();
  @Output() kpiClick = new EventEmitter<string>();
  @Output() actionClick = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() viewChange = new EventEmitter<string>();
  @Output() tabChange = new EventEmitter<string>();
  @Output() workflowTransition = new EventEmitter<string>();
  @Output() drawerToggle = new EventEmitter<boolean>();

  @ContentChild('mastheadExtra') mastheadExtra?: TemplateRef<unknown>;
  @ContentChild('kpiValues') kpiValues?: TemplateRef<unknown>;
  @ContentChild('actionBarExtra') actionBarExtra?: TemplateRef<unknown>;
  @ContentChild('workflowRibbon') workflowRibbon?: TemplateRef<unknown>;
  @ContentChild('leftPanel') leftPanel?: TemplateRef<unknown>;
  @ContentChild('contextRail') contextRail?: TemplateRef<unknown>;
  @ContentChild('aiSummary') aiSummary?: TemplateRef<unknown>;
  @ContentChild('activityFeed') activityFeed?: TemplateRef<unknown>;
  @ContentChild('relatedRecords') relatedRecords?: TemplateRef<unknown>;
  @ContentChild('auditTrail') auditTrail?: TemplateRef<unknown>;
  @ContentChild('notes') notes?: TemplateRef<unknown>;
  @ContentChild('stateTemplate') stateTemplate?: TemplateRef<unknown>;
  @ContentChild('detailDrawer') detailDrawer?: TemplateRef<unknown>;
  @ContentChild('footerContent') footerContent?: TemplateRef<unknown>;
  @ContentChild('footerActions') footerActions?: TemplateRef<unknown>;

  visibleKpis: ResolvedShellConfig['kpiStrip']['cards'] = [];
  visibleActions: ResolvedShellConfig['actionBar']['slots'] = [];
  visibleTabs: ResolvedShellConfig['tabs'] = [];
  leftPanelVisible = false;
  private slotMap = new Map<ShellSlotId, ShellSlotConfig>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.slotMap.clear();
      for (const s of this.config.slots) {
        this.slotMap.set(s.slotId, s);
      }
      this.visibleKpis = this.config.kpiStrip.cards.slice(0, this.config.kpiStrip.maxVisible);
      this.visibleActions = this.config.actionBar.slots.filter(s => s.visible);
      this.visibleTabs = this.config.tabs.filter(t => t.visible).sort((a, b) => a.order - b.order);
      this.leftPanelVisible = this.isSlotVisible('filter-panel') || this.isSlotVisible('left-nav-tree');
    }
  }

  isSlotVisible(slotId: ShellSlotId): boolean {
    return this.slotMap.get(slotId)?.visible ?? false;
  }
}
