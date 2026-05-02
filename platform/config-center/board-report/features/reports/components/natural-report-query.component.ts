// ============================================
// Shahin GRC — Natural Report Query Component
// AI-powered natural language report generation interface
// ============================================

import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { devLog } from '@app/runtime/utils/dev-logger';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { HtmlSanitizerService } from '@app/core/services/ui-infra/error-handling/html-sanitizer.service';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AccordionModule } from 'primeng/accordion';
import { MessageModule } from 'primeng/message';
import { GrcRecord } from '@app/core/models/shared.types';

// === Types ===

export interface NaturalReport {
  reportId: string;
  title: string;
  content: string;
  structuredData?: Record<string, unknown>;
  metadata: {
    generatedAt: string;
    generatedBy: string;
    query: string;
    intent: Record<string, unknown>;
    language: 'en' | 'ar';
  };
}

// === Component ===

@Component({
  selector: 'app-natural-report-query',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, ProgressSpinnerModule, AccordionModule, MessageModule],
  template: `
    <div class="natural-report-query" [dir]="i18n.dir()">
      <div class="query-input-section">
        <h3>{{ i18n.t('reports.naturalQuery.title') }}</h3>
        <p class="help-text">{{ i18n.t('reports.naturalQuery.help') }}</p>

        <div class="input-group">
          <textarea
            [(ngModel)]="queryText"
            [placeholder]="i18n.t('reports.naturalQuery.placeholder')"
            rows="3"
            [disabled]="generating()"
            class="query-input"
          ></textarea>
          <button
            pButton
            type="button"
            [label]="i18n.t('reports.naturalQuery.generate')"
            [disabled]="!queryText.trim() || generating()"
            (click)="generateReport()"
            [loading]="generating()"
            icon="pi pi-sparkles"
          ></button>
        </div>

        <!-- Examples -->
        <div class="examples" *ngIf="!generating() && !generatedReport()">
          <p class="examples-title">{{ i18n.t('reports.naturalQuery.examples') }}:</p>
          <div class="example-chips">
            <span
              *ngFor="let example of examples"
              class="example-chip"
              (click)="queryText = example; generateReport()"
            >
              {{ example }}
            </span>
          </div>
        </div>
      </div>

      <!-- Generating state -->
      <div class="generating-state" *ngIf="generating()">
        <p-progressSpinner></p-progressSpinner>
        <p>{{ i18n.t('reports.naturalQuery.generating') }}</p>
      </div>

      <!-- Generated report -->
      <div class="generated-report" *ngIf="generatedReport()">
        <div class="report-header">
          <h2>{{ generatedReport()!.title }}</h2>
          <div class="report-actions">
            <button
              pButton
              type="button"
              [label]="i18n.t('reports.download')"
              icon="pi pi-download"
              (click)="downloadReport()"
            ></button>
            <button
              pButton
              type="button"
              [label]="i18n.t('reports.share')"
              icon="pi pi-share-alt"
              (click)="shareReport()"
            ></button>
          </div>
        </div>

        <div class="report-content" [innerHTML]="formatContent(generatedReport()!.content)"></div>

        <!-- Structured data preview (collapsible) -->
        <div class="structured-data-preview">
          <p-accordion>
            <p-accordionTab [header]="i18n.t('reports.naturalQuery.viewData')">
              <pre>{{ formatJson(generatedReport()!.structuredData) }}</pre>
            </p-accordionTab>
          </p-accordion>
        </div>
      </div>

      <!-- Error state -->
      <div class="error-state" *ngIf="error()">
        <p-message severity="error" [text]="error()"></p-message>
      </div>

      <!-- History -->
      <div class="report-history" *ngIf="history().length > 0">
        <h4>{{ i18n.t('reports.naturalQuery.history') }}</h4>
        <div class="history-list">
          <div
            *ngFor="let report of history()"
            class="history-item"
            (click)="loadReport(report)"
          >
            <span class="history-query">{{ report.metadata.query }}</span>
            <span class="history-date">{{ formatDate(report.metadata.generatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .natural-report-query {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .query-input-section {
      margin-bottom: 2rem;
    }
    .input-group {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }
    .query-input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    .examples {
      margin-top: 1rem;
    }
    .example-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .example-chip {
      padding: 0.5rem 1rem;
      background: #f3f4f6;
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s;
    }
    .example-chip:hover {
      background: #e5e7eb;
    }
    .generating-state {
      text-align: center;
      padding: 3rem;
    }
    .generated-report {
      margin-top: 2rem;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .report-content {
      background: #fff;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      line-height: 1.6;
    }
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .history-item {
      padding: 0.75rem;
      background: #f9fafb;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
    }
    .history-item:hover {
      background: #f3f4f6;
    }
  `],
})
export class NaturalReportQueryComponent {
  queryText = '';
  readonly generating = signal(false);
  readonly generatedReport = signal<NaturalReport | null>(null);
  readonly error = signal<string | null>(null);
  readonly history = signal<NaturalReport[]>([]);

  examples = [
    'Show me our compliance status for NCA ECC',
    'What are our top risks this quarter?',
    'Generate an executive summary for the board',
    'Show evidence coverage gaps for SAMA CSF',
    'Create a risk posture report',
  ];

  constructor(
    private http: HttpClient,
    public i18n: I18nService,
    private htmlSanitizer: HtmlSanitizerService
  ) {
    this.loadHistory();
  }

  /**
   * Generate report from natural language query.
   */
  generateReport(): void {
    if (!this.queryText.trim()) return;

    this.generating.set(true);
    this.error.set(null);

    this.http
      .post<NaturalReport>(`${environment.apiUrl}/api/reports/natural/generate`, {
        query: this.queryText,
        language: this.i18n.currentLang(),
      })
      .subscribe({
        next: (report) => {
          this.generatedReport.set(report);
          this.generating.set(false);
          this.loadHistory(); // Refresh history
        },
        error: (err) => {
          this.error.set(((err as GrcRecord).error)?.error || 'Failed to generate report');
          this.generating.set(false);
        },
      });
  }

  /**
   * Load report history.
   */
  loadHistory(): void {
    this.http
      .get<{ reports: NaturalReport[] }>(`${environment.apiUrl}/api/reports/natural/history?limit=10`)
      .subscribe({
        next: (response) => {
          this.history.set(response.reports);
        },
        error: (err) => {
          console.error('[NaturalReport] Failed to load history:', err);
        },
      });
  }

  /**
   * Load a report from history.
   */
  loadReport(report: NaturalReport): void {
    this.generatedReport.set(report);
    this.queryText = report.metadata.query;
  }

  /**
   * Download generated report.
   */
  downloadReport(): void {
    const report = this.generatedReport();
    if (!report) return;

    // Generate PDF/Excel based on intent
    const format = report.metadata.intent?.format || 'pdf';
    const url = `${environment.apiUrl}/api/reports/generate/${report.metadata.intent?.reportType || 'executive-summary'}/${format}`;
    window.open(url, '_blank');
  }

  /**
   * Share report.
   */
  shareReport(): void {
    const report = this.generatedReport();
    if (!report) return;

    // Implement sharing logic
    devLog('Share report:', report.reportId);
  }

  /**
   * Format content (markdown to HTML).
   */
  formatContent(content: string): string {
    // Simple markdown-like formatting, then sanitize
    const html = content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    const formatted = '<p>' + html + '</p>';
    return this.htmlSanitizer.sanitizeMarkdown(formatted);
  }

  /**
   * Format JSON for display.
   */
  formatJson(data: GrcRecord): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Format date.
   */
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }
}
