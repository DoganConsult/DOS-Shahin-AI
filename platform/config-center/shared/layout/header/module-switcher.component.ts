import { Component, OnInit, signal, inject, Input, Output, EventEmitter, ChangeDetectionStrategy, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { TooltipModule } from 'primeng/tooltip';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

export type ActiveModule = 'agrc' | 'qiyas';

export interface ModuleEntry {
  id: ActiveModule;
  labelEn: string;
  labelAr: string;
  icon: string;
  rootRoute: string;
  color: string;
}

const MODULE_DEFS: ModuleEntry[] = [
  {
    id: 'agrc',
    labelEn: 'GRC',
    labelAr: 'الحوكمة والمخاطر',
    icon: 'pi-shield',
    rootRoute: '/workspace-home',
    color: '#0ea5e9',
  },
  {
    id: 'qiyas',
    labelEn: 'Qiyas',
    labelAr: 'قياس',
    icon: 'pi-chart-bar',
    rootRoute: '/qiyas',
    color: '#8b5cf6',
  },
];

const QIYAS_ROUTE_PREFIX = '/qiyas';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-module-switcher',
    imports: [CommonModule, TooltipModule],
    template: `
    <div class="module-switcher" *ngIf="availableModules().length > 1" role="tablist" [attr.aria-label]="i18n.translate('moduleSwitcher.switchModule')">
      <button
        *ngFor="let mod of availableModules()"
        class="ms-tab"
        role="tab"
        [class.active]="activeModule() === mod.id"
        [attr.aria-selected]="activeModule() === mod.id"
        [pTooltip]="i18n.localize(mod.labelEn, mod.labelAr)"
        tooltipPosition="right"
        (click)="switchTo(mod)"
        [style.--mod-color]="mod.color">
        <i class="pi" [ngClass]="mod.icon"></i>
        <span class="ms-label" *ngIf="expanded">{{ i18n.localize(mod.labelEn, mod.labelAr) }}</span>
        <span class="ms-active-dot" *ngIf="activeModule() === mod.id"></span>
      </button>
    </div>
  `,
    styles: [`
    .module-switcher {
      display: flex;
      flex-direction: row;
      gap: 4px;
      padding: 6px 8px;
      background: var(--surface-ice, #f0f4f8);
      border-radius: var(--radius);
      margin: 6px 8px;
    }
    .ms-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      padding: 6px 10px;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-muted, var(--text-muted));
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
      transition: background 150ms, color 150ms;
      position: relative;
      white-space: nowrap;
    }
    .ms-tab:hover {
      background: var(--surface, #fff);
      color: var(--mod-color, var(--primary));
    }
    .ms-tab.active {
      background: var(--surface, #fff);
      color: var(--mod-color, var(--primary));
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    .ms-tab .pi {
      font-size: var(--font-size-base);
    }
    .ms-active-dot {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 5px;
      height: 5px;
      border-radius: var(--radius-pill);
      background: var(--mod-color, var(--primary));
    }
    .ms-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class ModuleSwitcherComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  public i18n = inject(I18nService);
  private destroyRef = inject(DestroyRef);

  @Input() expanded = true;
  @Output() moduleSwitch = new EventEmitter<ActiveModule>();

  readonly activeModule = signal<ActiveModule>('agrc');
  readonly availableModules = signal<ModuleEntry[]>([]);

  ngOnInit(): void {
    this.loadEntitlements();
    this.detectModuleFromRoute(this.router.url);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe((e: NavigationEnd) => this.detectModuleFromRoute(e.urlAfterRedirects ?? e.url));
  }

  switchTo(mod: ModuleEntry): void {
    if (this.activeModule() === mod.id) return;
    this.activeModule.set(mod.id);
    this.moduleSwitch.emit(mod.id);
    this.router.navigateByUrl(mod.rootRoute);
  }

  private detectModuleFromRoute(url: string): void {
    const prev = this.activeModule();
    const next: ActiveModule = url.startsWith(QIYAS_ROUTE_PREFIX) ? 'qiyas' : 'agrc';
    if (next !== prev) {
      this.activeModule.set(next);
      this.moduleSwitch.emit(next);
    }
  }

  private loadEntitlements(): void {
    this.http.get<{ visibleModules?: string[], commercialBundles?: string[] }>('/api/config/products-modules').subscribe({
      next: (data) => {
        const visible = data?.visibleModules ?? [];
        const bundles = data?.commercialBundles ?? [];
        const isQiyasEnabled = visible.includes('qiyas') || bundles.includes('qiyas');
        const enabled = MODULE_DEFS.filter(m => {
          if (m.id === 'agrc') return true;
          if (m.id === 'qiyas') return isQiyasEnabled;
          return false;
        });
        this.availableModules.set(enabled);
      },
      error: () => {
        this.availableModules.set(MODULE_DEFS.filter(m => m.id === 'agrc'));
      }
    });
  }

}
