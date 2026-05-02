import { Component, EventEmitter, OnInit, Output, inject, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SessionService } from '@app/dauth/session/session.service';
import { StorageService } from '@app/infrastructure';
import { BootstrapStore } from '@app/core/services/platform/bootstrap.store';

export interface Workspace {
  workspace_id: string;
  name: string;
  description: string;
  type: string;
  created_at: string;
}

const STORAGE_KEY = 'grc_active_workspace';

const TYPE_META: Record<string, { icon: string; labelEn: string; labelAr: string; color: string }> = {
  'enterprise_grc':  { icon: 'pi-briefcase',  labelEn: 'Enterprise', labelAr: 'مؤسسي',    color: '#0ea5e9' },
  'cybersecurity':   { icon: 'pi-lock',        labelEn: 'Cyber',      labelAr: 'أمن سيبراني', color: '#8b5cf6' },
  'privacy':         { icon: 'pi-eye-slash',   labelEn: 'Privacy',    labelAr: 'خصوصية',    color: '#f59e0b' },
  'it_governance':   { icon: 'pi-server',      labelEn: 'IT Gov',     labelAr: 'حوكمة تقنية', color: '#10b981' },
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workspace-switcher',
    imports: [CommonModule, FormsModule, DropdownModule, TooltipModule],
    template: `
    <!-- Single workspace: static label, no dropdown -->
    <div class="ws-wrap" *ngIf="workspaces.length <= 1"
         [pTooltip]="i18n.translate('workspace.workspace')" tooltipPosition="bottom">
      <div class="ws-static" *ngIf="workspaces.length === 1">
        <i class="pi" [ngClass]="typeMeta(workspaces[0].type).icon"
           [style.color]="typeMeta(workspaces[0].type).color"></i>
        <span class="ws-name">{{ workspaces[0].name }}</span>
        <span class="ws-type-badge" [style.background]="typeMeta(workspaces[0].type).color + '18'"
              [style.color]="typeMeta(workspaces[0].type).color">
          {{ i18n.localize(typeMeta(workspaces[0].type).labelEn, typeMeta(workspaces[0].type).labelAr) }}
        </span>
      </div>
      <div class="ws-empty" *ngIf="workspaces.length === 0">
        <i class="pi pi-inbox"></i>
        <span>{{ i18n.translate('workspace.noWorkspace') }}</span>
      </div>
    </div>

    <!-- Multiple workspaces: dropdown -->
    <div class="ws-wrap" *ngIf="workspaces.length > 1"
         [pTooltip]="i18n.translate('workspace.switchWorkspace')" tooltipPosition="bottom">
      <p-dropdown
        [options]="workspaces"
        [(ngModel)]="selectedWorkspaceId"
        optionLabel="name"
        optionValue="workspace_id"
        [placeholder]="i18n.translate('workspace.selectWorkspace')"
        (onChange)="onWorkspaceChange($event)"
        [style]="{'min-width': '160px', 'max-width': '220px'}"
        styleClass="ws-dropdown"
        appendTo="body">
        <ng-template pTemplate="selectedItem" let-item>
          <div class="ws-item" *ngIf="item">
            <i class="pi" [ngClass]="typeMeta(item.type).icon"
               [style.color]="typeMeta(item.type).color"></i>
            <span class="ws-item-name">{{ item.name }}</span>
          </div>
        </ng-template>
        <ng-template pTemplate="item" let-item>
          <div class="ws-item ws-item--option">
            <i class="pi" [ngClass]="typeMeta(item.type).icon"
               [style.color]="typeMeta(item.type).color"></i>
            <span class="ws-item-name">{{ item.name }}</span>
            <span class="ws-type-badge" [style.background]="typeMeta(item.type).color + '18'"
                  [style.color]="typeMeta(item.type).color">
              {{ i18n.localize(typeMeta(item.type).labelEn, typeMeta(item.type).labelAr) }}
            </span>
          </div>
        </ng-template>
      </p-dropdown>
    </div>
  `,
    styles: [`
    .ws-wrap { display: flex; align-items: center; }

    /* Static (single workspace) — Wave 1B: 32px-tall pill, soft, no harsh border */
    .ws-static {
      display: inline-flex; align-items: center; gap: 8px;
      height: 32px; padding: 0 12px;
      border-radius: 999px;
      font-size: 12.5px; font-weight: 600; line-height: 1;
      color: var(--shell-text-primary, #0f172a);
      background: rgba(15,23,42,0.04);
      border: 1px solid rgba(15,23,42,0.08);
      transition: background 120ms ease;
    }
    .ws-static:hover { background: rgba(15,23,42,0.07); }
    .ws-static .pi { font-size: 12px; opacity: 0.7; }
    .ws-name {
      max-width: 160px; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }

    /* Empty state */
    .ws-empty {
      display: inline-flex; align-items: center; gap: 6px;
      height: 32px; padding: 0 10px;
      font-size: 12px; color: var(--text-muted, #64748b);
    }

    /* Type badge */
    .ws-type-badge {
      font-size: var(--font-size-xs); font-weight: 700;
      padding: 1px 5px; border-radius: var(--radius-xs);
      white-space: nowrap; text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* Dropdown items */
    .ws-item {
      display: flex; align-items: center; gap: 6px;
    }
    .ws-item .pi { font-size: var(--font-size-sm); flex-shrink: 0; }
    .ws-item-name {
      font-size: var(--font-size-sm); font-weight: 500;
      white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; flex: 1;
      color: var(--text-body, #475569);
    }
    .ws-item--option {
      padding: 2px 0;
    }
    .ws-item--option .ws-type-badge { margin-inline-start: auto; }

    /* Light theme overrides for PrimeNG dropdown */
  `]
})
export class WorkspaceSwitcherComponent implements OnInit {
  @Output() workspaceChange = new EventEmitter<string>();

  workspaces: Workspace[] = [];
  selectedWorkspaceId: string | null = null;

  i18n = inject(I18nService);
  private auth = inject(SessionService);
  private _storage = inject(StorageService);
  private bootstrap = inject(BootstrapStore);

  typeMeta(type: string) {
    return TYPE_META[type] || TYPE_META['enterprise_grc'];
  }

  constructor() {
    // Refresh whenever bootstrap tenant becomes available.
    effect(() => {
      const t = this.bootstrap.tenant();
      if (t) this.loadWorkspaces();
    });
  }

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  onWorkspaceChange(event: { value: string }): void {
    if (!event.value) return;
    this.selectedWorkspaceId = event.value;
    this._storage.set(STORAGE_KEY, event.value);
    this.workspaceChange.emit(event.value);
  }

  /**
   * Workspace label uses real session/tenant truth. There is no
   * workspace-service yet, and `/api/workspaces` would 404 — never call it.
   * If bootstrap has a tenant, render that as the workspace; otherwise show
   * the Foundation default so the topbar is never blank for an authenticated
   * tenant.
   */
  private loadWorkspaces(): void {
    if (!this.auth.isLoggedIn()) {
      this.workspaces = [];
      return;
    }
    const tenant = this.bootstrap.tenant();
    const tenantId = tenant?.tenantId ?? this.auth.getTenantId() ?? 'foundation';
    const name = tenant?.name?.trim() || 'Foundation Workspace';
    this.workspaces = [{
      workspace_id: tenantId,
      name,
      description: 'Foundation workspace',
      type: 'enterprise_grc',
      created_at: '',
    }];
    this.restoreSelection();
  }

  private restoreSelection(): void {
    const stored = this._storage.get(STORAGE_KEY);
    const match = this.workspaces.find(w => w.workspace_id === stored);
    if (match) {
      this.selectedWorkspaceId = match.workspace_id;
    } else if (this.workspaces.length > 0) {
      const preferred = this.workspaces.find(w => w.name !== 'Enterprise GRC') || this.workspaces[0];
      this.selectedWorkspaceId = preferred.workspace_id;
      this._storage.set(STORAGE_KEY, this.selectedWorkspaceId);
    }
    if (this.selectedWorkspaceId) {
      this.workspaceChange.emit(this.selectedWorkspaceId);
    }
  }
}
