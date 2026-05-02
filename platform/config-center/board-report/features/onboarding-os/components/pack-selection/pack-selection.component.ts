import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { BilingualPipe } from '../shared/bilingual.pipe';
import { environment } from '@env/environment';

export interface PackModule {
  module_code: string;
  is_core: boolean;
  sort_order: number;
}

export interface ProductPack {
  pack_code: string;
  pack_name_en: string;
  pack_name_ar: string;
  description_en: string;
  description_ar: string;
  target_audience_en: string;
  target_audience_ar: string;
  badge_en: string;
  badge_ar: string;
  icon_class: string;
  sort_order: number;
  estimated_setup_minutes: number;
  modules: PackModule[];
}

@Component({
    selector: 'app-pack-selection',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonModule, TagModule, DialogModule, BilingualPipe],
    template: `
    <div class="pack-selection" [class.rtl]="lang === 'ar'">
      <h2 class="pack-title">
        {{ { en: 'Select Your Operating Pack', ar: 'اختر حزمة التشغيل' } | bilingual:lang }}
      </h2>
      <p class="pack-subtitle">
        {{ { en: 'Each pack activates a curated set of modules with starter workflows, dashboards, and AI agent configurations.',
             ar: 'كل حزمة تفعّل مجموعة منسقة من الموديولات مع سير عمل ولوحات بيانات وإعدادات وكلاء الذكاء.' } | bilingual:lang }}
      </p>

      <div class="pack-grid">
        <div *ngFor="let pack of packs(); let i = index"
          class="pack-card"
          [class.selected]="selectedPack === pack.pack_code"
          [style.animation-delay]="(i * 80) + 'ms'"
          (click)="selectPack(pack.pack_code)"
          (keydown.enter)="selectPack(pack.pack_code)"
          tabindex="0"
          role="button"
          [attr.aria-pressed]="selectedPack === pack.pack_code">

          <div class="pack-badge" *ngIf="pack.badge_en">
            <p-tag [value]="({ en: pack.badge_en, ar: pack.badge_ar } | bilingual:lang)" severity="info" />
          </div>

          <div class="pack-selected-check" *ngIf="selectedPack === pack.pack_code">
            <i class="pi pi-check"></i>
          </div>

          <div class="pack-icon">
            <i class="pi" [ngClass]="pack.icon_class || 'pi-box'"></i>
          </div>

          <h3 class="pack-name">{{ { en: pack.pack_name_en, ar: pack.pack_name_ar } | bilingual:lang }}</h3>

          <p class="pack-desc">{{ { en: pack.description_en, ar: pack.description_ar } | bilingual:lang }}</p>

          <div class="pack-audience">
            <i class="pi pi-users"></i>
            <span>{{ { en: pack.target_audience_en, ar: pack.target_audience_ar } | bilingual:lang }}</span>
          </div>

          <div class="pack-modules-preview">
            <span class="module-count">{{ pack.modules?.length || 0 }} {{ { en: 'modules', ar: 'موديول' } | bilingual:lang }}</span>
            <span class="setup-time">
              <i class="pi pi-clock"></i>
              ~{{ pack.estimated_setup_minutes }} {{ { en: 'min', ar: 'دقيقة' } | bilingual:lang }}
            </span>
          </div>

          <div class="pack-module-chips">
            <span *ngFor="let mod of (pack.modules || []).slice(0, 5)" class="module-chip">{{ mod.module_code }}</span>
            <span *ngIf="(pack.modules?.length || 0) > 5" class="module-chip more">+{{ (pack.modules?.length || 0) - 5 }}</span>
          </div>
        </div>
      </div>

      <div class="pack-compare">
        <button pButton
          [label]="({ en: 'Compare All Packs', ar: 'قارن جميع الحزم' } | bilingual:lang)"
          icon="pi pi-table" severity="secondary" class="p-button-sm"
          (click)="showCompare.set(true)">
        </button>
      </div>

      <p-dialog
        [header]="({ en: 'Pack Comparison', ar: 'مقارنة الحزم' } | bilingual:lang)"
        [(visible)]="compareVisible"
        [modal]="true" [style]="{width: '90vw', maxWidth: '900px'}"
        [dismissableMask]="true">
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th>{{ { en: 'Module', ar: 'الموديول' } | bilingual:lang }}</th>
                <th *ngFor="let pack of packs()">{{ { en: pack.pack_name_en, ar: pack.pack_name_ar } | bilingual:lang }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let mod of allModuleCodes">
                <td class="mod-name">{{ mod }}</td>
                <td *ngFor="let pack of packs()" class="mod-check">
                  <i *ngIf="hasModule(pack, mod)" class="pi pi-check-circle check-yes"></i>
                  <i *ngIf="!hasModule(pack, mod)" class="pi pi-minus-circle check-no"></i>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </p-dialog>
    </div>
  `,
    styles: [`
    .pack-selection { max-width: 900px; }
    .pack-title { font-size: var(--font-size-2xl); font-weight: 700; margin: 0 0 0.5rem; }
    .pack-subtitle { font-size: var(--font-size-body-sm); color: var(--text-secondary); margin: 0 0 1.5rem; line-height: 1.5; }
    .pack-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem; margin-bottom: 1.5rem;
    }
    .pack-card {
      position: relative; padding: 1.25rem; border-radius: var(--radius-lg);
      border: 2px solid var(--border-subtle, #e5e7eb);
      background: var(--surface-card, #fff); cursor: pointer;
      transition: all 0.25s ease; animation: premium-fade-up 0.4s ease both;
    }
    .pack-card:hover { border-color: var(--primary, #0f62fe); box-shadow: 0 4px 20px rgba(var(--primary-rgb), 0.08); }
    .pack-card.selected { border-color: var(--primary); background: var(--surface-highlight, rgba(var(--primary-rgb), 0.04)); }
    .pack-badge { position: absolute; top: 0.75rem; right: 0.75rem; }
    .pack-selected-check {
      position: absolute; top: 0.75rem; left: 0.75rem;
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--primary); display: flex; align-items: center; justify-content: center;
    }
    .pack-selected-check i { color: #fff; font-size: var(--font-size-xs); }
    .pack-icon { margin-bottom: 0.75rem; }
    .pack-icon i { font-size: var(--font-size-3xl); color: var(--primary); }
    .pack-name { font-size: var(--font-size-body-md); font-weight: 700; margin: 0 0 0.5rem; }
    .pack-desc { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 0.75rem; min-height: 3.6em; }
    .pack-audience {
      display: flex; align-items: flex-start; gap: 0.35rem;
      font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 0.75rem;
    }
    .pack-audience i { font-size: var(--font-size-sm); margin-top: 2px; }
    .pack-modules-preview {
      display: flex; align-items: center; justify-content: space-between;
      font-size: var(--font-size-caption); font-weight: 600; color: var(--text-heading);
      margin-bottom: 0.5rem;
    }
    .setup-time { display: flex; align-items: center; gap: 0.25rem; color: var(--text-muted); font-weight: 500; }
    .pack-module-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .module-chip {
      font-size: 0.68rem; background: var(--surface-ground); border-radius: var(--radius-xs);
      padding: 0.15rem 0.4rem; color: var(--text-body); font-weight: 500;
    }
    .module-chip.more { background: var(--primary); color: #fff; }
    .pack-compare { text-align: center; }
    .compare-table-wrap { overflow-x: auto; }
    .compare-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .compare-table th, .compare-table td { padding: 0.5rem; border-bottom: 1px solid var(--border-subtle); text-align: center; }
    .compare-table th { font-weight: 700; background: var(--surface-ground); }
    .mod-name { text-align: left; font-weight: 600; }
    .check-yes { color: var(--status-success, #24a148); }
    .check-no { color: var(--border-subtle, #ccc); }
    .rtl .pack-badge { right: auto; left: 0.75rem; }
    .rtl .pack-selected-check { left: auto; right: 0.75rem; }
    .rtl .mod-name { text-align: right; }
    @keyframes premium-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class PackSelectionComponent implements OnInit {
  private http = inject(HttpClient);

  @Input() lang: 'en' | 'ar' = 'en';
  @Input() selectedPack: string = '';
  @Output() packSelected = new EventEmitter<string>();

  packs = signal<ProductPack[]>([]);
  showCompare = signal(false);
  compareVisible = false;

  get allModuleCodes(): string[] {
    const set = new Set<string>();
    for (const pack of this.packs()) {
      for (const mod of pack.modules || []) set.add(mod.module_code);
    }
    return Array.from(set).sort();
  }

  ngOnInit(): void {
    this.http.get<{ packs: ProductPack[] }>(`${environment.apiUrl}/onboarding/packs`).subscribe({
      next: (res) => this.packs.set(res.packs || []),
      error: () => this.packs.set(this.getFallbackPacks()),
    });
  }

  selectPack(code: string): void {
    this.packSelected.emit(code);
  }

  hasModule(pack: ProductPack, moduleCode: string): boolean {
    return (pack.modules || []).some(m => m.module_code === moduleCode);
  }

  private getFallbackPacks(): ProductPack[] {
    return [
      { pack_code: 'governance_starter', pack_name_en: 'Governance Starter', pack_name_ar: 'بداية الحوكمة', description_en: 'Essential governance, strategy, team, workflow, records.', description_ar: 'الحوكمة الأساسية.', target_audience_en: 'Organizations starting governance', target_audience_ar: 'المؤسسات المبتدئة', badge_en: 'Good Starting Point', badge_ar: 'نقطة بداية', icon_class: 'pi-flag', sort_order: 1, estimated_setup_minutes: 10, modules: [{ module_code: 'governance', is_core: true, sort_order: 1 }, { module_code: 'foundation', is_core: true, sort_order: 2 }, { module_code: 'workflow', is_core: true, sort_order: 3 }, { module_code: 'team', is_core: true, sort_order: 4 }] },
      { pack_code: 'core_grc', pack_name_en: 'Core GRC', pack_name_ar: 'GRC الأساسي', description_en: 'Compliance, risk, policy, controls, evidence, issues.', description_ar: 'الامتثال والمخاطر والسياسات.', target_audience_en: 'Regulated industries', target_audience_ar: 'القطاعات المنظمة', badge_en: 'Best for Saudi Compliance', badge_ar: 'الأفضل للامتثال', icon_class: 'pi-shield', sort_order: 2, estimated_setup_minutes: 15, modules: [{ module_code: 'compliance', is_core: true, sort_order: 1 }, { module_code: 'risk', is_core: true, sort_order: 2 }, { module_code: 'policy', is_core: true, sort_order: 3 }, { module_code: 'evidence', is_core: true, sort_order: 4 }] },
      { pack_code: 'full_enterprise', pack_name_en: 'Full Enterprise', pack_name_ar: 'المؤسسة الكاملة', description_en: 'All modules, all frameworks, all 17+ agents.', description_ar: 'جميع الموديولات والأُطر والوكلاء.', target_audience_en: 'Large enterprises', target_audience_ar: 'المؤسسات الكبيرة', badge_en: 'Recommended', badge_ar: 'موصى به', icon_class: 'pi-globe', sort_order: 6, estimated_setup_minutes: 25, modules: [{ module_code: 'risk', is_core: true, sort_order: 1 }, { module_code: 'compliance', is_core: true, sort_order: 2 }, { module_code: 'policy', is_core: true, sort_order: 3 }, { module_code: 'evidence', is_core: true, sort_order: 4 }, { module_code: 'audit', is_core: true, sort_order: 5 }] },
    ];
  }
}
