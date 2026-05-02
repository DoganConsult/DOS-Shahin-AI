import { Component, OnInit, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ButtonModule, DialogModule, DropdownModule, InputModule, NotificationModule, ProgressIndicatorModule, TabsModule, TagModule, TilesModule, TooltipModule, UIShellModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-assessment-templates',
    imports: [CommonModule, FormsModule, PageShellComponent, AiPanelComponent, TilesModule, ButtonModule, TagModule, DropdownModule,
        UIShellModule, InputModule, InputModule, DialogModule, ProgressIndicatorModule, TooltipModule, TagModule, TagModule, TabsModule, NotificationModule],
    providers: [],
    template: `
    <app-page-shell icon="clipboard" [title]="i18n.translate('grcOs.assessmentTemplates')"
      [subtitle]="i18n.translate('assessmentTemplates.subtitle')"
      [breadcrumbs]="[i18n.translate('assessmentTemplates.breadcrumbDashboard'), i18n.translate('grcOs.assessmentTemplates')]" [loading]="loading">
      <cds-notification></cds-notification>

      <!-- Stats Row -->
      <div class="grid mb-3" style="gap:0">
        @for (stat of stats; track stat.label) {
          <div class="col-6 md:col-3 lg:col-2">
            <div class="stat-card" [style.border-inline-start-color]="stat.color">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        }
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar mb-3">
        <div class="flex flex-wrap align-items-center gap-2">
          <span class="p-input-icon-left flex-grow-1" style="min-width:200px">
            <i class=""></i>
            <input pInputText type="text" [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()"
              [placeholder]="i18n.translate('assessmentTemplates.searchPlaceholder')" [attr.aria-label]="i18n.translate('assessmentTemplates.searchPlaceholder')" class="w-full" style="padding-inline-start:2.5rem" />
          </span>
          <cds-dropdown [options]="categoryOptions" [(ngModel)]="selectedCategory" (onChange)="applyFilters()"
            [placeholder]="i18n.translate('assessmentTemplates.allCategories')" [showClear]="true" styleClass="filter-dropdown" />
          <cds-dropdown [options]="difficultyOptions" [(ngModel)]="selectedDifficulty" (onChange)="applyFilters()"
            [placeholder]="i18n.translate('assessmentTemplates.allLevels')" [showClear]="true" styleClass="filter-dropdown" />
          <cds-dropdown [options]="industryOptions" [(ngModel)]="selectedIndustry" (onChange)="applyFilters()"
            [placeholder]="i18n.translate('assessmentTemplates.allIndustries')" [showClear]="true" styleClass="filter-dropdown" />
          <button cdsButton [label]="i18n.translate('assessmentTemplates.createTemplate')" icon="" (onClick)="openCreateDialog()" styleClass="mr-2" />
          <span class="text-500 text-sm ml-2">{{ filteredTemplates.length }} templates</span>
        </div>
      </div>

      <!-- Category Chips -->
      <div class="flex flex-wrap gap-2 mb-3">
        <cds-tag [label]="'All (' + allTemplates.length + ')'" [styleClass]="!selectedCategory ? 'chip-active' : 'chip-inactive'"
          (click)="selectedCategory = ''; applyFilters()" />
        @for (cat of categories; track cat.id) {
          <cds-tag [label]="cat.nameEn + ' (' + cat.count + ')'" [styleClass]="selectedCategory === cat.id ? 'chip-active' : 'chip-inactive'"
            (click)="selectedCategory = cat.id; applyFilters()" />
        }
      </div>

      <!-- Template Grid -->
      <div class="grid">
        @for (tpl of filteredTemplates; track tpl.template_id) {
          <div class="col-12 md:col-6 lg:col-4">
            <div tabindex="0" role="button" (keyup.enter)="openDetail(tpl)" class="tpl-card" (click)="openDetail(tpl)">
              <div class="tpl-header">
                <div class="flex justify-content-between align-items-start">
                  <div>
                    <div class="tpl-name">{{ tpl.name_en || tpl.name }}</div>
                    <div class="tpl-name-ar text-500 text-xs">{{ tpl.name_ar }}</div>
                  </div>
                  <cds-tag [value]="tpl.difficulty || 'intermediate'" [severity]="difficultyColor(tpl.difficulty)" [rounded]="true" />
                </div>
                <div class="tpl-desc mt-2">{{ tpl.description_en || tpl.description }}</div>
              </div>
              <div class="tpl-meta">
                <div class="flex flex-wrap gap-2 mb-2">
                  <span class="meta-chip"><i class=""></i> {{ tpl.estimated_minutes || 60 }} min</span>
                  <span class="meta-chip"><i class=""></i> {{ tpl.question_count || 0 }} questions</span>
                  <span class="meta-chip"><i class=""></i> {{ scoringLabel(tpl.scoring_methodology) }}</span>
                </div>
                <div class="flex flex-wrap gap-1">
                  @for (tag of (tpl.tags || []).slice(0, 4); track tag) {
                    <span class="tag-pill">{{ tag }}</span>
                  }
                </div>
              </div>
              <div class="tpl-actions">
                <button cdsButton label="Start" icon="" size="small" (onClick)="startAssessment(tpl); $event.stopPropagation()" />
                <button cdsButton label="Preview" icon="" size="small" severity="secondary" [outlined]="true"
                  (onClick)="openDetail(tpl); $event.stopPropagation()" />
                <button cdsButton label="Edit" icon="" size="small" severity="secondary" [text]="true"
                  (onClick)="openEditDialog(tpl); $event.stopPropagation()" />
                <button cdsButton icon="" size="small" severity="danger" [text]="true"
                  (onClick)="confirmDelete(tpl); $event.stopPropagation()" [cdsTooltip]="Delete" />
              </div>
            </div>
          </div>
        }
        @if (filteredTemplates.length === 0 && !loading) {
          <div class="col-12 text-center py-5 text-500">
            <i class=" text-4xl mb-3 block"></i>
            <div>{{ i18n.translate('assessmentTemplates.noTemplatesMatch') }}</div>
          </div>
        }
      </div>

      <!-- Detail Dialog -->
      <cds-modal [(visible)]="showDetail" [modal]="true" [style]="{width:'700px','max-height':'85vh'}" [header]="detailTemplate?.name_en || ''">
        @if (detailTemplate) {
          <cds-tabs>
            <cds-tab header="Overview">
              <div class="mb-3 text-500">{{ detailTemplate.description_en }}</div>
              <div class="grid">
                <div class="col-6"><strong>Framework:</strong> {{ detailTemplate.framework_id }}</div>
                <div class="col-6"><strong>Scoring:</strong> {{ scoringLabel(detailTemplate.scoring_methodology) }}</div>
                <div class="col-6"><strong>Difficulty:</strong> <cds-tag [value]="detailTemplate.difficulty" [severity]="difficultyColor(detailTemplate.difficulty)" /></div>
                <div class="col-6"><strong>Est. Time:</strong> {{ detailTemplate.estimated_minutes }} minutes</div>
                <div class="col-6"><strong>Questions:</strong> {{ detailTemplate.question_count || (detailQuestions || []).length }}</div>
                <div class="col-6"><strong>Category:</strong> {{ detailTemplate.category }}</div>
              </div>
              @if (detailTemplate.weights) {
                <div class="mt-3"><strong>Domain Weights:</strong></div>
                <div class="flex flex-wrap gap-2 mt-1">
                  @for (w of weightEntries(detailTemplate.weights); track w.key) {
                    <span class="weight-chip">{{ w.key }}: {{ (w.value * 100).toFixed(0) }}%</span>
                  }
                </div>
              }
            </cds-tab>
            <cds-tab header="Questions & AI Guide" [disabled]="!detailQuestions.length">
              @for (q of detailQuestions || []; track q.qid; let i = $index) {
                <div class="question-row">
                  <div class="flex align-items-start gap-2">
                    <span class="q-num">{{ i + 1 }}</span>
                    <div class="flex-grow-1">
                      <div class="q-text">{{ q.text_en }}</div>
                      <div class="q-text-ar text-500 text-xs">{{ q.text_ar }}</div>
                      <div class="q-meta mt-1">
                        <span class="meta-chip"><i class=""></i> {{ q.domain }}</span>
                        <span class="meta-chip"><i class=""></i> Max {{ q.maxScore }}</span>
                        <span class="meta-chip"><i class=""></i> {{ q.evidenceHint }}</span>
                      </div>
                      @if (q.aiGuide) {
                        <div class="ai-guide mt-2">
                          <div class="ai-label"><i class=""></i> AI Guide</div>
                          <div class="ai-what"><strong>What it means:</strong> {{ q.aiGuide.what_en }}</div>
                          <div class="ai-how"><strong>How to check:</strong> {{ q.aiGuide.how_en }}</div>
                          <div class="ai-score"><strong>Scoring:</strong> {{ q.aiGuide.scoring_en }}</div>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
            </cds-tab>
          </cds-tabs>
          <div class="flex justify-content-end gap-2 mt-3">
            <button cdsButton label="Close" severity="secondary" [outlined]="true" (onClick)="showDetail = false" />
            <button cdsButton label="Start Assessment" icon="" (onClick)="startAssessment(detailTemplate); showDetail = false" />
          </div>
        }
      </cds-modal>

      <!-- Create/Edit Template Dialog -->
      <cds-modal [header]="editMode ? i18n.translate('assessmentTemplates.editTemplate') : i18n.translate('assessmentTemplates.createTemplate')"
        [(visible)]="showFormDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form">
          <div class="field"><label>Name (EN)</label><input pInputText [(ngModel)]="form.name_en" class="w-full" /></div>
          <div class="field"><label>Name (AR)</label><input pInputText [(ngModel)]="form.name_ar" class="w-full" /></div>
          <div class="field"><label>Description</label><textarea pInputTextarea [(ngModel)]="form.description_en" [rows]="3" class="w-full"></textarea></div>
          <div class="field-row">
            <div class="field"><label>Category</label><input pInputText [(ngModel)]="form.category" class="w-full" /></div>
            <div class="field"><label>Difficulty</label>
              <cds-dropdown [(ngModel)]="form.difficulty" [options]="difficultyOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>Scoring</label>
              <cds-dropdown [(ngModel)]="form.scoring_methodology" [options]="scoringOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
            <div class="field"><label>Est. Minutes</label><input pInputText type="number" [(ngModel)]="form.estimated_minutes" class="w-full" /></div>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('common.cancel')" icon="" severity="secondary" [text]="true" (onClick)="showFormDialog = false" />
          <button cdsButton [label]="i18n.translate('common.save')" icon="" (onClick)="saveTemplate()" [disabled]="!form.name_en" />
        </ng-template>
      </cds-modal>

      <!-- Delete Confirmation Dialog -->
      <cds-modal [header]="i18n.translate('assessmentTemplates.confirmDelete')"
        [(visible)]="showDeleteDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('assessmentTemplates.deleteConfirmMsg') }}</p>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="showDeleteDialog = false" />
          <button cdsButton [label]="i18n.translate('common.delete')" icon="" severity="danger" (onClick)="deleteTemplate()" />
        </ng-template>
      </cds-modal>
    </app-page-shell>
    <app-ai-panel module="assessment-templates" />
  `,
    styles: [`
    .stat-card { background: var(--surface-card); border-radius: var(--radius); padding: 0.75rem 1rem; border-inline-start: 4px solid var(--primary);
      box-shadow: var(--shadow-sm); }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .stat-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .filter-bar { background: var(--surface-card); border-radius: var(--radius); padding: 0.75rem; box-shadow: var(--shadow-sm); }
    .tpl-card { background: var(--surface-card); border-radius: var(--radius-md); padding: 1rem; cursor: pointer; border: 1px solid var(--surface-200);
      transition: all 0.2s; height: 100%; display: flex; flex-direction: column; }
    .tpl-card:hover { border-color: var(--primary); box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .tpl-name { font-weight: 600; font-size: var(--font-size-body-sm); color: var(--text-color); line-height: 1.3; }
    .tpl-desc { font-size: var(--font-size-caption); color: var(--text-color-secondary); line-height: 1.4; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .tpl-meta { margin-top: auto; padding-top: 0.75rem; }
    .meta-chip { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); color: var(--text-color-secondary);
      background: var(--surface-ice); padding: 2px 8px; border-radius: var(--radius-lg); }
    .meta-chip i { font-size: var(--font-size-2xs); }
    .tag-pill { font-size: var(--font-size-2xs); padding: 1px 6px; border-radius: var(--radius); background: var(--surface-50); color: var(--text-color-secondary);
      border: 1px solid var(--surface-200); }
    .tpl-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--surface-200); }
    .weight-chip { font-size: var(--font-size-sm); padding: 2px 8px; border-radius: var(--radius); background: #ede9fe; color: var(--primary); font-weight: 500; }
    .question-row { padding: 0.75rem 0; border-bottom: 1px solid var(--surface-200); }
    .question-row:last-child { border-bottom: none; }
    .q-num { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: var(--radius-pill);
      background: var(--primary); color: white; font-size: var(--font-size-xs); font-weight: 700; flex-shrink: 0; margin-top: 2px; }
    .q-text { font-size: var(--font-size-tag); font-weight: 500; color: var(--text-color); }
    .q-meta { display: flex; flex-wrap: wrap; gap: 4px; }
    .ai-guide { background: linear-gradient(135deg, var(--status-info-bg, #edf5ff), #ede9fe); border-radius: var(--radius); padding: 0.5rem 0.75rem; font-size: var(--font-size-caption); }
    .ai-label { font-weight: 700; color: var(--primary); margin-bottom: 4px; font-size: var(--font-size-sm); }
    .ai-what, .ai-how, .ai-score { color: var(--text-color-secondary); line-height: 1.4; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .w-full { width: 100%; }
    .mr-2 { margin-inline-end: 8px; }
  `]
})
export class AssessmentTemplatesComponent implements OnInit {
  private msg = inject(MessageService);

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  allTemplates: GrcRecord[] = [];
  filteredTemplates: GrcRecord[] = [];
  categories: GrcRecord[] = [];
  searchQuery = '';
  selectedCategory = '';
  selectedDifficulty = '';
  selectedIndustry = '';

  categoryOptions: GrcRecord[] = [];
  difficultyOptions = [
    { label: 'Beginner', value: 'beginner' },
    { label: 'Intermediate', value: 'intermediate' },
    { label: 'Advanced', value: 'advanced' },
  ];
  industryOptions = [
    { label: 'All Industries', value: 'all' },
    { label: 'Finance', value: 'finance' },
    { label: 'Healthcare', value: 'healthcare' },
    { label: 'Technology', value: 'technology' },
    { label: 'Telecom', value: 'telecom' },
    { label: 'Energy', value: 'energy' },
    { label: 'Government', value: 'government' },
  ];

  scoringOptions = [
    { label: 'Maturity 1-5', value: 'maturity_1_5' },
    { label: 'Percentage', value: 'percentage' },
    { label: 'Binary (Yes/No)', value: 'binary' },
    { label: 'Weighted', value: 'weighted' },
  ];

  stats: { label: string; value: number | string; color: string }[] = [];
  showDetail = false;
  detailTemplate: GrcRecord | null = null;
  detailQuestions: GrcRecord[] = [];

  // CRUD state
  showFormDialog = false;
  showDeleteDialog = false;
  editMode = false;
  editingId: string | null = null;
  deleteTarget: GrcRecord | null = null;
  form: GrcRecord = { name_en: '', name_ar: '', description_en: '', category: '', difficulty: 'intermediate', scoring_methodology: 'maturity_1_5', estimated_minutes: 60 };

  constructor(public i18n: I18nService, private complianceSvc: GrcComplianceService) {}

  ngOnInit() {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadTemplates());
    this.loadTemplates();
  }

  private loadTemplates(): void {
    this.loading = true;
    this.complianceSvc.getAssessmentTemplates().subscribe({
      next: (data) => {
        this.allTemplates = (data as any).templates || data || [];
        this.filteredTemplates = [...this.allTemplates];
        this.buildStats();
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    this.complianceSvc.getAssessmentTemplateCategories().subscribe({
      next: (data) => {
        this.categories = (data as any).categories || [];
        this.categoryOptions = this.categories.map((c) => ({ label: c.nameEn, value: c.id }));
      },
      error: (e) => devError("[API]", e)
    });
  }

  buildStats() {
    const beginner = this.allTemplates.filter(t => t.difficulty === 'beginner').length;
    const intermediate = this.allTemplates.filter(t => t.difficulty === 'intermediate').length;
    const advanced = this.allTemplates.filter(t => t.difficulty === 'advanced').length;
    const totalQ = this.allTemplates.reduce((s: number, t: GrcRecord) => s + (t.question_count || 0), 0);
    this.stats = [
      { label: 'Total Templates', value: this.allTemplates.length, color: '#6366f1' },
      { label: 'Total Questions', value: totalQ, color: '#10b981' },
      { label: 'Beginner', value: beginner, color: '#22c55e' },
      { label: 'Intermediate', value: intermediate, color: '#f59e0b' },
      { label: 'Advanced', value: advanced, color: '#ef4444' },
      { label: 'Categories', value: this.categories.length || '12', color: '#8b5cf6' },
    ];
  }

  applyFilters() {
    let result = [...this.allTemplates];
    if (this.selectedCategory) result = result.filter(t => t.category === this.selectedCategory);
    if (this.selectedDifficulty) result = result.filter(t => t.difficulty === this.selectedDifficulty);
    if (this.selectedIndustry && this.selectedIndustry !== 'all') result = result.filter(t => t.industry === this.selectedIndustry || t.industry === 'all');
    if (this.searchQuery) {
      const s = this.searchQuery.toLowerCase();
      result = result.filter(t =>
        (t.name_en || '').toLowerCase().includes(s) ||
        (t.name_ar || '').includes(s) ||
        (t.description_en || '').toLowerCase().includes(s) ||
        (t.tags || []).some((tag: string) => tag.includes(s))
      );
    }
    this.filteredTemplates = result;
  }

  difficultyColor(d: string): 'success' | 'warning' | 'danger' {
    if (d === 'beginner') return 'success';
    if (d === 'advanced') return 'danger';
    return 'warning';
  }

  scoringLabel(m: string): string {
    if (m === 'maturity_1_5') return 'Maturity 1-5';
    if (m === 'percentage') return 'Percentage';
    if (m === 'binary') return 'Yes/No';
    if (m === 'weighted') return 'Weighted';
    return m || 'Standard';
  }

  weightEntries(w: GrcRecord): { key: string; value: number }[] {
    if (!w || typeof w !== 'object') return [];
    return Object.entries(w).map(([key, value]) => ({ key, value: value as number }));
  }

  openDetail(tpl: GrcRecord) {
    this.detailTemplate = tpl;
    this.detailQuestions = [];
    this.showDetail = true;
    const id = tpl.template_id;
    this.complianceSvc.getAssessmentTemplateQuestions(id).subscribe({
      next: (data) => { this.detailQuestions = (data as any).questions || []; },
      error: (e) => devError("[API]", e)
    });
  }

  startAssessment(tpl: GrcRecord) {
    const id = tpl.template_id;
    const title = tpl.name_en || tpl.name || 'Assessment';
    this.complianceSvc.startAssessmentFromTemplate(id, title).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.assessmentStartedSuccess', { title }) }); },
      error: (err) => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: err?.error?.error || this.i18n.translate('common.failedToStartAssessment') }); }
    });
  }

  // --- CRUD Methods ---

  openCreateDialog(): void {
    this.editMode = false;
    this.editingId = null;
    this.form = { name_en: '', name_ar: '', description_en: '', category: '', difficulty: 'intermediate', scoring_methodology: 'maturity_1_5', estimated_minutes: 60 };
    this.showFormDialog = true;
  }

  openEditDialog(tpl: GrcRecord): void {
    this.editMode = true;
    this.editingId = tpl.template_id;
    this.form = {
      name_en: tpl.name_en || tpl.name || '',
      name_ar: tpl.name_ar || '',
      description_en: tpl.description_en || tpl.description || '',
      category: tpl.category || '',
      difficulty: tpl.difficulty || 'intermediate',
      scoring_methodology: tpl.scoring_methodology || 'maturity_1_5',
      estimated_minutes: tpl.estimated_minutes || 60,
    };
    this.showFormDialog = true;
  }

  saveTemplate(): void {
    if (!this.form.name_en) return;
    const obs = this.editMode && this.editingId
      ? this.complianceSvc.updateAssessmentTemplate(this.editingId, this.form)
      : this.complianceSvc.createAssessmentTemplate(this.form as any);
    obs.subscribe({
      next: () => {
        this.showFormDialog = false;
        this.loadTemplates();
        this.msg.add({ severity: 'success', summary: this.editMode ? this.i18n.translate('common.updated') : this.i18n.translate('common.created'), detail: this.i18n.translate(this.editMode ? 'common.templateUpdated' : 'common.templateCreated'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.operationFailed'), life: 4000 }); }
    });
  }

  confirmDelete(tpl: GrcRecord): void {
    this.deleteTarget = tpl;
    this.showDeleteDialog = true;
  }

  deleteTemplate(): void {
    if (!this.deleteTarget) return;
    this.complianceSvc.deleteAssessmentTemplate(this.deleteTarget.template_id).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.deleteTarget = null;
        this.loadTemplates();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.deleted'), detail: this.i18n.translate('common.templateRemoved'), life: 3000 });
      },
      error: () => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.deleteFailed'), life: 4000 }); }
    });
  }
}
