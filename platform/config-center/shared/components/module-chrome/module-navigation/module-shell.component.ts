import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { BadgeModule } from 'primeng/badge';
import { ModuleReadinessService, type ReadinessState } from '@app/core/modules/module-readiness.service';
import { ModuleFirstVisitOverlayComponent } from '../module-first-visit-overlay.component';

export interface ModuleKpiCard {
  label: string;
  value: number | string;
  icon?: string;
  severity?: 'success' | 'info' | 'warn' | 'danger';
  trend?: 'up' | 'down' | 'stable';
}

export interface ModuleNavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  active?: boolean;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-module-shell',
    imports: [CommonModule, ButtonModule, CardModule, TagModule, ProgressBarModule, BadgeModule, ModuleFirstVisitOverlayComponent],
    template: `
    @if (showFirstVisit()) {
      <app-module-first-visit-overlay
        [moduleCode]="moduleCode"
        (startSetup)="onStartSetup()"
        (dismiss)="dismissFirstVisit()">
      </app-module-first-visit-overlay>
    } @else {
      <div class="module-shell" [attr.dir]="'ltr'">
        <!-- Header Row -->
        <div class="module-header">
          <div class="header-left">
            <h1 class="module-title">{{ title }}</h1>
            @if (subtitle) {
              <span class="module-subtitle">{{ subtitle }}</span>
            }
          </div>
          <div class="header-right">
            @if (readinessState()) {
              <p-tag [value]="readinessLabel()" [severity]="readinessSeverity()"></p-tag>
            }
            <button pButton icon="pi pi-sparkles" label="AI Assist" severity="secondary" size="small"
                    (click)="aiAction.emit()"></button>
            <ng-content select="[headerActions]"></ng-content>
          </div>
        </div>

        <!-- KPI Strip -->
        @if (kpiCards.length > 0) {
          <div class="kpi-strip">
            @for (kpi of kpiCards; track kpi.label) {
              <p-card styleClass="kpi-card">
                <div class="kpi-content">
                  @if (kpi.icon) {
                    <i class="pi {{ kpi.icon }} kpi-icon" [class]="'kpi-' + (kpi.severity || 'info')"></i>
                  }
                  <div class="kpi-value">{{ kpi.value }}</div>
                  <div class="kpi-label">{{ kpi.label }}</div>
                </div>
              </p-card>
            }
          </div>
        }

        <!-- Main Body -->
        <div class="module-body">
          <!-- Left Navigation -->
          @if (navItems.length > 0) {
            <nav class="module-nav">
              @for (nav of navItems; track nav.route) {
                <a class="nav-item" [class.active]="nav.active" (click)="onNavClick(nav)">
                  <i class="pi {{ nav.icon }}"></i>
                  <span>{{ nav.label }}</span>
                  @if (nav.badge) {
                    <p-badge [value]="'' + nav.badge" severity="danger"></p-badge>
                  }
                </a>
              }
            </nav>
          }

          <!-- Center Content -->
          <div class="module-content">
            <ng-content></ng-content>
          </div>

          <!-- Right Rail -->
          @if (showRightRail) {
            <aside class="module-right-rail">
              <ng-content select="[rightRail]"></ng-content>
            </aside>
          }
        </div>
      </div>
    }
  `,
    styles: [`
    .module-shell { display: flex; flex-direction: column; height: 100%; }
    .module-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid var(--surface-200); background: var(--surface-0); }
    .header-left { display: flex; align-items: baseline; gap: 0.75rem; }
    .module-title { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .module-subtitle { color: var(--text-color-secondary); font-size: var(--font-size-base); }
    .header-right { display: flex; align-items: center; gap: 0.5rem; }
    .kpi-strip { display: flex; gap: 1rem; padding: 1rem 1.5rem; overflow-x: auto; background: var(--surface-50); }
    :host .kpi-card { min-width: 140px; flex: 1; }
    .kpi-content { text-align: center; padding: 0.5rem; }
    .kpi-icon { font-size: var(--font-size-xl); margin-bottom: 0.25rem; display: block; }
    .kpi-success { color: var(--green-500); }
    .kpi-warn { color: var(--orange-500); }
    .kpi-danger { color: var(--red-500); }
    .kpi-info { color: var(--blue-500); }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .kpi-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .module-body { display: flex; flex: 1; overflow: hidden; }
    .module-nav { width: 200px; padding: 1rem 0; border-right: 1px solid var(--surface-200); background: var(--surface-0); flex-shrink: 0; }
    .nav-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; cursor: pointer; color: var(--text-color); text-decoration: none; transition: background 0.15s; }
    .nav-item:hover { background: var(--surface-100); }
    .nav-item.active { background: var(--primary-50, var(--surface-100)); color: var(--primary-color); font-weight: 600; border-right: 3px solid var(--primary-color); }
    .module-content { flex: 1; overflow-y: auto; padding: 1.5rem; }
    .module-right-rail { width: 280px; padding: 1rem; border-left: 1px solid var(--surface-200); background: var(--surface-0); flex-shrink: 0; overflow-y: auto; }
    @media (max-width: 1024px) { .module-nav { display: none; } .module-right-rail { display: none; } }
  `]
})
export class ModuleShellComponent implements OnInit {
  @Input() moduleCode = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() kpiCards: ModuleKpiCard[] = [];
  @Input() navItems: ModuleNavItem[] = [];
  @Input() showRightRail = false;
  @Output() aiAction = new EventEmitter<void>();
  @Output() navClick = new EventEmitter<ModuleNavItem>();

  private readinessService = inject(ModuleReadinessService);
  private router = inject(Router);

  showFirstVisit = signal(false);
  readinessState = signal<ReadinessState | null>(null);

  readinessLabel = computed(() => {
    const s = this.readinessState();
    const labels: Record<string, string> = { ready: 'Active', needs_setup: 'Needs Setup', in_progress: 'Setting Up', attention_required: 'Action Needed' };
    return s ? labels[s] || '' : '';
  });

  readinessSeverity = computed((): 'success' | 'info' | 'warn' | 'danger' => {
    const s = this.readinessState();
    if (s === 'ready') return 'success';
    if (s === 'in_progress') return 'info';
    if (s === 'needs_setup') return 'warn';
    return 'danger';
  });

  ngOnInit(): void {
    if (!this.moduleCode) return;
    const state = this.readinessService.getModuleState(this.moduleCode);
    this.readinessState.set(state);
    if (state === 'needs_setup') {
      const dismissed = sessionStorage.getItem(`first_visit_dismissed_${this.moduleCode}`);
      if (!dismissed) {
        this.showFirstVisit.set(true);
      }
    }
  }

  onStartSetup(): void {
    this.showFirstVisit.set(false);
    this.router.navigate(['/modules', this.moduleCode, 'setup']);
  }

  dismissFirstVisit(): void {
    sessionStorage.setItem(`first_visit_dismissed_${this.moduleCode}`, 'true');
    this.showFirstVisit.set(false);
  }

  onNavClick(nav: ModuleNavItem): void {
    this.navClick.emit(nav);
    this.router.navigate([nav.route]);
  }
}
