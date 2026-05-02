import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-config',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, CardModule, InputSwitchModule, DropdownModule, ButtonModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="grc-hub" [dir]="i18n.direction()">
      <h2>{{ i18n.isArabic() ? 'إعدادات الذكاء الاصطناعي' : 'AI Configuration' }}</h2>

      <div class="grid">
        <div class="col-12 md:col-6">
          <p-card [header]="i18n.isArabic() ? 'نموذج LLM' : 'LLM Provider'">
            <div class="field">
              <label>{{ i18n.isArabic() ? 'المزود الأساسي' : 'Primary Provider' }}</label>
              <p-dropdown [options]="providers" [(ngModel)]="selectedProvider" optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
            <div class="field mt-3">
              <label>{{ i18n.isArabic() ? 'وضع التراجع' : 'Fallback Mode' }}</label>
              <p-inputSwitch [(ngModel)]="fallbackEnabled" />
            </div>
          </p-card>
        </div>

        <div class="col-12 md:col-6">
          <p-card [header]="i18n.isArabic() ? 'حراسات الأمان' : 'Guardrails'">
            <div class="field">
              <label>{{ i18n.isArabic() ? 'تفعيل التحقق' : 'Enable Validation' }}</label>
              <p-inputSwitch [(ngModel)]="guardrailsEnabled" />
            </div>
            <div class="field mt-3">
              <label>{{ i18n.isArabic() ? 'حد الثقة' : 'Confidence Threshold' }}</label>
              <p-dropdown [options]="thresholds" [(ngModel)]="confidenceThreshold" optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </p-card>
        </div>
      </div>

      <div class="mt-3">
        <p-button [label]="i18n.isArabic() ? 'حفظ' : 'Save'" icon="pi pi-save" (onClick)="save()" />
      </div>
    </div>
  `,
})
export class AiConfigComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  providers = [
    { label: 'Azure OpenAI', value: 'azure-openai' },
    { label: 'Ollama (Local)', value: 'ollama' },
    { label: 'Claude', value: 'claude' },
  ];

  thresholds = [
    { label: '0.5 (Low)', value: 0.5 },
    { label: '0.7 (Medium)', value: 0.7 },
    { label: '0.9 (High)', value: 0.9 },
  ];

  selectedProvider = 'azure-openai';
  fallbackEnabled = true;
  guardrailsEnabled = true;
  confidenceThreshold = 0.7;

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/config`).subscribe({
      next: (res) => {
        if (res?.provider) this.selectedProvider = res.provider;
        if (res?.fallback !== undefined) this.fallbackEnabled = res.fallback;
        if (res?.guardrails !== undefined) this.guardrailsEnabled = res.guardrails;
        if (res?.confidenceThreshold) this.confidenceThreshold = res.confidenceThreshold;
      },
      error: () => {},
    });
  }

  save(): void {
    this.http.put(`${environment.apiUrl}/ai/config`, {
      provider: this.selectedProvider,
      fallback: this.fallbackEnabled,
      guardrails: this.guardrailsEnabled,
      confidenceThreshold: this.confidenceThreshold,
    }).subscribe({
      next: () => this.msg.add({ severity: 'success', summary: this.i18n.isAr() ? 'تم الحفظ' : 'Saved', detail: this.i18n.isAr() ? 'تم حفظ الإعدادات' : 'Configuration saved' }),
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to save' }),
    });
  }
}
