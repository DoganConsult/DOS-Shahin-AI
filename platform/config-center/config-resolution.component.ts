import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfigCenterService, type ConfigResolveResult, type ConfigResolutionExplanation } from './config-center.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-config-resolution',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    TableModule, TagModule, ButtonModule, InputTextModule, SkeletonModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell
      icon="pi pi-search"
      [title]="i18n.translate('configCenter.resolve')"
      [subtitle]="i18n.translate('configCenter.title')"
      [breadcrumbs]="['Admin', 'Config Center', 'Resolve']"
      [loading]="loading()">

      <div headerActions class="flex gap-2">
        <input pInputText type="text" [(ngModel)]="searchKey" [placeholder]="i18n.translate('configCenter.key')"
               class="p-inputtext-sm" style="width:300px" (keydown.enter)="resolveKey()" />
        <p-button icon="pi pi-search" [label]="i18n.translate('configCenter.resolve')"
                  (onClick)="resolveKey()" [disabled]="loading() || !searchKey" />
      </div>

      @if (result()) {
        <div class="p-4 surface-card border-round shadow-1 mb-4">
          <div class="grid">
            <div class="col-12 md:col-3"><strong>{{ i18n.translate('configCenter.key') }}:</strong> {{ result()!.key }}</div>
            <div class="col-12 md:col-3"><strong>{{ i18n.translate('configCenter.value') }}:</strong> {{ result()!.value }}</div>
            <div class="col-12 md:col-3"><strong>{{ i18n.translate('configCenter.source') }}:</strong>
              <p-tag [value]="result()!.source" severity="info" />
            </div>
            <div class="col-12 md:col-3"><strong>{{ i18n.translate('configCenter.owner') }}:</strong> {{ result()!.owner ?? '—' }}</div>
          </div>
          <div class="mt-2">
            <strong>{{ i18n.translate('configCenter.overridden') }}:</strong>
            @for (layer of result()!.overriddenLayers; track layer) {
              <p-tag [value]="layer" severity="warning" style="margin-inline-start:0.25rem" />
            }
          </div>
          @if (result()!.sensitive) {
            <div class="mt-2">
              <p-tag [value]="i18n.translate('configCenter.sensitive')" severity="danger" />
            </div>
          }
        </div>
      }

      @if (explanation()) {
        <div class="p-4 surface-card border-round shadow-1">
          <h4>Resolution Layers</h4>
          <p-table [value]="explanation()!.layers" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Layer</th>
                <th>Value</th>
                <th>Active</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr [class.surface-200]="row.active">
                <td>{{ row.layer }}</td>
                <td>{{ row.value ?? '—' }}</td>
                <td><p-tag [value]="row.active ? 'Active' : 'Skipped'" [severity]="row.active ? 'success' : 'secondary'" /></td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      }
    </app-page-shell>
  `,
})
export class ConfigResolutionComponent {
  i18n = inject(I18nService);
  private configService = inject(ConfigCenterService);
  private msg = inject(MessageService);

  loading = signal(false);
  searchKey = '';
  result = signal<ConfigResolveResult | null>(null);
  explanation = signal<ConfigResolutionExplanation | null>(null);

  resolveKey() {
    if (!this.searchKey.trim()) return;
    this.loading.set(true);
    this.configService.resolveKey(this.searchKey).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to resolve config key' });
        this.loading.set(false);
      },
    });
    this.configService.explainKey(this.searchKey).subscribe({
      next: (r) => this.explanation.set(r),
      error: () => {
        this.msg.add({ severity: 'warn', summary: 'Warning', detail: 'Failed to load resolution explanation' });
      },
    });
  }
}
