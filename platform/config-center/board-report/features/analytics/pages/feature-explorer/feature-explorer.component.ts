import { Component, computed, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FeatureCatalogService } from '@app/core/services/platform/feature-catalog.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import type { FeatureCatalogEntry } from '@app/runtime/config/feature-catalog.model';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-feature-explorer',
    imports: [CommonModule, RouterLink, FormsModule, PageShellComponent, InputTextModule, TagModule, CardModule],
    template: `
    <app-page-shell icon="th-large" [title]="i18n.translate('featureExplorer.title')"
      [subtitle]="i18n.translate('featureExplorer.subtitle')"
      [breadcrumbs]="breadcrumbs()" pageFeatureId="feature-explorer">
      <div class="explorer-toolbar">
        <span class="p-input-icon-left search-wrap">
          <i class="pi pi-search"></i>
          <input pInputText [ngModel]="query()" (ngModelChange)="query.set($event)"
            [placeholder]="i18n.translate('featureExplorer.searchPlaceholder')" [attr.aria-label]="i18n.translate('featureExplorer.searchPlaceholder')"
            class="search-input" />
        </span>
        <select class="category-select" [ngModel]="selectedCategory()" (ngModelChange)="selectedCategory.set($event)">
          <option value="">{{ i18n.translate('featureExplorer.allCategories') }}</option>
          @for (c of categories(); track c) {
            <option [value]="c">{{ categoryLabel(c) }}</option>
          }
        </select>
        <select class="role-select" [ngModel]="selectedRole()" (ngModelChange)="selectedRole.set($event)">
          <option value="">{{ i18n.translate('featureExplorer.allRoles') }}</option>
          <option value="All">All</option>
          <option value="ComplianceManager">Compliance Manager</option>
          <option value="RiskManager">Risk Manager</option>
          <option value="Auditor">Auditor</option>
          <option value="ControlOwner">Control Owner</option>
          <option value="EvidenceCustodian">Evidence Custodian</option>
          <option value="TenantAdmin">Tenant Admin</option>
        </select>
      </div>
      <div class="feature-grid">
        @for (e of filteredEntries(); track e.id) {
          <p-card class="feature-card">
            <ng-template pTemplate="header">
              <div class="card-header">
                <p-tag [value]="e.category" severity="info" />
                <h3><a [routerLink]="e.route">{{ labelFor(e) }}</a></h3>
              </div>
            </ng-template>
            <p class="value-prop">{{ valuePropositionFor(e) }}</p>
            @if (whenToUseFor(e)) {
              <p class="when-to-use"><strong>{{ i18n.translate('featureExplorer.whenToUse') }}</strong> {{ whenToUseFor(e) }}</p>
            }
            <div class="roles">
              <span class="roles-label">{{ i18n.translate('featureExplorer.relevantFor') }}</span>
              @for (r of e.roleRelevance; track r) {
                <p-tag [value]="r" severity="secondary" styleClass="role-tag" />
              }
            </div>
          </p-card>
        }
      </div>
      @if (filteredEntries().length === 0 && (query() || selectedCategory() || selectedRole())) {
        <div class="empty-msg">
          {{ i18n.translate('featureExplorer.noFeatures') }}
        </div>
      }
    </app-page-shell>
  `,
    styles: [`
    .explorer-toolbar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; align-items: center; }
    .search-wrap { flex: 1; min-width: 200px; }
    .search-input { width: 100%; padding: 10px 12px 10px 36px; }
    .category-select, .role-select { padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--surface-border); min-width: 160px; }
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .card-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .card-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: var(--font-medium); }
    .card-header h3 a { color: inherit; text-decoration: none; }
    .card-header h3 a:hover { color: var(--primary); }
    .value-prop { font-size: var(--font-size-body-sm); color: var(--text-color-secondary); margin: 8px 0; line-height: 1.4; }
    .when-to-use { font-size: var(--font-size-tag); color: var(--text-color-secondary); margin: 8px 0; line-height: 1.4; }
    .roles { margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .roles-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); margin-inline-end: 4px; }
    .empty-msg { text-align: center; padding: 32px; color: var(--text-color-secondary); }
  `]
})
export class FeatureExplorerComponent {
  query = signal('');
  selectedCategory = signal('');
  selectedRole = signal('');

  categories = computed(() => this.featureCatalog.getCategories());

  filteredEntries = computed(() => {
    let list = this.featureCatalog.all();
    const q = this.query().trim().toLowerCase();
    const cat = this.selectedCategory();
    const role = this.selectedRole();
    if (q) list = this.featureCatalog.search(this.query().trim());
    if (cat) list = list.filter((e) => e.category === cat);
    if (role) list = list.filter((e) => e.roleRelevance?.includes(role));
    return list.sort((a, b) => a.order - b.order);
  });

  breadcrumbs = computed(() =>
    [this.i18n.translate('common.dashboard'), this.i18n.translate('featureExplorer.title')]);

  constructor(
    public i18n: I18nService,
    private featureCatalog: FeatureCatalogService,
  ) {}

  labelFor(e: FeatureCatalogEntry): string {
    return this.i18n.localize(e.labelEn, e.labelAr || e.labelEn);
  }

  valuePropositionFor(e: FeatureCatalogEntry): string {
    return this.i18n.localize(e.valuePropositionEn, e.valuePropositionAr || e.valuePropositionEn);
  }

  whenToUseFor(e: FeatureCatalogEntry): string {
    const s = this.i18n.localize(e.whenToUseEn || e.whenToUseAr || '', e.whenToUseAr || e.whenToUseEn || '');
    return s || '';
  }

  categoryLabel(cat: string): string {
    const labels: Record<string, string> = {
      main: 'Main',
      grc: 'Core GRC',
      operations: 'Operations',
      intelligence: 'Intelligence',
      advanced: 'Advanced',
      account: 'Account',
      admin: 'Admin',
      ksa: 'KSA',
      journey: 'Journey',
      public: 'Public',
    };
    return labels[cat] ?? cat;
  }
}
