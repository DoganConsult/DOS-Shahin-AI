import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

interface LifecycleTransition {
  from: string;
  to: string;
  requiredPermission?: string;
  requiresApproval?: boolean;
}

interface LifecycleModule {
  module: string;
  statuses: string[];
  initialStatus: string;
  terminalStatuses: string[];
  transitions: LifecycleTransition[];
}

function asRecord(value: unknown): GrcRecord {
  return value && typeof value === 'object' ? (value as GrcRecord) : {};
}

function asRecordArray(value: unknown): GrcRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is GrcRecord => !!item && typeof item === 'object')
    : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => asString(item)).filter(Boolean) : [];
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asTransitions(value: unknown): LifecycleTransition[] {
  return asRecordArray(value)
    .map((item) => ({
      from: asString(item['from']),
      to: asString(item['to']),
      requiredPermission: asString(item['requiredPermission']) || undefined,
      requiresApproval: asBoolean(item['requiresApproval']),
    }))
    .filter((transition) => !!transition.from && !!transition.to);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-lifecycle-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, DialogModule, DropdownModule, CardModule, ToastModule, AppDatePipe],
  providers: [MessageService],
  styles: [`
    .lifecycle-container{padding:20px 28px}
    .section-title{font-size:var(--font-size-lg);font-weight:600;margin-bottom:16px;color:var(--text-heading,#111)}
    .module-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-bottom:24px}
    .module-card{border:1px solid var(--surface-border);border-radius:var(--radius);padding:14px;background:var(--surface-card);cursor:pointer;transition:box-shadow .15s}
    .module-card:hover{box-shadow:0 2px 8px rgba(var(--color-black-rgb), .08)}
    .module-card.selected{border-color:var(--primary-500);box-shadow:0 0 0 2px var(--primary-100)}
    .module-name{font-weight:600;text-transform:capitalize;font-size:var(--font-size-base);margin-bottom:6px}
    .module-stats{display:flex;gap:12px;font-size:var(--font-size-sm);color:var(--text-muted)}
    .transition-flow{display:flex;align-items:center;gap:6px;padding:6px 10px;border-left:3px solid var(--primary-300);margin-bottom:4px;background:var(--surface-50);font-size:var(--font-size-sm)}
    .transition-arrow{color:var(--primary-500);font-weight:700}
    .status-chips{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}
  `],
  template: `
    <p-toast />
    <div class="lifecycle-container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 class="section-title" style="margin:0">{{ i18n.currentLang()==='ar' ? 'دورة حياة الوحدات' : 'Module Lifecycles' }}</h2>
        <button pButton size="small" icon="pi pi-refresh" [label]="i18n.currentLang()==='ar' ? 'تحديث' : 'Refresh'" (click)="load()" class="p-button-outlined"></button>
      </div>

      <div class="module-grid">
        @for (m of modules(); track m.module) {
          <div class="module-card" [class.selected]="selectedModule()===m.module" (click)="selectModule(m)">
            <div class="module-name">{{m.module}}</div>
            <div class="module-stats">
              <span>{{m.statuses?.length || m.transitions.length}} statuses</span>
              <span>{{m.transitions.length}} transitions</span>
            </div>
          </div>
        }
      </div>

      @if (selectedModuleData(); as m) {
        <p-card [header]="m.module + ' Lifecycle'">
          @if (m.statuses?.length) {
            <h4 style="margin-top:0">{{ i18n.currentLang()==='ar' ? 'الحالات' : 'Statuses' }}</h4>
            <div class="status-chips">
              @for (s of m.statuses; track s) {
                <p-tag [value]="s" [severity]="m.terminalStatuses?.includes(s) ? 'danger' : s === m.initialStatus ? 'success' : 'info'" />
              }
            </div>
          }
          <h4>{{ i18n.currentLang()==='ar' ? 'الانتقالات' : 'Transitions' }}</h4>
          @for (t of m.transitions; track $index) {
            <div class="transition-flow">
              <code>{{t.from}}</code>
              <span class="transition-arrow">→</span>
              <code>{{t.to}}</code>
              @if (t.requiresApproval) { <p-tag value="Approval" severity="warning" /> }
              @if (t.requiredPermission) { <span style="color:var(--text-muted);font-size:var(--font-size-xs)">{{t.requiredPermission}}</span> }
            </div>
          }
        </p-card>
      }

      <h3 class="section-title" style="margin-top:24px">{{ i18n.currentLang()==='ar' ? 'سجل الانتقالات الأخيرة' : 'Recent Transition Log' }}</h3>
      <p-table [value]="recentLog()" [rows]="15" [paginator]="recentLog().length > 15" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.currentLang()==='ar' ? 'الوحدة' : 'Module' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'الكيان' : 'Entity' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'من' : 'From' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'إلى' : 'To' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'بواسطة' : 'By' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'التاريخ' : 'Date' }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-entry>
          <tr>
            <td style="text-transform:capitalize">{{entry.module_code}}</td>
            <td><code>{{entry.entity_id | slice:0:8}}</code></td>
            <td><p-tag [value]="entry.previous_status" severity="warning" /></td>
            <td><p-tag [value]="entry.new_status" severity="success" /></td>
            <td>{{entry.transitioned_by | slice:0:8}}</td>
            <td>{{entry.transitioned_at | appDate}}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">{{ i18n.currentLang()==='ar' ? 'لا توجد سجلات' : 'No transition log entries' }}</td></tr></ng-template>
      </p-table>
    </div>`
})
export class LifecycleTabComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private msg = inject(MessageService);
  private api = environment.apiUrl;

  modules = signal<LifecycleModule[]>([]);
  selectedModule = signal<string | null>(null);
  selectedModuleData = signal<LifecycleModule | null>(null);
  recentLog = signal<GrcRecord[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.http.get<unknown>(`${this.api}/automation-admin/lifecycles`).subscribe({
      next: (response) => {
        const payload = asRecord(response);
        const all = asRecord(payload['lifecycles']);
        const mods: LifecycleModule[] = Object.entries(all).map(([module, rawTransitions]) => {
          const transitions = asTransitions(rawTransitions);
          const statuses = [...new Set(transitions.flatMap((transition) => [transition.from, transition.to]))];
          return {
            module,
            statuses,
            initialStatus: transitions[0]?.from || 'draft',
            terminalStatuses: [],
            transitions,
          };
        });
        this.modules.set(mods);
        if (mods.length && !this.selectedModule()) this.selectModule(mods[0]);
      },
      error: (err) => {
        devError('[Lifecycle] Failed to load lifecycles', err);
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoad') || 'Failed to load lifecycles', life: 4000 });
        this.modules.set([]);
      },
    });

    this.loadRecentLog();
  }

  selectModule(m: LifecycleModule) {
    this.selectedModule.set(m.module);
    this.http.get<unknown>(`${this.api}/automation-admin/lifecycle/${m.module}`).subscribe({
      next: (response) => {
        const payload = asRecord(response);
        if (payload['hasLifecycle'] === false) {
          this.selectedModuleData.set(m);
          return;
        }

        const transitions = asTransitions(payload['transitions']);
        this.selectedModuleData.set({
          module: asString(payload['moduleCode'], m.module),
          statuses: asStringArray(payload['statuses']).length ? asStringArray(payload['statuses']) : m.statuses,
          initialStatus: asString(payload['initialStatus'], m.initialStatus),
          terminalStatuses: asStringArray(payload['terminalStatuses']),
          transitions: transitions.length ? transitions : m.transitions,
        });
      },
      error: (err) => {
        devError('[Lifecycle] Failed to load module lifecycle details', err);
        this.selectedModuleData.set(m);
      },
    });
  }

  loadRecentLog() {
    this.http.get<{ logs: GrcRecord[] }>(`${this.api}/module-lifecycle/recent-log?limit=25`).subscribe({
      next: (r) => {
        this.recentLog.set(Array.isArray(r.logs) ? r.logs : []);
      },
      error: (err) => {
        devError('[Lifecycle] Failed to load recent-log; falling back to chains', err);
        this.http.get<unknown>(`${this.api}/module-lifecycle/chains`).subscribe({
          next: (response) => {
            const payload = asRecord(response);
            this.recentLog.set(asRecordArray(payload['entries']));
          },
          error: () => this.recentLog.set([]),
        });
      },
    });
  }
}
