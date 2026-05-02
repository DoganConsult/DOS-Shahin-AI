/**
 * Platform Configuration Admin — Enterprise Hierarchical Config Registry.
 *
 * Implements "Effective-Value Drill-Through" transparency. 
 * Allows setting values by scope, viewing resolution precedence, and tracking locks.
 */

import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { ApiClientService } from "@app/core/services/api-client.service";

interface ConfigDefinition {
  id: string;
  key: string;
  label: string;
  description: string;
  ownerDomain: string;
  category: string;
  valueType: string;
  allowedScopes: string[];
  defaultValue: any;
  isSecret: boolean;
  isLockable: boolean;
}

interface ResolutionPathNode {
  scopeType: string;
  scopeId: string;
  hit: boolean;
}

interface EffectiveConfigResult {
  key: string;
  effectiveValue: any;
  resolvedFromScopeType: string;
  resolvedFromScopeId: string;
  resolutionPath: ResolutionPathNode[];
  lockedBy?: {
    scopeType: string;
    scopeId: string;
  } | null;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    selector: 'app-platform-config',
    imports: [
        CommonModule, FormsModule, PageShellComponent,
        TableModule, TagModule, ButtonModule,
        TooltipModule, ToastModule, InputTextModule, SkeletonModule,
        DialogModule, DropdownModule
    ],
    providers: [MessageService],
    template: `
    <p-toast />
    <app-page-shell
      icon="sliders-h"
      [title]="i18n.translate('Hierarchical Configuration Registry')"
      [subtitle]="i18n.translate('Manage multi-tier deployment settings and overrides')"
      [breadcrumbs]="['Admin', 'Config Registry']"
      [loading]="loading()">

      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="i18n.translate('Refresh')"
                  (onClick)="loadDefinitions()" [disabled]="loading()" styleClass="p-button-outlined" />
      </div>

      <p-table aria-label="Hierarchical configurations" [value]="definitions()" [paginator]="true" [rows]="20"
               [showCurrentPageReport]="true" currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
               [rowHover]="true" styleClass="p-datatable-sm p-datatable-striped"
               [globalFilterFields]="['key', 'category', 'description']">
        <ng-template pTemplate="caption">
          <div class="flex justify-content-between align-items-center">
            <span class="text-sm font-semibold text-color-secondary"><i class="pi pi-shield mr-2"></i>Platform Governance Mode</span>
            <input pInputText type="text" (input)="filterTable($event)" placeholder="Search keys..."
                   class="p-inputtext-sm" style="width:250px" />
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="key" style="width:25%">Config Key <p-sortIcon field="key" /></th>
            <th pSortableColumn="category" style="width:15%">Category <p-sortIcon field="category" /></th>
            <th style="width:20%">Type & Security</th>
            <th style="width:30%">Description</th>
            <th style="width:10%" class="text-center">Action</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-def>
          <tr>
            <td class="font-semibold text-color">
              <code class="text-xs p-1 border-round surface-100">{{ def.key }}</code>
            </td>
            <td><p-tag [value]="def.category" severity="info"></p-tag></td>
            <td>
              <div class="flex gap-1">
                <p-tag [value]="def.valueType" severity="secondary"></p-tag>
                <p-tag *ngIf="def.isSecret" icon="pi pi-lock" severity="danger" value="Secret" pTooltip="HSM/Vault backed"></p-tag>
                <p-tag *ngIf="def.isLockable" icon="pi pi-lock-open" severity="warning" value="Lockable"></p-tag>
              </div>
            </td>
            <td class="text-sm text-color-secondary">{{ def.description || '-' }}</td>
            <td class="text-center">
              <p-button icon="pi pi-search" styleClass="p-button-sm p-button-rounded p-button-text" 
                        pTooltip="Drill-Through Resolution" (onClick)="openDrillThrough(def)"></p-button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="text-center text-color-secondary p-4">No enterprise configurations found</td></tr>
        </ng-template>
      </p-table>

    </app-page-shell>

    <!-- Effective-Value Drill-Through Dialog -->
    <p-dialog [header]="'Drill-Through: ' + selectedDef()?.key" 
              [(visible)]="drillThroughVisible" 
              [modal]="true" 
              [style]="{width: '600px'}"
              [draggable]="false" [resizable]="false">
      
      <div *ngIf="resolving()" class="p-4 flex justify-content-center">
        <i class="pi pi-spin pi-spinner text-3xl text-primary"></i>
      </div>

      <div *ngIf="!resolving() && resolutionResult()" class="flex flex-column gap-3">
        <!-- Effective Value Panel -->
        <div class="surface-ground p-3 border-round border-1 border-300">
          <div class="text-xs text-color-secondary uppercase font-bold mb-1">Current Effective Value</div>
          <div class="text-xl font-semibold mb-2">
            <span *ngIf="!selectedDef()?.isSecret">{{ stringify(resolutionResult()?.effectiveValue) }}</span>
            <span *ngIf="selectedDef()?.isSecret" class="text-pink-500"><i class="pi pi-lock"></i> ***REDACTED***</span>
          </div>
          <div class="flex align-items-center gap-2">
            <span class="text-sm">Resolved from:</span>
            <p-tag [severity]="resolutionResult()?.resolvedFromScopeType === 'default' ? 'secondary' : 'success'" 
                   [value]="resolutionResult()?.resolvedFromScopeType"></p-tag>
          </div>
        </div>

        <div *ngIf="resolutionResult()?.lockedBy" class="p-message p-message-error mb-0 p-2">
          Locked by Parent Scope! ({{ resolutionResult()?.lockedBy?.scopeType }} : {{ resolutionResult()?.lockedBy?.scopeId }})
        </div>

        <!-- Inheritance Path -->
        <div>
          <div class="text-xs text-color-secondary uppercase font-bold mb-2">Precedence & Inheritance Tree</div>
          <ul class="list-none p-0 m-0 border-left-2 border-300 ml-2">
            <li *ngFor="let step of resolutionResult()?.resolutionPath; let i = index" 
                class="pl-3 py-2 relative"
                [class.text-color-secondary]="!step.hit"
                [class.font-bold]="step.hit">
              
              <div class="absolute" style="left: -6px; top: 12px; width: 10px; height: 10px; border-radius: 50%"
                   [ngClass]="step.hit ? 'bg-primary' : 'bg-300'"></div>
              
              <div class="flex justify-content-between">
                <span>{{ step.scopeType | titlecase }} Scope</span>
                <span *ngIf="step.hit" class="text-xs bg-primary-reverse px-2 border-round">Override Match</span>
              </div>
              <div class="text-xs opacity-70 border-round font-mono mt-1" *ngIf="step.hit && step.scopeId">
                 ID: {{ step.scopeId }}
              </div>
            </li>
          </ul>
        </div>

        <!-- Override Form -->
        <div class="mt-3 p-3 surface-card border-round shadow-1">
          <div class="text-sm font-semibold mb-2">Set Manual Override</div>
          <div class="flex gap-2">
            <p-dropdown [options]="availableScopes" [(ngModel)]="overrideScope" placeholder="Select Scope" styleClass="w-max"></p-dropdown>
            <input pInputText [(ngModel)]="overrideValue" placeholder="New Value" [disabled]="resolutionResult()?.lockedBy != null" class="flex-1" />
            <p-button icon="pi pi-check" label="Save" (onClick)="saveOverride()" [loading]="saving()" [disabled]="!overrideValue || resolutionResult()?.lockedBy != null" size="small"></p-button>
          </div>
        </div>
      </div>
    </p-dialog>
  `,
    styles: [`
    :host { display: block; }
    code { font-family: var(--font-family-mono, monospace); }
  `]
})
export class PlatformConfigComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  readonly i18n = inject(I18nService);
  private readonly messageService = inject(MessageService);

  loading = signal(false);
  resolving = signal(false);
  saving = signal(false);
  
  definitions = signal<ConfigDefinition[]>([]);
  allDefinitions: ConfigDefinition[] = [];

  // Drill-through state
  drillThroughVisible = false;
  selectedDef = signal<ConfigDefinition | null>(null);
  resolutionResult = signal<EffectiveConfigResult | null>(null);

  availableScopes = [
    { label: 'Tenant', value: 'tenant' },
    { label: 'Platform', value: 'platform' },
    { label: 'Environment', value: 'environment' }
  ];
  overrideScope = 'tenant';
  overrideValue = '';

  ngOnInit(): void {
    this.loadDefinitions();
  }

  loadDefinitions(): void {
    this.loading.set(true);
    this.apiclientSvc.get('/platform/config/definitions').subscribe({
      next: (res: any) => {
        if (res.ok) {
          this.definitions.set(res.data);
          this.allDefinitions = res.data;
        }
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load config registry' }),
      complete: () => this.loading.set(false),
    });
  }

  openDrillThrough(def: ConfigDefinition): void {
    this.selectedDef.set(def);
    this.resolutionResult.set(null);
    this.overrideValue = '';
    this.drillThroughVisible = true;
    this.resolveEffectivePath(def.key);
  }

  resolveEffectivePath(key: string): void {
    this.resolving.set(true);
    // Use target "tenant" for demonstration. In a real scenario, the target scopeId comes from the active context.
    const targetScopeType = 'tenant';
    const targetScopeId = 'current_tenant';

    this.apiclientSvc.get(`/platform/config/resolve?key=${encodeURIComponent(key)}&scopeType=${targetScopeType}&scopeId=${targetScopeId}`).subscribe({
      next: (res: any) => {
        if (res.ok) {
          this.resolutionResult.set(res.data);
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Resolution failed' });
        this.drillThroughVisible = false;
      },
      complete: () => this.resolving.set(false)
    });
  }

  saveOverride(): void {
    const def = this.selectedDef();
    if (!def) return;

    this.saving.set(true);
    
    // Parse value smartly
    let valToSave: any = this.overrideValue;
    if (def.valueType === 'boolean') valToSave = this.overrideValue === 'true';
    if (def.valueType === 'number') valToSave = Number(this.overrideValue);

    const payload = {
      key: def.key,
      scopeType: this.overrideScope,
      scopeId: this.overrideScope === 'tenant' ? 'current_tenant' : 'default',
      value: valToSave
    };

    this.apiclientSvc.put('/platform/config/values', payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Override applied successfully' });
        this.overrideValue = '';
        this.resolveEffectivePath(def.key); // Refresh Drill-Through
      },
      error: (err: any) => {
        const errorDetail = err?.error?.details || err?.error?.error || 'Validation failed';
        this.messageService.add({ severity: 'error', summary: 'Save Error', detail: errorDetail });
      },
      complete: () => this.saving.set(false)
    });
  }

  filterTable(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) {
      this.definitions.set(this.allDefinitions);
      return;
    }
    const lower = value.toLowerCase();
    this.definitions.set(this.allDefinitions.filter(e =>
      e.key.toLowerCase().includes(lower) || 
      (e.description || '').toLowerCase().includes(lower) ||
      e.category.toLowerCase().includes(lower)
    ));
  }

  stringify(val: any): string {
    if (val === null || val === undefined) return '(none)';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }
}
