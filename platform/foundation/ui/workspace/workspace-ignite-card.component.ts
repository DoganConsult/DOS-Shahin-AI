import { Component, inject, signal, computed, OnInit, OnDestroy, Input, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { interval, Subscription, switchMap, takeWhile } from 'rxjs';
import { catchError, of } from 'rxjs';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import {
  ModuleKickstartService, ModuleKickstartState, ModuleCode,
  IgniteResponse,
} from '@app/modules';
import {
  ButtonModule, TooltipModule, IconModule, TagModule,
  ProgressBarModule, InlineLoadingModule, SkeletonModule,
} from 'carbon-components-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { COCKPIT_CONFIG } from '@app/dos/contracts/cockpit-config.contract';

interface ModuleRow {
  code: ModuleCode;
  labelEn: string;
  labelAr: string;
  icon: string;
  status: string;
  prereqMet: boolean;
  prereqDetails: string;
  fixRoute: string;
  blocker: string;
  wouldCreate: Record<string, number>;
  route: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workspace-ignite-card',
    imports: [
        CommonModule, RouterLink,
        // Carbon Design System (DB-registered primitives)
        ButtonModule,        // carbon_key: 'button'
        TooltipModule,       // carbon_key: 'tooltip'
        IconModule,          // carbon_key: 'icon'
        TagModule,           // carbon_key: 'tag'
        ProgressBarModule,   // carbon_key: 'progress-bar'
        InlineLoadingModule, // carbon_key: 'inline-loading'
        SkeletonModule,      // carbon_key: 'skeleton'
    ],
    templateUrl: './workspace-ignite-card.component.html',
    styleUrls: ['./workspace-ignite-card.component.scss']
})
export class WorkspaceIgniteCardComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  @Input() canIgnite = false;

  private kickstartSvc = inject(ModuleKickstartService);
  private router = inject(Router);
  readonly i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();
  private cockpitConfig = inject(COCKPIT_CONFIG);
  private get MODULE_ORDER() { return this.cockpitConfig.getIgniteModuleOrder() as ModuleCode[]; }
  private get MODULE_META() { return this.cockpitConfig.getIgniteModuleMeta(); }
  // W6.F6.1 — only modules truly entitled to this tenant (returned by the API)
  // are shown; we never enumerate the static GRC list when no activation row
  // exists for that module.
  private activeModules(): ModuleCode[] {
    const s = this.statuses();
    const present = new Set(Object.keys(s || {}));
    return this.MODULE_ORDER.filter(m => present.has(m));
  }
  private pollSub: Subscription | null = null;

  dir = computed(() => this.i18n.direction() as 'ltr' | 'rtl');

  statuses = signal<Record<string, ModuleKickstartState>>({});
  dryRunResult = signal<IgniteResponse | null>(null);
  dryRunLoading = signal(false);
  igniteLoading = signal(false);
  moduleLoading = signal<Record<string, boolean>>({});

  visible = computed(() => {
    const s = this.statuses();
    if (!s || Object.keys(s).length === 0) return false;
    const active = this.activeModules();
    if (active.length === 0) return false;
    return active.some(m => s[m]?.status !== 'completed');
  });

  pendingCount = computed(() => {
    const s = this.statuses();
    return this.activeModules().filter(m => {
      const st = s[m]?.status;
      return !st || st === 'pending' || st === 'failed';
    }).length;
  });

  hasFailedModules = computed(() => {
    const s = this.statuses();
    return this.activeModules().some(m => s[m]?.status === 'failed');
  });

  allCompleted = computed(() => {
    const s = this.statuses();
    const active = this.activeModules();
    return active.length > 0 && active.every(m => s[m]?.status === 'completed');
  });

  totalCount = computed(() => this.activeModules().length);

  completedCount = computed(() => {
    const s = this.statuses();
    return this.activeModules().filter(m => s[m]?.status === 'completed').length;
  });

  progressPct = computed(() => {
    const total = this.totalCount();
    if (total === 0) return 0;
    return Math.round((this.completedCount() / total) * 100);
  });

  moduleRows = computed<ModuleRow[]>(() => {
    const s = this.statuses();
    return this.activeModules().map(code => {
      const meta = this.MODULE_META[code] ?? { labelEn: code, labelAr: code, icon: 'cog', route: '/' };
      const st = s[code]?.status ?? 'pending';
      const dr = this.dryRunResult()?.results?.[code];
      return {
        code,
        labelEn: meta.labelEn,
        labelAr: meta.labelAr,
        icon: meta.icon,
        status: st,
        prereqMet: dr?.prerequisites?.met ?? true,
        prereqDetails: dr?.prerequisites?.details ?? '',
        fixRoute: dr?.fixRoute ?? dr?.prerequisites?.fixRoute ?? '',
        blocker: dr?.blocker ?? '',
        wouldCreate: dr?.wouldCreate ?? {},
        route: meta.route,
      };
    });
  });

  dryRunEntries = computed(() => {
    const dr = this.dryRunResult();
    if (!dr) return [];
    return this.activeModules().map(code => {
      const meta = this.MODULE_META[code] ?? { labelEn: code, labelAr: code, icon: 'cog', route: '/' };
      const r = dr.results[code];
      let wouldCreateSummary = '';
      if (r?.wouldCreate) {
        const parts = Object.entries(r.wouldCreate)
          .filter(([, v]) => typeof v === 'number' && v > 0)
          .map(([k, v]) => `${v} ${k}`);
        wouldCreateSummary = parts.join(', ');
      }
      return {
        code,
        labelEn: meta.labelEn,
        labelAr: meta.labelAr,
        status: r?.status ?? 'ready',
        blocker: r?.blocker ?? '',
        fixRoute: r?.fixRoute ?? r?.prerequisites?.fixRoute ?? '',
        wouldCreateSummary,
      };
    });
  });

  ngOnInit(): void {
    this.refreshStatuses();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  refreshStatuses(): void {
    this.kickstartSvc.loadStatus().pipe(
      catchError(() => of({}))
    , takeUntilDestroyed(this.destroyRef)).subscribe((s) => {
      this.statuses.set(s || {});
    });
  }

  runDryRun(): void {
    this.dryRunLoading.set(true);
    this.dryRunResult.set(null);
    this.kickstartSvc.igniteAll(true, 'all').pipe(
      catchError(() => of(null))
    , takeUntilDestroyed(this.destroyRef)).subscribe(res => {
      this.dryRunLoading.set(false);
      if (res) this.dryRunResult.set(res);
    });
  }

  dismissDryRun(): void {
    this.dryRunResult.set(null);
  }

  runIgniteAll(): void {
    this.igniteLoading.set(true);
    this.dryRunResult.set(null);
    this.kickstartSvc.igniteAll(false, 'all').pipe(
      catchError(() => of(null))
    , takeUntilDestroyed(this.destroyRef)).subscribe(res => {
      this.igniteLoading.set(false);
      if (res) this.refreshStatuses();
      this.startPolling();
    });
  }

  retryAllFailed(): void {
    this.igniteLoading.set(true);
    this.kickstartSvc.igniteAll(false, 'failed_only').pipe(
      catchError(() => of(null))
    , takeUntilDestroyed(this.destroyRef)).subscribe(res => {
      this.igniteLoading.set(false);
      if (res) this.refreshStatuses();
    });
  }

  igniteSingle(moduleCode: ModuleCode): void {
    this.moduleLoading.update(m => ({ ...m, [moduleCode]: true }));
    this.kickstartSvc.kickstart(moduleCode).pipe(
      catchError(() => of(null))
    , takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.moduleLoading.update(m => ({ ...m, [moduleCode]: false }));
      this.refreshStatuses();
    });
  }

  /** Map module meta icon names to Carbon icon names. */
  carbonIcon(icon: string): string {
    const map: Record<string, string> = {
      cog: 'settings', shield: 'security', bolt: 'lightning', search: 'search',
      building: 'enterprise', users: 'group', chart: 'chart--bar', folder: 'folder',
      lock: 'locked', eye: 'view', list: 'list', check: 'checkmark',
      file: 'document', clock: 'time', database: 'data-base', home: 'home',
      'chart-bar': 'chart--bar', 'chart-line': 'chart--line',
      'exclamation-triangle': 'warning', 'check-circle': 'checkmark--filled',
      'times-circle': 'close--filled', refresh: 'renew', 'external-link': 'launch',
    };
    return map[icon] || icon;
  }

  private startPolling(): void {
    this.pollSub?.unsubscribe();
    let ticks = 0;
    this.pollSub = interval(2000).pipe(
      takeWhile(() => ticks < 30),
      switchMap(() => {
        ticks++;
        return this.kickstartSvc.loadStatus().pipe(catchError(() => of(null)));
      }),
      takeUntilDestroyed(this.destroyRef)).subscribe((s) => {
      if (!s) return;
      this.statuses.set(s);
      const hasRunning = this.MODULE_ORDER.some(m => s[m]?.status === 'in_progress');
      if (!hasRunning) {
        this.pollSub?.unsubscribe();
      }
    });
  }
}
