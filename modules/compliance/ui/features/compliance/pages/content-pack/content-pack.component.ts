import { inject, Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { GrcOperationsService } from '@app/api';
import { ButtonModule, DialogModule, DropdownModule, ModalModule, ProgressIndicatorModule, TableModule, TagModule, TilesModule, TooltipModule, UIShellModule } from 'carbon-components-angular';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-content-pack',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, TilesModule, TagModule, ButtonModule, UIShellModule, DialogModule, TableModule, DropdownModule, ProgressIndicatorModule, ModalModule, TooltipModule],
    providers: [],
    template: `
    <app-page-shell icon="box" [title]="'Content Packs'"
      [subtitle]="'Install and manage pre-built compliance content packs'"
      [breadcrumbs]="['Dashboard', 'Content Packs']" [loading]="loading">

      <!-- KPI Row -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-icon-wrap"><i class=""></i></div>
          <div>
            <div class="kpi-value">{{ packs.length }}</div>
            <div class="kpi-label">Total Packs</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap green"><i class=""></i></div>
          <div>
            <div class="kpi-value">{{ installedCount() }}</div>
            <div class="kpi-label">Installed</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap blue"><i class=""></i></div>
          <div>
            <div class="kpi-value">{{ availableCount() }}</div>
            <div class="kpi-label">Available</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap orange"><i class=""></i></div>
          <div>
            <div class="kpi-value">{{ updateCount() }}</div>
            <div class="kpi-label">Updates</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap purple"><i class=""></i></div>
          <div>
            <div class="kpi-value">{{ totalControls() }}</div>
            <div class="kpi-label">Controls</div>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <section cdsToolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <button cdsButton label="Check Updates" icon="" [outlined]="true" (onClick)="checkUpdates()" />
        </ng-template>
        <ng-template pTemplate="end">
          <cds-dropdown [options]="filterOptions" [(ngModel)]="filterStatus" placeholder="All Packs" [showClear]="true" />
        </ng-template>
      </section>

      <!-- Pack Cards -->
      <div class="pack-grid">
        @for (p of filteredPacks(); track p.pack_id || p.name) {
          <div class="pack-card" [class.installed]="p.installed" [class.update-available]="p.update_available">
            <div class="pack-header">
              <div class="pack-title">
                <i class="pi" [ngClass]="packIcon(p.category)"></i>
                <h3>{{ p.name || p.pack_id }}</h3>
              </div>
              <cds-tag [value]="'v' + (p.version || '1.0')" severity="info" />
            </div>
            <p class="pack-desc">{{ p.description || 'Compliance content pack' }}</p>

            <!-- Pack Stats -->
            <div class="pack-stats">
              <div class="stat">
                <span class="stat-value">{{ p.controls_count || 0 }}</span>
                <span class="stat-label">Controls</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ p.policies_count || 0 }}</span>
                <span class="stat-label">Policies</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ p.frameworks_count || 0 }}</span>
                <span class="stat-label">Frameworks</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ p.evidence_count || p.templates_count || 0 }}</span>
                <span class="stat-label">Templates</span>
              </div>
            </div>

            <!-- Tags -->
            <div class="pack-tags">
              <cds-tag *ngIf="p.category" [value]="p.category" />
              <cds-tag *ngIf="p.region" [value]="p.region" severity="info" />
              <cds-tag [value]="p.installed ? 'Installed' : 'Available'" [severity]="p.installed ? 'success' : 'warning'" />
              <cds-tag *ngIf="p.update_available" value="Update Available" severity="danger" />
            </div>

            <!-- Actions -->
            <div class="pack-actions">
              @if (!p.installed) {
                <button cdsButton label="Install" icon="" size="small" (onClick)="install(p)" [loading]="p._installing" />
              } @else {
                <button cdsButton label="View" icon="" size="small" [outlined]="true" (onClick)="viewPack(p)" />
                @if (p.update_available) {
                  <button cdsButton label="Upgrade" icon="" size="small" severity="warning" (onClick)="upgrade(p)" [loading]="p._upgrading" />
                }
                <button cdsButton icon="" [text]="true" size="small" severity="danger" (onClick)="rollback(p)" [cdsTooltip]="Rollback" />
              }
            </div>
          </div>
        }
      </div>

      @if (packs.length === 0 && !loading) {
        <div class="empty-state">
          <i class=" empty-icon"></i>
          <p>No content packs available</p>
        </div>
      }

      <!-- Pack Detail Dialog -->
      <cds-modal header="Pack Details" [(visible)]="showDetail" [modal]="true" [style]="{ width: '600px' }">
        @if (selectedPack) {
          <div class="detail-content">
            <h3>{{ selectedPack.name }}</h3>
            <p>{{ selectedPack.description }}</p>
            <div class="detail-meta">
              <span><strong>Version:</strong> {{ selectedPack.version }}</span>
              <span><strong>Category:</strong> {{ selectedPack.category || '—' }}</span>
              <span><strong>Region:</strong> {{ selectedPack.region || 'Global' }}</span>
              <span><strong>Installed:</strong> {{ selectedPack.installed_at | appDate:'medium' }}</span>
            </div>
            @if (selectedPack.included_items?.length) {
              <h4>Included Items</h4>
              <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="selectedPack.included_items" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr><th>Type</th><th>Name</th><th>Status</th></tr>
                </ng-template>
                <ng-template pTemplate="body" let-item>
                  <tr>
                    <td><cds-tag [value]="item.type" /></td>
                    <td>{{ item.name }}</td>
                    <td><cds-tag [value]="item.status || 'active'" severity="success" /></td>
                  </tr>
                </ng-template>
              </table>
            }
            @if (selectedPack.changelog) {
              <h4>Changelog</h4>
              <div class="changelog">{{ selectedPack.changelog }}</div>
            }
          </div>
        }
      </cds-modal>
    </app-page-shell>
    <cds-modal></cds-modal>
  `,
    styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: var(--radius-lg); background: var(--bg-1, var(--surface-ice)); border: 1px solid var(--border, var(--border-subtle)); }
    .kpi-icon-wrap { width: 42px; height: 42px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; background: var(--primary-light, #eff6ff); color: var(--primary, #2563eb); font-size: var(--font-size-xl); }
    .kpi-icon-wrap.green { background: var(--status-success-bg, #defbe6); color: var(--success); }
    .kpi-icon-wrap.blue { background: #eff6ff; color: var(--primary); }
    .kpi-icon-wrap.orange { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .kpi-icon-wrap.purple { background: var(--purple-50, #f5f3ff); color: #7c3aed; }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-0); }
    .kpi-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .mb-3 { margin-bottom: 16px; }
    .pack-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    .pack-card { padding: 20px; border-radius: var(--radius-lg); background: var(--bg-0, #fff); border: 1px solid var(--border, var(--border-subtle)); transition: all 200ms; }
    .pack-card:hover { border-color: var(--primary); box-shadow: var(--shadow-card); }
    .pack-card.installed { border-inline-start: 3px solid var(--success); }
    .pack-card.update-available { border-inline-start: 3px solid #ea580c; }
    .pack-header { display: flex; justify-content: space-between; align-items: center; }
    .pack-title { display: flex; align-items: center; gap: 8px; }
    .pack-title i { font-size: var(--font-size-lg); color: var(--primary); }
    .pack-title h3 { margin: 0; font-size: var(--font-size-base); font-weight: 700; }
    .pack-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin: 8px 0; line-height: 1.5; }
    .pack-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 12px 0; padding: 10px; background: var(--bg-1, var(--surface-ice)); border-radius: var(--radius); }
    .stat { text-align: center; }
    .stat-value { display: block; font-size: var(--font-size-md); font-weight: 700; color: var(--text-0); }
    .stat-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; }
    .pack-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .pack-actions { display: flex; gap: 6px; align-items: center; }
    .empty-state { text-align: center; padding: 48px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); display: block; margin-bottom: 12px; }
    .detail-content { display: flex; flex-direction: column; gap: 16px; }
    .detail-content h3 { margin: 0; font-size: var(--font-size-lg); }
    .detail-content h4 { margin: 8px 0 4px; font-size: var(--font-size-base); font-weight: 600; }
    .detail-meta { display: flex; flex-direction: column; gap: 6px; font-size: var(--font-size-sm); }
    .changelog { font-size: var(--font-size-sm); color: var(--text-muted); white-space: pre-line; padding: 12px; background: var(--bg-1); border-radius: var(--radius); }
  `]
})
export class ContentPackComponent implements OnInit {
  private confirmSvc = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);
  loading = false; packs: Record<string, any>[] = []; showDetail = false; selectedPack: Record<string, any> | null = null;
  filterStatus = '';
  filterOptions = [
    { label: 'Installed', value: 'installed' }, { label: 'Available', value: 'available' },
    { label: 'Has Updates', value: 'updates' },
  ];

  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  ngOnInit() {
    this.loading = true;
    this.operationsSvc.getInstalledPacks().subscribe({
      next: (d: Record<string, any>) => { this.packs = Array.isArray(d) ? d : d.packs || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  filteredPacks(): Record<string, any>[] {
    if (!this.filterStatus) return this.packs;
    if (this.filterStatus === 'installed') return this.packs.filter(p => p.installed);
    if (this.filterStatus === 'available') return this.packs.filter(p => !p.installed);
    if (this.filterStatus === 'updates') return this.packs.filter(p => p.update_available);
    return this.packs;
  }

  installedCount(): number { return this.packs.filter(p => p.installed).length; }
  availableCount(): number { return this.packs.filter(p => !p.installed).length; }
  updateCount(): number { return this.packs.filter(p => p.update_available).length; }
  totalControls(): number { return this.packs.reduce((s, p) => s + (p.controls_count || 0), 0); }

  install(p: Record<string, any>) {
    p._installing = true;
    this.operationsSvc.installContentPack(p as any).subscribe({
      next: () => { p._installing = false; this.ngOnInit(); },
      error: () => { p._installing = false; }
    });
  }

  upgrade(p: Record<string, any>) {
    p._upgrading = true;
    this.operationsSvc.upgradeContentPack(p.pack_id, p as any).subscribe({
      next: () => { p._upgrading = false; this.ngOnInit(); },
      error: () => { p._upgrading = false; }
    });
  }

  rollback(p: Record<string, any>) {
    this.confirmSvc.confirm({
      message: `Rollback ${p.name} to previous version?`,
      header: "Confirm",
      icon: "",
      acceptButtonStyleClass: "",
      accept: () => {
      this.operationsSvc.rollbackContentPack(p.pack_id, p.version).subscribe({ next: () => this.ngOnInit() });
      },
    });
  }

  viewPack(p: Record<string, any>) { this.selectedPack = p; this.showDetail = true; }
  checkUpdates() { this.ngOnInit(); }

  packIcon(category: string): string {
    const m: Record<string, string> = { compliance: 'pi-shield', risk: 'pi-exclamation-triangle', audit: 'pi-search', governance: 'pi-building', privacy: 'pi-lock' };
    return m[category] || 'pi-box';
  }
}
