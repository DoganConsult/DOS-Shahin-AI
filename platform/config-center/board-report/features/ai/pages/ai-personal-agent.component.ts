import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-personal-agent',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, ToastModule, CardModule, TableModule, TagModule, TabViewModule, ButtonModule, ProgressBarModule, InputTextModule, DropdownModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="user-circle" [title]="i18n.isArabic() ? 'المساعد الذكي الشخصي' : 'Personal AI Assistant'" [subtitle]="i18n.isArabic() ? 'إعدادات الوكيل الشخصي وسجل المحادثات وضوابط الخصوصية' : 'Personal agent config, conversation history & privacy controls'" [breadcrumbs]="['Dashboard','AI','Personal Agent']" [loading]="loading()">
      <div class="grid" [dir]="i18n.direction()">
        <div class="col-12 lg:col-4">
          <p-card [header]="i18n.isArabic() ? 'إعدادات الوكيل' : 'Agent Configuration'">
            <div class="flex flex-column gap-3" *ngIf="config()">
              <div>
                <label class="font-semibold block mb-1">{{ i18n.isArabic() ? 'النموذج المفضل' : 'Preferred Model' }}</label>
                <p-dropdown [options]="modelOptions" [(ngModel)]="editConfig.preferred_model" optionLabel="label" optionValue="value" class="w-full" />
              </div>
              <div>
                <label class="font-semibold block mb-1">{{ i18n.isArabic() ? 'لغة الاستجابة' : 'Response Language' }}</label>
                <p-dropdown [options]="languageOptions" [(ngModel)]="editConfig.response_language" optionLabel="label" optionValue="value" class="w-full" />
              </div>
              <div>
                <label class="font-semibold block mb-1">{{ i18n.isArabic() ? 'نطاق الوكيل' : 'Agent Scope' }}</label>
                <p-dropdown [options]="scopeOptions" [(ngModel)]="editConfig.scope" optionLabel="label" optionValue="value" class="w-full" />
              </div>
              <div>
                <label class="font-semibold block mb-1">{{ i18n.isArabic() ? 'مستوى تفصيل الاستجابة' : 'Verbosity Level' }}</label>
                <p-dropdown [options]="verbosityOptions" [(ngModel)]="editConfig.verbosity" optionLabel="label" optionValue="value" class="w-full" />
              </div>
              <div>
                <label class="font-semibold block mb-1">{{ i18n.isArabic() ? 'الحد الأقصى للرموز' : 'Max Tokens' }}</label>
                <input pInputText type="number" [(ngModel)]="editConfig.max_tokens" class="w-full" />
              </div>
              <button pButton [label]="i18n.isArabic() ? 'حفظ الإعدادات' : 'Save Settings'" icon="pi pi-save" (click)="saveConfig()" [loading]="saving()"></button>
            </div>
            <p *ngIf="!config() && !loading()" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'لا توجد إعدادات' : 'No configuration found' }}</p>
          </p-card>

          <p-card [header]="i18n.isArabic() ? 'ضوابط الخصوصية' : 'Privacy Controls'" class="mt-3">
            <div class="flex flex-column gap-2" *ngIf="config()">
              <div class="flex justify-content-between align-items-center p-2 surface-100 border-round">
                <span class="text-sm">{{ i18n.isArabic() ? 'حفظ سجل المحادثات' : 'Persist Conversation History' }}</span>
                <p-tag [value]="config()!.privacy?.persist_history ? (i18n.isArabic() ? 'مُفعَّل' : 'Enabled') : (i18n.isArabic() ? 'معطَّل' : 'Disabled')" [severity]="config()!.privacy?.persist_history ? 'success' : 'danger'" />
              </div>
              <div class="flex justify-content-between align-items-center p-2 surface-100 border-round">
                <span class="text-sm">{{ i18n.isArabic() ? 'مشاركة البيانات للتحسين' : 'Share Data for Improvement' }}</span>
                <p-tag [value]="config()!.privacy?.share_for_improvement ? (i18n.isArabic() ? 'مُفعَّل' : 'Enabled') : (i18n.isArabic() ? 'معطَّل' : 'Disabled')" [severity]="config()!.privacy?.share_for_improvement ? 'warning' : 'success'" />
              </div>
              <div class="flex justify-content-between align-items-center p-2 surface-100 border-round">
                <span class="text-sm">{{ i18n.isArabic() ? 'تجميع البيانات الشخصية' : 'Personal Data Anonymization' }}</span>
                <p-tag [value]="config()!.privacy?.anonymize_data ? (i18n.isArabic() ? 'مُفعَّل' : 'Enabled') : (i18n.isArabic() ? 'معطَّل' : 'Disabled')" [severity]="config()!.privacy?.anonymize_data ? 'success' : 'warning'" />
              </div>
              <div class="flex justify-content-between align-items-center p-2 surface-100 border-round">
                <span class="text-sm">{{ i18n.isArabic() ? 'احتفاظ البيانات' : 'Data Retention' }}</span>
                <span class="font-semibold">{{ config()!.privacy?.retention_days ?? '—' }} {{ i18n.isArabic() ? 'يوم' : 'days' }}</span>
              </div>
              <button pButton [label]="i18n.isArabic() ? 'مسح سجل المحادثات' : 'Clear History'" class="p-button-outlined p-button-danger mt-2" icon="pi pi-trash" (click)="clearHistory()"></button>
            </div>
          </p-card>
        </div>

        <div class="col-12 lg:col-8">
          <p-tabView [dir]="i18n.direction()">
            <p-tabPanel [header]="i18n.isArabic() ? 'سجل المحادثات' : 'Conversation History'">
              <p-table [value]="history()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" responsiveLayout="scroll" [sortField]="'timestamp'" [sortOrder]="-1">
                <ng-template pTemplate="header">
                  <tr>
                    <th pSortableColumn="timestamp">{{ i18n.isArabic() ? 'الوقت' : 'Time' }} <p-sortIcon field="timestamp" /></th>
                    <th>{{ i18n.isArabic() ? 'الوحدة' : 'Module' }}</th>
                    <th>{{ i18n.isArabic() ? 'المدخل' : 'Input (truncated)' }}</th>
                    <th>{{ i18n.isArabic() ? 'الاستجابة' : 'Response (truncated)' }}</th>
                    <th>{{ i18n.isArabic() ? 'الرموز' : 'Tokens' }}</th>
                    <th>{{ i18n.isArabic() ? 'الكمون' : 'Latency' }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-msg>
                  <tr>
                    <td>{{ msg.timestamp }}</td>
                    <td><p-tag [value]="msg.module_code || msg.context || '—'" /></td>
                    <td class="text-sm" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ (msg.user_input || msg.input || '').slice(0, 80) }}</td>
                    <td class="text-sm" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ (msg.agent_response || msg.response || '').slice(0, 80) }}</td>
                    <td>{{ (msg.input_tokens ?? 0) + (msg.output_tokens ?? 0) }}</td>
                    <td>{{ msg.latency_ms ? msg.latency_ms + 'ms' : '—' }}</td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا يوجد سجل محادثات' : 'No conversation history' }}</td></tr>
                </ng-template>
              </p-table>
            </p-tabPanel>

            <p-tabPanel [header]="i18n.isArabic() ? 'مقاييس التكيُّف' : 'Learning & Adaptation'">
              <div class="grid">
                <div class="col-12 md:col-6" *ngFor="let metric of adaptationMetrics()">
                  <p-card [header]="i18n.isArabic() ? metric.labelAr : metric.label">
                    <div class="flex flex-column align-items-center gap-2">
                      <div class="text-3xl font-bold" [style.color]="metric.color">{{ metric.value }}</div>
                      <p-progressBar *ngIf="metric.pct !== undefined" [value]="metric.pct" [style]="{'height':'8px','width':'100%'}" [showValue]="false" />
                      <div class="text-sm" style="color: var(--text-muted)">{{ i18n.isArabic() ? metric.descAr : metric.desc }}</div>
                    </div>
                  </p-card>
                </div>
              </div>
            </p-tabPanel>
          </p-tabView>
        </div>
      </div>
    </app-page-shell>
  `,
})
export class AiPersonalAgentComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly config = signal<any | null>(null);
  readonly history = signal<any[]>([]);
  readonly adaptationMetrics = signal<any[]>([]);

  editConfig: { preferred_model: string; response_language: string; scope: string; verbosity: string; max_tokens: number } = {
    preferred_model: 'claude-sonnet-4-20250514', response_language: 'ar', scope: 'personal', verbosity: 'balanced', max_tokens: 2048,
  };

  readonly modelOptions = [
    { label: 'Claude Sonnet', value: 'claude-sonnet-4-20250514' },
    { label: 'Claude Haiku', value: 'claude-haiku-4-5' },
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'Azure OpenAI GPT-4', value: 'azure-gpt4' },
  ];

  readonly languageOptions = [
    { label: 'العربية', value: 'ar' },
    { label: 'English', value: 'en' },
    { label: 'Auto-detect', value: 'auto' },
  ];

  readonly scopeOptions = [
    { label: 'Personal', value: 'personal' },
    { label: 'Team', value: 'team' },
    { label: 'Workspace', value: 'workspace' },
  ];

  readonly verbosityOptions = [
    { label: 'Concise', value: 'concise' },
    { label: 'Balanced', value: 'balanced' },
    { label: 'Detailed', value: 'detailed' },
  ];

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/personal/config`).subscribe({
      next: (res) => {
        const cfg = res?.data || res || null;
        this.config.set(cfg);
        if (cfg) {
          this.editConfig = {
            preferred_model: cfg.preferred_model || 'claude-sonnet-4-20250514',
            response_language: cfg.response_language || 'ar',
            scope: cfg.scope || 'personal',
            verbosity: cfg.verbosity || 'balanced',
            max_tokens: cfg.max_tokens || 2048,
          };
          if (Array.isArray(cfg.adaptation_metrics)) {
            this.buildAdaptationMetrics(cfg.adaptation_metrics);
          }
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'warn', summary: 'Info', detail: 'No personal agent configured yet' });
      },
    });

    this.http.get<any>(`${environment.apiUrl}/ai/personal/history`).subscribe({
      next: (res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        this.history.set(list);
        this.buildAdaptationMetrics(null, list);
      },
      error: () => this.history.set([]),
    });
  }

  private buildAdaptationMetrics(metrics: any[] | null, historyFallback: any[] = []): void {
    if (metrics && metrics.length > 0) {
      this.adaptationMetrics.set(metrics.map((m: any) => ({ ...m, color: 'var(--info)' })));
      return;
    }
    const list = historyFallback;
    const totalSessions = list.length;
    const avgTokens = totalSessions ? Math.round(list.reduce((s: number, h: any) => s + ((h.input_tokens || 0) + (h.output_tokens || 0)), 0) / totalSessions) : 0;
    this.adaptationMetrics.set([
      { label: 'Total Sessions', labelAr: 'إجمالي الجلسات', value: totalSessions, desc: 'Conversations tracked', descAr: 'محادثات مسجلة', color: 'var(--info)', pct: undefined },
      { label: 'Avg Tokens/Session', labelAr: 'متوسط الرموز', value: avgTokens, desc: 'Per conversation', descAr: 'لكل محادثة', color: 'var(--blue-500)', pct: undefined },
      { label: 'Context Retained', labelAr: 'السياق المحفوظ', value: `${Math.min(100, totalSessions * 5)}%`, desc: 'Personalization depth', descAr: 'عمق التخصيص', color: 'var(--success)', pct: Math.min(100, totalSessions * 5) },
      { label: 'Feedback Score', labelAr: 'تقييم المستخدم', value: '—', desc: 'Based on user ratings', descAr: 'بناءً على تقييمات المستخدم', color: 'var(--warning)', pct: undefined },
    ]);
  }

  saveConfig(): void {
    this.saving.set(true);
    this.http.put<any>(`${environment.apiUrl}/ai/personal/config`, this.editConfig).subscribe({
      next: (updated) => {
        this.config.set({ ...this.config(), ...updated });
        this.saving.set(false);
        this.msg.add({ severity: 'success', summary: 'Saved', detail: 'Personal agent settings updated' });
      },
      error: () => {
        this.saving.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to save settings' });
      },
    });
  }

  clearHistory(): void {
    this.http.delete<any>(`${environment.apiUrl}/ai/personal/history`).subscribe({
      next: () => {
        this.history.set([]);
        this.msg.add({ severity: 'success', summary: 'Cleared', detail: 'Conversation history cleared' });
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to clear history' }),
    });
  }
}
