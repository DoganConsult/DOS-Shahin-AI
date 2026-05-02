import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-prompt-library',
  standalone: true,
  imports: [CommonModule, ToastModule, CardModule, TableModule, TagModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="grc-hub" [dir]="i18n.direction()">
      <h2>{{ i18n.isArabic() ? 'مكتبة الأوامر' : 'Prompt Library' }}</h2>
      <p-card>
        <p-table [value]="prompts()" [rows]="20" responsiveLayout="scroll" [paginator]="true">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.isArabic() ? 'الاسم' : 'Name' }}</th>
              <th>{{ i18n.isArabic() ? 'الوحدة' : 'Module' }}</th>
              <th>{{ i18n.isArabic() ? 'النوع' : 'Type' }}</th>
              <th>{{ i18n.isArabic() ? 'الإصدار' : 'Version' }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-prompt>
            <tr>
              <td>{{ prompt.name }}</td>
              <td><p-tag [value]="prompt.module" /></td>
              <td>{{ prompt.type }}</td>
              <td>{{ prompt.version }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="4" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد أوامر' : 'No prompts configured' }}</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
  `,
})
export class AiPromptLibraryComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  readonly prompts = signal<any[]>([]);

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/prompts`).subscribe({
      next: (res) => this.prompts.set(res?.data || res || []),
      error: () => this.prompts.set([]),
    });
  }
}
