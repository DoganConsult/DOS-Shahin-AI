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
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { CardModule } from 'primeng/card';
import { GrcRecord } from '@app/core/models/shared.types';

interface TriggerConfigEntry {
  moduleCode: string;
  rule: { enabled: boolean; threshold_field: string; threshold_value: number | string; threshold_operator: string; template_key: string; description?: string } | null;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-automation-rules-tab',
    imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, DropdownModule, InputSwitchModule, CardModule],
    styles: [`
    .rules-container{padding:20px 28px}
    .section-title{font-size:var(--font-size-lg);font-weight:600;margin-bottom:16px;color:var(--text-heading,#111)}
    .trigger-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;margin-bottom:24px}
    .trigger-card{border:1px solid var(--surface-border);border-radius:var(--radius);padding:14px;background:var(--surface-card)}
    .trigger-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .trigger-module{font-weight:600;text-transform:capitalize}
    .trigger-detail{font-size:var(--font-size-sm);color:var(--text-muted)}
  `],
    template: `
    <div class="rules-container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 class="section-title" style="margin:0">{{ i18n.currentLang()==='ar' ? 'قواعد الأتمتة' : 'Automation Rules' }}</h2>
        <button pButton size="small" icon="pi pi-refresh" [label]="i18n.currentLang()==='ar' ? 'تحديث' : 'Refresh'" (click)="load()" class="p-button-outlined"></button>
      </div>

      <h3 class="section-title" style="font-size:var(--font-size-base)">{{ i18n.currentLang()==='ar' ? 'مشغلات الوحدات' : 'Module Triggers' }}</h3>
      <div class="trigger-grid">
        @for (m of triggerConfigs(); track m.moduleCode) {
          <div class="trigger-card">
            <div class="trigger-header">
              <span class="trigger-module">{{m.moduleCode}}</span>
              <p-tag [value]="m.rule?.enabled ? 'Enabled' : 'Disabled'" [severity]="m.rule?.enabled ? 'success' : 'warning'" />
            </div>
            @if (m.rule) {
              <div class="trigger-detail">{{m.rule.description || m.rule.threshold_field + ' ' + m.rule.threshold_operator + ' ' + m.rule.threshold_value}}</div>
              <div class="trigger-detail" style="margin-top:4px">Template: <code>{{m.rule.template_key}}</code></div>
            } @else {
              <div class="trigger-detail">No trigger configured</div>
            }
          </div>
        }
      </div>

      <h3 class="section-title" style="font-size:var(--font-size-base)">{{ i18n.currentLang()==='ar' ? 'قواعد الأتمتة' : 'Automation Rules' }}</h3>
      <p-table [value]="rules()" [rows]="10" [paginator]="rules().length > 10" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.currentLang()==='ar' ? 'الوحدة' : 'Module' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'الرمز' : 'Rule Code' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'الحدث' : 'Trigger Event' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'الإجراء' : 'Action' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'مفعّل' : 'Enabled' }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td>{{r.module_code}}</td>
            <td><code>{{r.rule_code}}</code></td>
            <td>{{r.trigger_event}}</td>
            <td><p-tag [value]="r.action_type" /></td>
            <td><p-tag [value]="r.enabled ? 'Yes' : 'No'" [severity]="r.enabled ? 'success' : 'warning'" /></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">{{ i18n.currentLang()==='ar' ? 'لا توجد قواعد' : 'No automation rules configured' }}</td></tr></ng-template>
      </p-table>

      <h3 class="section-title" style="font-size:var(--font-size-base);margin-top:24px">{{ i18n.currentLang()==='ar' ? 'دورات الحياة' : 'Module Lifecycles' }}</h3>
      <p-table [value]="lifecycles()" [rows]="15" [paginator]="lifecycles().length > 15" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.currentLang()==='ar' ? 'الوحدة' : 'Module' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'الحالات' : 'Statuses' }}</th>
            <th>{{ i18n.currentLang()==='ar' ? 'الانتقالات' : 'Transitions' }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-lc>
          <tr>
            <td style="font-weight:600;text-transform:capitalize">{{lc.module}}</td>
            <td>
              @for (t of lc.transitions; track $index) {
                <span style="font-size:var(--font-size-xs);margin-right:4px"><code>{{t.from}}→{{t.to}}</code></span>
              }
            </td>
            <td>{{lc.transitions.length}}</td>
          </tr>
        </ng-template>
      </p-table>
    </div>`
})
export class AutomationRulesTabComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  triggerConfigs = signal<TriggerConfigEntry[]>([]);
  rules = signal<GrcRecord[]>([]);
  lifecycles = signal<GrcRecord[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any>(`${this.api}/automation-admin/trigger-config`).subscribe({
      next: r => {
        const modules: string[] = r.supportedModules || [];
        const configs: TriggerConfigEntry[] = modules.map(m => ({
          moduleCode: m,
          rule: r.config?.module_triggers?.[m] || r.defaults?.[m] || null,
        }));
        this.triggerConfigs.set(configs);
      },
      error: () => this.triggerConfigs.set([]),
    });

    this.http.get<any>(`${this.api}/automation-admin/automation-rules`).subscribe({
      next: r => this.rules.set(r.rules || []),
      error: () => this.rules.set([]),
    });

    this.http.get<any>(`${this.api}/automation-admin/lifecycles`).subscribe({
      next: r => {
        const all = r.lifecycles || {};
        this.lifecycles.set(Object.entries(all).map(([module, transitions]) => ({ module, transitions })));
      },
      error: () => this.lifecycles.set([]),
    });
  }
}
