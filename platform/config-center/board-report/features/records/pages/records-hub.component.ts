import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '@app/infrastructure';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-overview-kit.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-records-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, ModuleOverviewKitComponent],
  template: `
    <div class="hub-shell" [dir]="i18n.direction()">
      <header class="hub-header">
        <div class="title-row">
          <div class="icon-wrap" style="background: var(--teal-50, #f0fdfa)">
            <i class="pi pi-folder-open" style="color: var(--teal-500)"></i>
          </div>
          <div>
            <h1>Records Management</h1>
            <p class="subtitle">Document records, retention policies, legal holds, classification, and disposal</p>
          </div>
        </div>
      </header>
      <router-outlet></router-outlet>
      <app-module-overview-kit [config]="kitConfig()"></app-module-overview-kit>
    </div>
  `,
  styles: [`
    .hub-shell { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .hub-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; }
    .icon-wrap i { font-size: var(--font-size-2xl); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
  `],
})
export class RecordsHubComponent {
  readonly i18n = inject(I18nService);

  kitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'records',
    tier: 'domain',
    automationLevel: 'semi',
    slaHours: 720,
    transitions: [
      { from: 'draft', to: 'active' },
      { from: 'active', to: 'under_review' },
      { from: 'active', to: 'on_hold' },
      { from: 'under_review', to: 'active' },
      { from: 'under_review', to: 'archived' },
      { from: 'archived', to: 'disposed', requiresApproval: true },
      { from: 'on_hold', to: 'active' },
    ],
    currentStatus: 'active',
    agents: [],
    lang: this.i18n.currentLang() === 'ar' ? 'ar' : 'en',
  }));
}
