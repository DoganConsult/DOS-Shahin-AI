// AI Governance — AI-OS Dashboard page (ai-os-dashboard).
// Detail variant: fetches a summary object from /ai-engine/dashboard and renders
// the canonical KPIs as a card grid. Bilingual + RTL via I18nService.

import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ApiClientService } from '@app/blueprint/core/services/api-client.service';
import { CardModule } from 'primeng/card';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-os-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './ai-os-dashboard.component.html',
})
export class AiOsDashboardComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(ApiClientService);

  readonly summary = signal<Record<string, unknown> | null>(null);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<unknown>('/ai-engine/dashboard').subscribe({
      next: (res) => {
        const data = (res && typeof res === 'object' && (res as { data?: unknown }).data)
          ? (res as { data: Record<string, unknown> }).data
          : (res as Record<string, unknown>);
        this.summary.set(data ?? null);
        this.state.set('ready');
      },
      error: (err: { message?: string }) => {
        this.error.set(err?.message ?? String(err));
        this.state.set('error');
      },
    });
  }
}
