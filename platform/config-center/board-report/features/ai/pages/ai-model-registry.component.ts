import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  selector: 'app-ai-model-registry',
  standalone: true,
  imports: [CommonModule, RouterModule, ToastModule, CardModule, TableModule, TagModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="grc-hub" [dir]="i18n.direction()">
      <h2>{{ i18n.isArabic() ? 'سجل النماذج' : 'Model Registry' }}</h2>
      <p-card>
        <p-table [value]="models()" [rows]="20" responsiveLayout="scroll" [paginator]="true">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.isArabic() ? 'النموذج' : 'Model' }}</th>
              <th>{{ i18n.isArabic() ? 'المزود' : 'Provider' }}</th>
              <th>{{ i18n.isArabic() ? 'الإصدار' : 'Version' }}</th>
              <th>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</th>
              <th>{{ i18n.isArabic() ? 'آخر تقييم' : 'Last Evaluation' }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-model>
            <tr>
              <td>{{ model.name }}</td>
              <td>{{ model.provider }}</td>
              <td>{{ model.version }}</td>
              <td><p-tag [severity]="model.approved ? 'success' : 'warning'" [value]="model.approved ? 'Approved' : 'Pending'" /></td>
              <td>{{ model.lastEvaluation || '—' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد نماذج مسجلة' : 'No models registered' }}</td></tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
  `,
})
export class AiModelRegistryComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  readonly models = signal<any[]>([]);

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/models`).subscribe({
      next: (res) => this.models.set(res?.data || res || []),
      error: () => this.models.set([]),
    });
  }
}
