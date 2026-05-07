import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { DropdownModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';
import {
  PlatformDef, ConnectorTypeDef,
  CONNECTOR_TYPES, SCHEDULE_PRESETS,
} from '@app/shared/models/connector-types';
import { GrcOperationsService } from '@app/api';

// ── Catalog entry (built from DB registry or fallback) ────────────────────

interface CatalogEntry {
  id: string;
  category: string;
  name: string;
  icon: string;
  iconColor: string;
  description: string;
  setupTime: string;
  tags: string[];
  connectorType?: string;
  platformValue?: string;
  integrationType?: string;
  direction?: string;
  supportedObjects?: string[];
  producesGrcObjects?: string[];
}

const CATEGORIES = ['All', 'SIEM', 'IAM', 'ITSM', 'CMDB', 'Vulnerability', 'Cloud', 'ERP', 'Collaboration'];

// Category mapping from DB connector_category → UI category
const CATEGORY_MAP: Record<string, string> = {
  siem: 'SIEM', iam: 'IAM', itsm: 'ITSM', cmdb: 'CMDB',
  vulnerability: 'Vulnerability', cloud: 'Cloud', erp: 'ERP', collaboration: 'Collaboration',
};

// ZERO_LEGACY: no FALLBACK_CATALOG constant. The connector marketplace
// renders only rows emitted by /api/grc/connector-registry — itself a
// normalization of dos.integration_connector_catalog. Empty registry =>
// empty marketplace (NO FRONTEND INVENTION). Adding a new connector
// means adding a DB row, never a TypeScript constant.

/** Map a DB connector_registry row into a CatalogEntry */
function mapRegistryToCatalog(r: GrcRecord): CatalogEntry {
  // Each registry row may have multiple platforms — create one catalog entry per platform, or one per connector
  return {
    id: r.connectorCode,
    category: CATEGORY_MAP[r.connectorCategory] || r.connectorCategory,
    name: r.displayNameEn,
    icon: r.icon || 'pi-link',
    iconColor: r.iconColor || '#64748b',
    description: (r.supportedObjects || []).join(', ') || r.displayNameEn,
    setupTime: r.setupTime || '10 min',
    tags: r.tags || [],
    connectorType: r.connectorCode,
    direction: r.direction,
    supportedObjects: r.supportedObjects,
    producesGrcObjects: r.producesGrcObjects,
  };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-integration-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, TagModule, ButtonModule, DialogModule, PasswordModule, DropdownModule, ToastModule, TooltipModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <section class="marketplace">
      <header class="mp-header">
        <div>
          <h2>Integration Marketplace</h2>
          <p class="text-muted">Browse and install connectors for your GRC ecosystem</p>
        </div>
        <div class="search-wrap">
          <i class="pi pi-search"></i>
          <input pInputText [(ngModel)]="searchQuery" placeholder="Search integrations..." class="search-input" />
        </div>
      </header>
      <div class="category-bar">
        @for (cat of categories; track cat) {
          <button class="cat-btn" [class.active]="activeCategory() === cat" (click)="activeCategory.set(cat)">
            {{ cat }}<span class="cat-count" *ngIf="cat !== 'All'">{{ countByCategory(cat) }}</span>
          </button>
        }
      </div>
      <div class="catalog-grid">
        @for (entry of filteredCatalog(); track entry.id) {
          <div class="catalog-card" [class.installed]="isInstalled(entry)">
            <div class="card-top">
              <div class="card-icon" [style.background]="entry.iconColor + '14'" [style.color]="entry.iconColor"><i class="pi" [ngClass]="entry.icon"></i></div>
              <div class="card-info">
                <div class="card-name">{{ entry.name }}</div>
                <div class="card-meta">
                  <p-tag [value]="entry.category" [style]="{ fontSize: '10px' }" />
                  <p-tag *ngIf="entry.direction === 'bidirectional'" value="Bidirectional" severity="info" [style]="{ fontSize: '9px', marginLeft: '4px' }" />
                </div>
              </div>
              <div class="card-status" *ngIf="isInstalled(entry)">
                <span class="health-dot" [class]="getHealthClass(entry)" [pTooltip]="getHealthTooltip(entry)"></span>
                <p-tag value="Connected" severity="success" [style]="{ fontSize: '10px' }" />
              </div>
            </div>
            <p class="card-desc">{{ entry.description }}</p>
            <div class="card-health" *ngIf="getInstalledConnector(entry) as conn">
              <span class="health-stat" *ngIf="conn.last_success_at"><i class="pi pi-sync"></i> {{ timeAgo(conn.last_success_at) }}</span>
              <span class="health-stat" *ngIf="!conn.last_success_at"><i class="pi pi-clock"></i> Never synced</span>
              <span class="health-stat"><i class="pi pi-circle-fill" [style.color]="statusColor(conn)" style="font-size:8px"></i> {{ conn.status }}</span>
            </div>
            <div class="card-produces" *ngIf="entry.producesGrcObjects?.length">
              <span class="produces-label">Produces:</span>
              @for (obj of entry.producesGrcObjects!.slice(0, 3); track obj) { <span class="produce-chip">{{ obj }}</span> }
            </div>
            <div class="card-tags">@for (tag of entry.tags; track tag) { <span class="tag-chip">{{ tag }}</span> }</div>
            <div class="card-footer">
              <ng-container *ngIf="!isInstalled(entry)">
                <span class="setup-time"><i class="pi pi-clock"></i> {{ entry.setupTime }}</span>
                <p-button label="Install" icon="pi pi-download" size="small" [outlined]="true" (onClick)="openInstallDialog(entry)" />
              </ng-container>
              <ng-container *ngIf="isInstalled(entry)">
                <p-button icon="pi pi-sync" size="small" severity="secondary" [outlined]="true" pTooltip="Sync Now" tooltipPosition="top"
                  [loading]="syncingId() === getInstalledConnector(entry)?.connector_id" (onClick)="syncNow(entry)" />
                <p-button icon="pi pi-cog" size="small" severity="secondary" [outlined]="true" pTooltip="Configure" tooltipPosition="top" (onClick)="configure(entry)" />
                <p-button icon="pi pi-trash" size="small" severity="danger" [outlined]="true" pTooltip="Remove" tooltipPosition="top" (onClick)="removeConnector(entry)" />
              </ng-container>
            </div>
          </div>
        }
      </div>
      <div class="empty-catalog" *ngIf="filteredCatalog().length === 0">
        <i class="pi pi-search" style="font-size:48px;color:var(--text-muted)"></i>
        <p>No integrations match your search</p>
      </div>
    </section>

    <p-dialog [header]="'Install ' + (installEntry?.name || '')" [(visible)]="showInstallDialog" [modal]="true" [draggable]="false" [resizable]="false" [style]="{ width: '520px' }">
      <div class="install-form" *ngIf="installPlatform">
        <div class="form-section">
          <label class="section-label">Connection Credentials</label>
          @for (field of installPlatform.fields; track field.key) {
            <div class="field-row">
              <label class="field-label">{{ field.label }}<span class="req" *ngIf="field.required">*</span></label>
              <input *ngIf="field.type !== 'password'" pInputText [(ngModel)]="installCredentials[field.key]" [placeholder]="field.placeholder || ''" class="field-input" />
              <p-password *ngIf="field.type === 'password'" [(ngModel)]="installCredentials[field.key]" [placeholder]="field.placeholder || ''" [feedback]="false" [toggleMask]="true" styleClass="field-input w-full" inputStyleClass="w-full" />
            </div>
          }
        </div>
        <div class="test-section">
          <p-button label="Test Connection" icon="pi pi-bolt" size="small" severity="secondary" [outlined]="true" [loading]="installTesting" (onClick)="testConnection()" />
          <span class="test-ok" *ngIf="installTestResult?.valid"><i class="pi pi-check-circle"></i> Connected ({{ installTestResult!.latencyMs }}ms)</span>
          <span class="test-fail" *ngIf="installTestResult && !installTestResult!.valid"><i class="pi pi-times-circle"></i> {{ installTestResult!.error || 'Failed' }}</span>
        </div>
        <div class="form-section">
          <label class="section-label">Sync Schedule</label>
          <p-dropdown [options]="schedulePresets" [(ngModel)]="installSchedule" optionLabel="label" optionValue="value" [style]="{ width: '100%' }" />
          <input *ngIf="installSchedule === 'custom'" pInputText [(ngModel)]="installCustomCron" placeholder="*/15 * * * *" class="field-input" style="margin-top:8px" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showInstallDialog = false" />
        <p-button label="Install Connector" icon="pi pi-check" [loading]="installCreating" [disabled]="!canInstall()" (onClick)="createConnector()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .marketplace { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .mp-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .mp-header h2 { font-size: var(--font-size-2xl); font-weight: 300; color: var(--text-heading); margin: 0; }
    .text-muted { color: var(--text-muted); margin: 4px 0 0; font-size: var(--font-size-sm); }
    .search-wrap { position: relative; } .search-wrap .pi-search { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: var(--font-size-sm); }
    .search-input { padding-left: 36px; width: 280px; }
    .category-bar { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 20px; border-bottom: 1px solid var(--surface-border, var(--border-subtle)); padding-bottom: 4px; }
    .cat-btn { padding: 8px 16px; border: none; background: transparent; color: var(--text-muted); font-size: var(--font-size-sm); cursor: pointer; border-bottom: 2px solid transparent; transition: all .15s; display: flex; align-items: center; gap: 6px; }
    .cat-btn:hover { color: var(--text-color); } .cat-btn.active { color: var(--primary, #2563eb); border-bottom-color: var(--primary, #2563eb); font-weight: 600; }
    .cat-count { background: var(--surface-100, var(--surface-ice)); padding: 1px 6px; border-radius: 10px; font-size: 10px; }
    .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .catalog-card { padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--surface-border, var(--border-subtle)); background: var(--surface-card, #fff); display: flex; flex-direction: column; transition: border-color .15s, box-shadow .15s; }
    .catalog-card:hover { border-color: var(--primary-300, #93c5fd); box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .catalog-card.installed { border-color: var(--green-200, #bbf7d0); }
    .card-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .card-icon { width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xl); flex-shrink: 0; }
    .card-info { flex: 1; min-width: 0; } .card-meta { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
    .card-name { font-weight: 700; font-size: var(--font-size-base); margin-bottom: 2px; }
    .card-status { flex-shrink: 0; display: flex; align-items: center; gap: 6px; }
    .health-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .health-dot.healthy { background: #22c55e; } .health-dot.degraded { background: #f59e0b; } .health-dot.failed { background: #ef4444; } .health-dot.any { background: #94a3b8; }
    .card-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin: 0 0 8px; flex: 1; }
    .card-health { display: flex; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
    .health-stat { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
    .card-produces { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
    .produces-label { font-size: 10px; color: var(--text-muted); font-weight: 600; }
    .produce-chip { font-size: 9px; padding: 1px 6px; border-radius: 8px; background: var(--primary-50, #eff6ff); color: var(--primary, #2563eb); }
    .card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
    .tag-chip { font-size: 10px; padding: 2px 8px; border-radius: 10px; background: var(--surface-100, var(--surface-ice)); color: var(--text-muted); }
    .card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--surface-border, var(--border-subtle)); gap: 8px; }
    .setup-time { font-size: var(--font-size-xs); color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
    .empty-catalog { text-align: center; padding: 48px; color: var(--text-muted); } .empty-catalog p { margin-top: 12px; }
    .install-form { display: flex; flex-direction: column; gap: 20px; }
    .form-section { display: flex; flex-direction: column; gap: 10px; }
    .section-label { font-weight: 600; font-size: var(--font-size-sm); color: var(--text-heading); }
    .field-row { display: flex; flex-direction: column; gap: 4px; }
    .field-label { font-size: var(--font-size-sm); color: var(--text-color); } .req { color: #ef4444; }
    .field-input { width: 100%; } .w-full { width: 100%; }
    .test-section { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px; background: var(--surface-50, var(--surface-ice)); border-radius: var(--radius-md); }
    .test-ok { font-size: var(--font-size-sm); color: #22c55e; display: flex; align-items: center; gap: 4px; }
    .test-fail { font-size: var(--font-size-sm); color: #ef4444; display: flex; align-items: center; gap: 4px; }
  `]
})
export class IntegrationMarketplaceComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private router = inject(Router);
  private msg = inject(MessageService);

  categories = CATEGORIES;
  catalog: CatalogEntry[] = [];
  searchQuery = '';
  activeCategory = signal('All');
  schedulePresets = SCHEDULE_PRESETS;
  registryLoaded = false;

  installedConnectors = signal<GrcRecord[]>([]);
  installedIntegrationTypes = signal<Set<string>>(new Set());
  syncingId = signal<string | null>(null);

  showInstallDialog = false;
  installEntry: CatalogEntry | null = null;
  installTypeDef: ConnectorTypeDef | null = null;
  installPlatform: PlatformDef | null = null;
  installCredentials: Record<string, string> = {};
  installSchedule = '';
  installCustomCron = '';
  installTesting = false;
  installTestResult: { valid: boolean; latencyMs: number; error?: string } | null = null;
  installCreating = false;

  filteredCatalog = computed(() => {
    let items = this.catalog;
    const cat = this.activeCategory();
    if (cat !== 'All') items = items.filter(e => e.category === cat);
    const q = this.searchQuery.toLowerCase().trim();
    if (q) items = items.filter(e => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.tags.some(t => t.includes(q)));
    return items;
  });

  ngOnInit(): void { this.loadAll(); }

  private loadAll(): void {
    forkJoin({
      connectors: this.operationsSvc.getConnectors(),
      configs: this.operationsSvc.getIntegrationConfigs(),
      registry: this.grc.getConnectorRegistry().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ connectors: c, configs: cfg, registry }) => {
        // Catalog is DB-driven only. Empty registry => empty marketplace.
        if (registry?.connectors?.length) {
          this.catalog = (registry.connectors as unknown[]).map(mapRegistryToCatalog);
          this.registryLoaded = true;
        } else {
          this.catalog = [];
        }

        const connArr = Array.isArray(c) ? c : (c?.connectors ?? []);
        const cfgArr = Array.isArray(cfg) ? cfg : (cfg?.configs ?? cfg?.data ?? []);
        this.installedConnectors.set(connArr);
        this.installedIntegrationTypes.set(new Set<string>(cfgArr.filter((x) => x.enabled).map((x) => x.type).filter(Boolean)));
      },
      error: () => { this.catalog = []; }
    });
  }

  countByCategory(cat: string): number { return this.catalog.filter(e => e.category === cat).length; }

  isInstalled(entry: CatalogEntry): boolean {
    if (entry.connectorType) return this.installedConnectors().some(c => c.source_system_type === entry.connectorType || c.platform === entry.platformValue);
    if (entry.integrationType) return this.installedIntegrationTypes().has(entry.integrationType);
    return false;
  }

  getInstalledConnector(entry: CatalogEntry): GrcRecord | undefined {
    if (!entry.connectorType) return undefined;
    return this.installedConnectors().find(c => c.source_system_type === entry.connectorType && (!entry.platformValue || c.platform === entry.platformValue))
      || this.installedConnectors().find(c => c.source_system_type === entry.connectorType);
  }

  getHealthClass(entry: CatalogEntry): string {
    const c = this.getInstalledConnector(entry);
    if (!c) return 'any';
    return c.failure_count === 0 ? 'healthy' : c.failure_count <= 2 ? 'degraded' : 'failed';
  }

  getHealthTooltip(entry: CatalogEntry): string {
    const c = this.getInstalledConnector(entry);
    if (!c) return '';
    return c.failure_count === 0 ? 'Healthy' : `${c.failure_count} failure(s)`;
  }

  statusColor(c: GrcRecord): string {
    return c.status === 'active' ? '#22c55e' : c.status === 'paused' ? '#f59e0b' : c.status === 'error' ? '#ef4444' : '#94a3b8';
  }

  timeAgo(d: string): string {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  openInstallDialog(entry: CatalogEntry): void {
    if (entry.integrationType) { this.router.navigate(['/integrations']); return; }
    const typeDef = CONNECTOR_TYPES.find(t => t.key === entry.connectorType);
    if (!typeDef) return;
    const platform = entry.platformValue ? typeDef.platforms.find(p => p.value === entry.platformValue) : typeDef.platforms[0];
    if (!platform) return;
    this.installEntry = entry; this.installTypeDef = typeDef; this.installPlatform = platform;
    this.installCredentials = {}; this.installSchedule = typeDef.defaultSchedule;
    this.installCustomCron = ''; this.installTestResult = null;
    this.installTesting = false; this.installCreating = false;
    this.showInstallDialog = true;
  }

  testConnection(): void {
    if (!this.installPlatform || !this.installEntry) return;
    this.installTesting = true; this.installTestResult = null;
    this.operationsSvc.testConnector({ sourceSystemType: this.installEntry.connectorType!, credentials: { ...this.installCredentials, platform: this.installPlatform.value }, platform: this.installPlatform.value }).subscribe({
      next: (r) => { this.installTestResult = r; this.installTesting = false; },
      error: (e) => { this.installTestResult = { valid: false, latencyMs: 0, error: e.error?.error || 'Failed' }; this.installTesting = false; }
    });
  }

  canInstall(): boolean {
    return !!this.installPlatform && this.installPlatform.fields.filter(f => f.required).every(f => !!this.installCredentials[f.key]?.trim());
  }

  createConnector(): void {
    if (!this.installEntry || !this.installPlatform) return;
    this.installCreating = true;
    const sched = this.installSchedule === 'custom' ? this.installCustomCron : this.installSchedule;
    this.operationsSvc.createConnector({ name: `${this.installEntry.name} Connector`, sourceSystemType: this.installEntry.connectorType!, authMethod: this.installPlatform.authMethod, credentials: { ...this.installCredentials, platform: this.installPlatform.value }, schedule: sched }).subscribe({
      next: () => { this.showInstallDialog = false; this.installCreating = false; this.msg.add({ severity: 'success', summary: 'Installed', detail: `${this.installEntry!.name} connector active.` }); this.loadAll(); },
      error: (e) => { this.installCreating = false; this.msg.add({ severity: 'error', summary: 'Failed', detail: e.error?.error || 'Could not create connector' }); }
    });
  }

  syncNow(entry: CatalogEntry): void {
    const c = this.getInstalledConnector(entry); if (!c) return;
    this.syncingId.set(c.connector_id);
    this.operationsSvc.runConnector(c.connector_id).subscribe({
      next: (r) => { this.syncingId.set(null); this.msg.add({ severity: 'success', summary: 'Synced', detail: `${r.recordsCollected ?? 0} records` }); this.loadAll(); },
      error: () => { this.syncingId.set(null); this.msg.add({ severity: 'error', summary: 'Sync Failed' }); }
    });
  }

  configure(entry: CatalogEntry): void {
    const c = this.getInstalledConnector(entry);
    this.router.navigate(['/connector-hub'], { queryParams: c ? { tab: 'manager', connectorId: c.connector_id } : { tab: 'manager' } });
  }

  removeConnector(entry: CatalogEntry): void {
    const c = this.getInstalledConnector(entry); if (!c) return;
    if (!confirm(`Remove ${entry.name} connector?`)) return;
    this.operationsSvc.deleteConnector(c.connector_id).subscribe({
      next: () => { this.msg.add({ severity: 'info', summary: 'Removed' }); this.loadAll(); },
      error: () => { this.msg.add({ severity: 'error', summary: 'Failed to remove' }); }
    });
  }
}
