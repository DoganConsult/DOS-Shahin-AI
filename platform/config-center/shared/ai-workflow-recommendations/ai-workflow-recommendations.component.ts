import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import {
  AiWorkflowTriggerService,
  AIWorkflowRecommendation,
} from '@app/core/services/workflow-collab/ai-workflow-trigger.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-workflow-recommendations',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="ai-recs" *ngIf="recommendations && recommendations.length">
      <div class="ai-recs-header">
        <i class="pi pi-sparkles"></i>
        <span>{{ t('aiWorkflow.recommendations') }}</span>
      </div>
      <div class="ai-recs-list">
        <div
          *ngFor="let rec of recommendations; trackBy: trackByAction"
          class="ai-rec-card"
        >
          <div class="ai-rec-top">
            <span class="ai-rec-action">{{ rec.action }}</span>
            <p-tag
              [value]="(rec.confidence * 100).toFixed(0) + '%'"
              [severity]="confidenceSeverity(rec.confidence)"
              [rounded]="true"
            />
          </div>
          <div class="ai-rec-desc">{{ rec.description }}</div>
          <button
            pButton
            [label]="t('aiWorkflow.accept')"
            icon="pi pi-check"
            class="p-button-sm p-button-outlined"
            [loading]="accepting() === rec.action"
            (click)="accept(rec)"
          ></button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .ai-recs { padding: 12px 0; }
      .ai-recs-header {
        display: flex; align-items: center; gap: 8px;
        font-size: var(--font-size-base); font-weight: 700;
        color: var(--text-heading, var(--text-heading));
        margin-bottom: 12px;
      }
      .ai-recs-header .pi { color: var(--primary, #6366f1); }
      .ai-recs-list { display: flex; flex-direction: column; gap: 10px; }
      .ai-rec-card {
        padding: 14px; border-radius: var(--radius-md);
        background: var(--surface-sunken, var(--surface-ice));
        border: 1px solid var(--border-subtle, var(--border-subtle));
        display: flex; flex-direction: column; gap: 8px;
      }
      .ai-rec-top {
        display: flex; align-items: center; justify-content: space-between;
      }
      .ai-rec-action {
        font-size: var(--font-size-sm); font-weight: 600;
        color: var(--text-heading, var(--text-heading));
      }
      .ai-rec-desc {
        font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted));
        line-height: 1.5;
      }
    `,
  ],
})
export class AiWorkflowRecommendationsComponent {
  @Input() recommendations: AIWorkflowRecommendation[] = [];
  @Output() accepted = new EventEmitter<AIWorkflowRecommendation>();

  accepting = signal<string | null>(null);

  constructor(
    private i18n: I18nService,
    private triggerService: AiWorkflowTriggerService,
    private messageService: MessageService
  ) {}

  t(key: string): string {
    return this.i18n.translate(key);
  }

  trackByAction(_index: number, rec: AIWorkflowRecommendation): string {
    return rec.action;
  }

  confidenceSeverity(confidence: number): 'success' | 'info' | 'warning' | 'danger' {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'info';
    if (confidence >= 0.4) return 'warning';
    return 'danger';
  }

  accept(rec: AIWorkflowRecommendation): void {
    this.accepting.set(rec.action);
    this.triggerService.acceptRecommendation(rec).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.t('aiWorkflow.acceptedSuccess'),
          detail: rec.action,
          life: 3000,
        });
        this.accepting.set(null);
        this.accepted.emit(rec);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.t('aiWorkflow.acceptedError'),
          detail: rec.action,
          life: 4000,
        });
        this.accepting.set(null);
      },
    });
  }
}
