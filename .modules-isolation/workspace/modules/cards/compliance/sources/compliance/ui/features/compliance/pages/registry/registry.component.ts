import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ButtonModule, InputModule, NotificationModule, TabsModule, TagModule, TilesModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-registry',
    imports: [
        CommonModule, FormsModule, PageShellComponent,
        TabsModule, TilesModule, ButtonModule, InputModule,
        TagModule, TagModule, NotificationModule
    ],
    providers: [],
    template: `
    <app-page-shell
      icon="database"
      [title]="i18n.translate('nav.registry')"
      [subtitle]="i18n.translate('registry.subtitle')"
      [breadcrumbs]="['Dashboard', 'Registry']"
      [loading]="loading">

      <cds-notification></cds-notification>

      <cds-tabs [(activeIndex)]="tabIndex" (onChange)="onTabChange($event)">
        <!-- Regulators -->
        <cds-tab [header]="i18n.translate('registry.regulators')">
          <div class="cards-grid">
            <cds-tile *ngFor="let r of regulators" styleClass="reg-card" (click)="selectRegulator(r)">
              <div class="reg-inner">
                <cds-tag [value]="r.code" severity="info" styleClass="reg-code-tag" />
                <h3 class="reg-name">{{ i18n.getBilingualField(r, 'name_') || r.name_en }}</h3>
                <p class="reg-desc">{{ i18n.getBilingualField(r, 'full_name_') || r.full_name_en }}</p>
                <div class="reg-meta" *ngIf="r.website">
                  <i class=""></i>
                  <span>{{ r.website }}</span>
                </div>
              </div>
            </cds-tile>
          </div>
          <div *ngIf="regulators.length === 0" class="empty-state">
            <i class=" empty-icon"></i>
            <p>{{ i18n.translate('common.loading') }}</p>
          </div>
        </cds-tab>

        <!-- Sectors -->
        <cds-tab [header]="i18n.translate('registry.sectors')">
          <div class="cards-grid">
            <cds-tile *ngFor="let s of sectors" styleClass="sector-card">
              <div class="sector-inner">
                <cds-tag [value]="s.code" severity="warning" styleClass="sector-code-tag" />
                <h3 class="sector-name">{{ i18n.getBilingualField(s, 'name_') || s.name_en }}</h3>
                <div class="sector-meta" *ngIf="s.applicable_frameworks?.length">
                  <i class=""></i>
                  <span>{{ s.applicable_frameworks.length }} frameworks</span>
                  <cds-tag [value]="'' + s.applicable_frameworks.length" severity="info" />
                </div>
              </div>
            </cds-tile>
          </div>
          <div *ngIf="sectors.length === 0" class="empty-state">
            <i class=" empty-icon"></i>
            <p>{{ i18n.translate('common.loading') }}</p>
          </div>
        </cds-tab>

        <!-- Framework Hierarchy -->
        <cds-tab [header]="i18n.translate('registry.hierarchy')">
          <div class="hierarchy-toolbar">
            <input pInputText [(ngModel)]="hierarchyFrameworkId"
                   placeholder="Framework ID (e.g. NCA-ECC)" aria-label="Framework ID (e.g. NCA-ECC)"
                   style="max-width: 300px" />
            <button cdsButton [label]="i18n.translate('registry.loadHierarchy')"
                      icon=""
                      (onClick)="loadHierarchy()"
                      [disabled]="!hierarchyFrameworkId" />
          </div>

          <cds-tile *ngIf="hierarchy" styleClass="hierarchy-card">
            <h3 class="hierarchy-title">
              <i class=""></i>
              {{ hierarchy.framework?.name_en || hierarchyFrameworkId }}
            </h3>
            <div *ngFor="let domain of hierarchy.domains || []" class="tree-node">
              <div tabindex="0" role="button" (keyup.enter)="domain._open = !domain._open" class="tree-domain" (click)="domain._open = !domain._open">
                <i class="pi tree-toggle" [ngClass]="domain._open ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
                <span class="domain-code">{{ domain.code }}</span>
                <span class="domain-title">{{ i18n.getBilingualField(domain, 'title_') || domain.title_en }}</span>
              </div>
              <div *ngIf="domain._open" class="tree-children">
                <div *ngFor="let sub of domain.children || []" class="tree-sub">
                  <span class="sub-code">{{ sub.code }}</span>
                  <span class="sub-title">{{ i18n.getBilingualField(sub, 'title_') || sub.title_en }}</span>
                  <cds-tag *ngIf="sub.children?.length"
                           [value]="sub.children.length + ' controls'"
                           severity="info"
                           styleClass="control-badge" />
                </div>
              </div>
            </div>
          </cds-tile>

          <div *ngIf="!hierarchy && tabIndex === 2" class="empty-state">
            <i class=" empty-icon"></i>
            <p>{{ i18n.translate('registry.enterFramework') }}</p>
          </div>
        </cds-tab>
      </cds-tabs>
    </app-page-shell>
  `,
    styles: [`
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-md);
    }

    /* Regulator cards */
    .reg-inner {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }
    .reg-name {
      font-size: var(--font-size-md);
      font-weight: 600;
      margin: 0;
      color: var(--text);
    }
    .reg-desc {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin: 0;
    }
    .reg-meta {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      padding-top: var(--space-sm);
      border-top: 1px solid var(--border);
    }
    .reg-meta i {
      color: var(--primary);
    }

    /* Sector cards */
    .sector-inner {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }
    .sector-name {
      font-size: var(--font-size-md);
      font-weight: 600;
      margin: 0;
      color: var(--text);
    }
    .sector-meta {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      padding-top: var(--space-sm);
      border-top: 1px solid var(--border);
    }
    .sector-meta i {
      color: var(--primary);
    }

    /* Hierarchy */
    .hierarchy-toolbar {
      display: flex;
      gap: var(--space-sm);
      align-items: center;
      margin-bottom: var(--space-md);
    }
    .hierarchy-title {
      font-size: var(--font-size-lg);
      font-weight: 600;
      margin: 0 0 var(--space-md);
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      color: var(--text);
    }
    .hierarchy-title i {
      color: var(--primary);
    }
    .tree-node {
      margin-bottom: 4px;
    }
    .tree-domain {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: 10px 12px;
      background: var(--bg);
      border-radius: var(--radius);
      cursor: pointer;
      font-size: var(--font-size-base);
      margin-bottom: 4px;
      transition: background 0.15s;
    }
    .tree-domain:hover {
      background: var(--surface);
    }
    .tree-toggle {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      width: 16px;
    }
    .domain-code {
      font-weight: 700;
      color: var(--primary);
    }
    .domain-title {
      color: var(--text);
    }
    .tree-children {
      padding-inline-start: var(--space-lg);
    }
    .tree-sub {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: 6px 12px;
      font-size: var(--font-size-sm);
      border-inline-start: 2px solid var(--border);
      margin-bottom: 2px;
    }
    .sub-code {
      font-weight: 600;
      color: var(--primary);
    }
    .sub-title {
      color: var(--text);
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: var(--space-2xl);
      color: var(--text-muted);
    }
    .empty-icon {
      font-size: var(--font-size-6xl);
      margin-bottom: var(--space-md);
      display: block;
    }
  `]
})
export class RegistryComponent implements OnInit {
  private messageService = inject(MessageService);

  private cdr = inject(ChangeDetectorRef);
  tabIndex = 0;
  loading = true;
  regulators: GrcRecord[] = [];
  sectors: GrcRecord[] = [];
  hierarchy: GrcRecord | null = null;
  hierarchyFrameworkId = '';

  constructor(public i18n: I18nService, private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void { this.loadRegulators(); }

  onTabChange(event: GrcRecord): void {
    if (event.index === 1 && this.sectors.length === 0) {
      this.loadSectors();
    }
  }

  loadRegulators(): void {
    this.loading = true;
    this.complianceSvc.getRegulators().subscribe({
      next: (r: any) => { this.regulators = r.regulators || r || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => {
        this.loading = false; this.cdr.markForCheck();
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadRegulators'), life: 4000 });
      }
    });
  }

  loadSectors(): void {
    this.complianceSvc.getSectors().subscribe({
      next: (r: any) => this.sectors = r.sectors || r || [],
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadSectors'), life: 4000 })
    });
  }

  loadHierarchy(): void {
    if (!this.hierarchyFrameworkId) return;
    this.complianceSvc.getFrameworkHierarchy(this.hierarchyFrameworkId).subscribe({
      next: (r) => this.hierarchy = r,
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadHierarchy'), life: 4000 })
    });
  }

  selectRegulator(r: GrcRecord): void {
    // Could navigate to detail view in future
  }

}
