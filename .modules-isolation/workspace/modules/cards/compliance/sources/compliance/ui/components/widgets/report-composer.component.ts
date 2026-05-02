import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ReportComposerComponent — compliance signature widget for `/compliance/reports`.
 *
 * Spec ref: §28.4 (Report Builder + Evidence selection + Export), §35.3.
 * Two-pane layout: left = template + filters, right = preview. Output emits
 * generation requests; host wires to the report service.
 */

export interface ReportTemplate {
  templateId: string;
  name: string;
  framework?: string;
  description?: string;
  formats: Array<'pdf' | 'docx' | 'xlsx' | 'json'>;
}

export interface ReportComposerInput {
  templateId: string;
  format: 'pdf' | 'docx' | 'xlsx' | 'json';
  scope?: { frameworkCodes?: string[]; controlIds?: string[]; dateRange?: { from: string; to: string } };
  includeEvidence?: boolean;
}

@Component({
  selector: 'compliance-report-composer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rc" aria-label="Report Composer">
      <header class="rc__head">
        <h3 class="rc__title">{{ titleKey }}</h3>
      </header>
      <div class="rc__body">
        <div class="rc__tpl">
          <h4>Templates</h4>
          <ul class="rc__tpl-list">
            <li
              *ngFor="let t of templates"
              class="rc__tpl-item"
              [class.rc__tpl-item--selected]="t.templateId === selectedTemplate"
              (click)="selectedTemplate = t.templateId"
            >
              <strong>{{ t.name }}</strong>
              <small *ngIf="t.framework">{{ t.framework }}</small>
              <p *ngIf="t.description">{{ t.description }}</p>
            </li>
          </ul>
        </div>
        <div class="rc__preview">
          <h4>Preview</h4>
          <ng-content select="[slot=preview]"></ng-content>
          <p *ngIf="!selectedTemplate" class="rc__hint">Select a template to start.</p>
        </div>
      </div>
      <footer class="rc__foot">
        <select class="rc__format" [(ngModel)]="format" name="rcFormat">
          <option value="pdf">PDF</option>
          <option value="docx">Word</option>
          <option value="xlsx">Excel</option>
          <option value="json">JSON</option>
        </select>
        <label class="rc__inc">
          <input type="checkbox" [(ngModel)]="includeEvidence" name="rcInc" /> Include evidence
        </label>
        <button type="button" class="rc__gen" [disabled]="!selectedTemplate" (click)="emitGenerate()">Generate</button>
      </footer>
    </section>
  `,
  styles: [`
    .rc { background: var(--cds-layer-01, #f4f4f4); border-radius: 8px; padding: var(--cds-spacing-05, 0.75rem); display: flex; flex-direction: column; gap: 0.5rem; }
    .rc__title { margin: 0; font-size: 1rem; font-weight: 600; }
    .rc__body { display: grid; grid-template-columns: 280px 1fr; gap: 0.75rem; }
    .rc__tpl h4, .rc__preview h4 { margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 600; }
    .rc__tpl-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.25rem; }
    .rc__tpl-item { background: var(--cds-layer-02, #fff); padding: 0.5rem; border-radius: 4px; cursor: pointer; border: 1px solid var(--cds-border-subtle-01, #e0e0e0); }
    .rc__tpl-item--selected { border-color: var(--cds-button-primary, #0f62fe); background: #eff5ff; }
    .rc__tpl-item small { display: block; color: var(--cds-text-secondary, #525252); font-size: 0.75rem; }
    .rc__tpl-item p { margin: 0.25rem 0 0 0; font-size: 0.75rem; }
    .rc__preview { background: var(--cds-layer-02, #fff); padding: 0.75rem; border-radius: 6px; min-height: 240px; }
    .rc__hint { color: var(--cds-text-secondary, #525252); font-style: italic; }
    .rc__foot { display: flex; gap: 0.5rem; align-items: center; justify-content: flex-end; }
    .rc__format { padding: 0.375rem 0.5rem; border: 1px solid var(--cds-border-strong-01, #6f6f6f); border-radius: 4px; }
    .rc__inc { font-size: 0.75rem; }
    .rc__gen { padding: 0.5rem 1rem; background: var(--cds-button-primary, #0f62fe); color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    .rc__gen:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ReportComposerComponent {
  @Input() titleKey = 'Report Composer';
  @Input() templates: ReportTemplate[] = [];

  selectedTemplate?: string;
  format: ReportComposerInput['format'] = 'pdf';
  includeEvidence = true;

  @Output() generate = new EventEmitter<ReportComposerInput>();

  emitGenerate() {
    if (!this.selectedTemplate) return;
    this.generate.emit({
      templateId: this.selectedTemplate,
      format: this.format,
      includeEvidence: this.includeEvidence,
    });
  }
}
