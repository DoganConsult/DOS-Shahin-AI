/**
 * Regulatory Reasoning Studio Component
 *
 * Interactive reasoning walkthrough with four panels:
 * - Left: regulation document tree (clauses)
 * - Center: selected clause detail with type badge
 * - Right: linked entities trail (obligation -> control -> evidence -> assertion)
 * - Bottom: overall reasoning chain visualization
 */
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface DocumentElement {
  elementId: string;
  parentId?: string;
  ref: string;
  titleEn: string;
  titleAr?: string;
  type: 'obligation' | 'prohibition' | 'permission' | 'exception' | 'section' | 'clause';
  textEn?: string;
  textAr?: string;
  children?: DocumentElement[];
}

interface LinkedEntity {
  entityId: string;
  entityType: 'obligation' | 'control' | 'evidence' | 'assertion';
  titleEn: string;
  titleAr?: string;
  status: string;
  ref?: string;
}

interface ReasoningStep {
  stepIndex: number;
  label: string;
  labelAr?: string;
  entityType: string;
  entityRef: string;
  status: string;
  detail?: string;
}

interface ExplainResult {
  controlId: string;
  status: string;
  confidence: number;
  linkedEntities: LinkedEntity[];
  reasoningChain: ReasoningStep[];
}

@Component({
    selector: 'app-regulatory-reasoning-studio',
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="reasoning-studio">
      <header class="page-header">
        <div>
          <h1>Regulatory Reasoning Studio</h1>
          <span class="header-ar">استوديو التحليل التنظيمي</span>
        </div>
        <div class="header-actions">
          <input class="form-input" [(ngModel)]="documentId"
                 placeholder="Document ID / معرف المستند" />
          <button class="btn-primary" (click)="loadDocument()">
            Load / تحميل
          </button>
        </div>
      </header>

      <div class="studio-layout">
        <!-- Left panel: document tree -->
        <div class="left-panel">
          <h3>Document Tree / شجرة المستند</h3>
          @if (loading()) {
            <div class="loading-text">Loading...</div>
          }
          @if (elements().length === 0 && !loading()) {
            <div class="empty-text">Enter a document ID and click Load.</div>
          }
          <div class="tree-container">
            @for (el of elements(); track el.elementId) {
              <div class="tree-node" [class.active]="selectedElement()?.elementId === el.elementId"
                   [class]="'type-' + el.type"
                   (click)="selectElement(el)">
                <span class="node-ref">{{ el.ref }}</span>
                <span class="node-title">{{ el.titleEn }}</span>
                <span class="type-badge" [class]="'badge-' + el.type">{{ el.type }}</span>
              </div>
              @if (el.children) {
                @for (child of el.children; track child.elementId) {
                  <div class="tree-node tree-child"
                       [class.active]="selectedElement()?.elementId === child.elementId"
                       [class]="'type-' + child.type"
                       (click)="selectElement(child)">
                    <span class="node-ref">{{ child.ref }}</span>
                    <span class="node-title">{{ child.titleEn }}</span>
                    <span class="type-badge" [class]="'badge-' + child.type">{{ child.type }}</span>
                  </div>
                }
              }
            }
          </div>
        </div>

        <!-- Center panel: clause detail -->
        <div class="center-panel">
          @if (selectedElement()) {
            <div class="clause-header">
              <span class="type-badge large" [class]="'badge-' + selectedElement()!.type">
                {{ selectedElement()!.type }}
              </span>
              <h3>{{ selectedElement()!.ref }} - {{ selectedElement()!.titleEn }}</h3>
              @if (selectedElement()!.titleAr) {
                <p class="clause-title-ar">{{ selectedElement()!.titleAr }}</p>
              }
            </div>
            <div class="clause-body">
              @if (selectedElement()!.textEn) {
                <div class="clause-text">
                  <h4>English</h4>
                  <p>{{ selectedElement()!.textEn }}</p>
                </div>
              }
              @if (selectedElement()!.textAr) {
                <div class="clause-text rtl">
                  <h4>العربية</h4>
                  <p>{{ selectedElement()!.textAr }}</p>
                </div>
              }
            </div>
          } @else {
            <div class="empty-center">
              <p>Select a clause from the document tree.</p>
              <p class="rtl">اختر بندا من شجرة المستند.</p>
            </div>
          }
        </div>

        <!-- Right panel: linked entities trail -->
        <div class="right-panel">
          <h3>Linked Entities / الكيانات المرتبطة</h3>
          @if (linkedEntities().length > 0) {
            <div class="entities-trail">
              @for (ent of linkedEntities(); track ent.entityId) {
                <div class="entity-node" [class]="'ent-' + ent.entityType"
                     [class.expanded]="expandedEntity() === ent.entityId"
                     (click)="toggleEntity(ent.entityId)">
                  <div class="ent-header">
                    <span class="ent-type-badge" [class]="'ent-badge-' + ent.entityType">
                      {{ ent.entityType }}
                    </span>
                    <span class="ent-title">{{ ent.titleEn }}</span>
                  </div>
                  <div class="ent-meta">
                    @if (ent.ref) {
                      <span class="ent-ref">{{ ent.ref }}</span>
                    }
                    <span class="ent-status" [class]="'status-' + ent.status">{{ ent.status }}</span>
                  </div>
                  @if (ent.titleAr && expandedEntity() === ent.entityId) {
                    <div class="ent-detail">
                      <span class="ent-title-ar">{{ ent.titleAr }}</span>
                    </div>
                  }
                </div>
                <!-- Arrow connector between entities -->
                @if (!$last) {
                  <div class="trail-connector">|</div>
                }
              }
            </div>
          } @else {
            <div class="empty-text">Select a clause to see linked entities.</div>
          }
        </div>
      </div>

      <!-- Bottom panel: reasoning chain -->
      @if (reasoningChain().length > 0) {
        <div class="bottom-panel">
          <h3>Reasoning Chain / سلسلة الاستدلال</h3>
          <div class="chain-container">
            @for (step of reasoningChain(); track step.stepIndex) {
              <div class="chain-step" [class]="'step-' + step.entityType"
                   [class.expanded]="expandedStep() === step.stepIndex"
                   (click)="toggleStep(step.stepIndex)">
                <div class="step-num">{{ step.stepIndex + 1 }}</div>
                <div class="step-body">
                  <span class="step-label">{{ step.label }}</span>
                  @if (step.labelAr) {
                    <span class="step-label-ar">{{ step.labelAr }}</span>
                  }
                  <span class="step-ref">{{ step.entityRef }}</span>
                  <span class="step-status" [class]="'status-' + step.status">{{ step.status }}</span>
                  @if (expandedStep() === step.stepIndex && step.detail) {
                    <p class="step-detail">{{ step.detail }}</p>
                  }
                </div>
              </div>
              @if (!$last) {
                <div class="chain-arrow">--></div>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    .reasoning-studio { padding: 20px; min-height: 100vh; background: var(--surface-ground, #11111b); color: var(--text-color, #cdd6f4); }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .page-header h1 { font-size: 22px; font-weight: 700; margin: 0; color: var(--primary-color, #89b4fa); }
    .header-ar { font-size: var(--font-size-base); color: var(--text-color-secondary, #a6adc8); direction: rtl; display: block; }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .form-input { padding: 6px 10px; border: 1px solid var(--surface-border, #45475a); border-radius: var(--radius-sm); background: var(--surface-card, #1e1e2e); color: var(--text-color, #cdd6f4); font-size: var(--font-size-sm); }
    .btn-primary { padding: 8px 16px; border: none; border-radius: var(--radius-sm); background: var(--primary-color, #89b4fa); color: var(--primary-color-text, #1e1e2e); font-weight: 600; cursor: pointer; font-size: var(--font-size-sm); }

    /* Studio layout: 3-column */
    .studio-layout { display: grid; grid-template-columns: 260px 1fr 280px; gap: 12px; margin-bottom: 16px; }

    /* Panels */
    .left-panel, .center-panel, .right-panel, .bottom-panel { background: var(--surface-card, #1e1e2e); border: 1px solid var(--surface-border, #313244); border-radius: var(--radius); padding: 12px; }
    .left-panel h3, .right-panel h3, .bottom-panel h3 { font-size: var(--font-size-sm); margin: 0 0 10px 0; color: var(--text-color-secondary, #a6adc8); }

    /* Tree */
    .tree-container { max-height: 500px; overflow-y: auto; }
    .tree-node { padding: 6px 8px; border-radius: var(--radius-xs); cursor: pointer; font-size: var(--font-size-sm); display: flex; gap: 6px; align-items: center; margin-bottom: 2px; }
    .tree-node:hover { background: color-mix(in srgb, var(--primary) 5%, transparent); }
    .tree-node.active { background: color-mix(in srgb, var(--primary) 15%, transparent); border-left: 2px solid var(--primary); }
    .tree-child { padding-left: 24px; }
    .node-ref { font-family: monospace; font-size: var(--font-size-xs); color: var(--text-color-secondary, #a6adc8); flex-shrink: 0; }
    .node-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Type badges */
    .type-badge { font-size: var(--font-size-nano); padding: 1px 5px; border-radius: 3px; font-weight: 600; text-transform: uppercase; flex-shrink: 0; }
    .type-badge.large { font-size: var(--font-size-xs); padding: 3px 8px; }
    .badge-obligation { background: color-mix(in srgb, var(--primary) 20%, transparent); color: var(--primary); }
    .badge-prohibition { background: color-mix(in srgb, var(--error) 20%, transparent); color: var(--error); }
    .badge-permission { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
    .badge-exception { background: color-mix(in srgb, var(--warning) 20%, transparent); color: var(--warning); }
    .badge-section { background: color-mix(in srgb, var(--text-muted) 20%, transparent); color: var(--text-muted); }
    .badge-clause { background: color-mix(in srgb, var(--hub-governance) 20%, transparent); color: var(--hub-governance); }

    /* Center panel */
    .clause-header { margin-bottom: 12px; }
    .clause-header h3 { font-size: var(--font-size-md); margin: 8px 0 0 0; }
    .clause-title-ar { font-size: var(--font-size-sm); direction: rtl; color: var(--text-color-secondary, #a6adc8); margin: 4px 0 0 0; }
    .clause-body { font-size: var(--font-size-sm); line-height: 1.6; }
    .clause-text { margin-bottom: 12px; }
    .clause-text h4 { font-size: var(--font-size-sm); margin: 0 0 4px 0; color: var(--text-color-secondary, #a6adc8); }
    .empty-center { text-align: center; padding: 40px 20px; color: var(--text-color-secondary, #6c7086); }

    /* Right panel: entities trail */
    .entities-trail { display: flex; flex-direction: column; align-items: center; }
    .entity-node { width: 100%; padding: 8px; border: 1px solid var(--surface-border, #313244); border-radius: var(--radius-sm); cursor: pointer; margin-bottom: 2px; }
    .entity-node:hover { border-color: var(--primary-color, #89b4fa); }
    .ent-header { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
    .ent-type-badge { font-size: var(--font-size-nano); padding: 1px 5px; border-radius: 3px; font-weight: 600; text-transform: uppercase; }
    .ent-badge-obligation { background: color-mix(in srgb, var(--primary) 20%, transparent); color: var(--primary); }
    .ent-badge-control { background: color-mix(in srgb, var(--info) 20%, transparent); color: var(--info); }
    .ent-badge-evidence { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
    .ent-badge-assertion { background: color-mix(in srgb, var(--hub-governance) 20%, transparent); color: var(--hub-governance); }
    .ent-title { font-size: var(--font-size-sm); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ent-meta { display: flex; gap: 6px; font-size: var(--font-size-xs); }
    .ent-ref { font-family: monospace; color: var(--text-color-secondary, #6c7086); }
    .ent-status { font-size: var(--font-size-nano); padding: 1px 5px; border-radius: 3px; }
    .ent-detail { margin-top: 4px; }
    .ent-title-ar { font-size: var(--font-size-xs); direction: rtl; color: var(--text-color-secondary, #a6adc8); }
    .trail-connector { text-align: center; color: var(--text-color-secondary, #6c7086); font-size: var(--font-size-base); margin: 2px 0; }

    /* Status colors */
    .status-compliant, .status-active, .status-approved { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
    .status-partial, .status-pending { background: color-mix(in srgb, var(--warning) 20%, transparent); color: var(--warning); }
    .status-non_compliant, .status-rejected { background: color-mix(in srgb, var(--error) 20%, transparent); color: var(--error); }
    .status-draft { background: color-mix(in srgb, var(--primary) 20%, transparent); color: var(--primary); }

    /* Bottom panel: reasoning chain */
    .bottom-panel { margin-top: 0; }
    .chain-container { display: flex; gap: 4px; align-items: center; overflow-x: auto; padding-bottom: 8px; }
    .chain-step { display: flex; gap: 8px; align-items: flex-start; padding: 8px 12px; border: 1px solid var(--surface-border, #313244); border-radius: var(--radius-sm); cursor: pointer; min-width: 160px; flex-shrink: 0; }
    .chain-step:hover { border-color: var(--primary-color, #89b4fa); }
    .step-num { width: 24px; height: 24px; border-radius: 50%; background: var(--primary-color, #89b4fa); color: var(--primary-color-text, #1e1e2e); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); font-weight: 700; flex-shrink: 0; }
    .step-body { display: flex; flex-direction: column; gap: 2px; }
    .step-label { font-size: var(--font-size-sm); font-weight: 600; }
    .step-label-ar { font-size: var(--font-size-nano); direction: rtl; color: var(--text-color-secondary, #a6adc8); }
    .step-ref { font-family: monospace; font-size: var(--font-size-nano); color: var(--text-color-secondary, #6c7086); }
    .step-status { font-size: var(--font-size-nano); padding: 1px 5px; border-radius: 3px; align-self: flex-start; }
    .step-detail { font-size: var(--font-size-xs); color: var(--text-color-secondary, #a6adc8); margin: 4px 0 0 0; }
    .chain-arrow { color: var(--text-color-secondary, #6c7086); font-family: monospace; flex-shrink: 0; }

    .loading-text, .empty-text { font-size: var(--font-size-sm); color: var(--text-color-secondary, #6c7086); padding: 12px 0; }
    .rtl { direction: rtl; }

    @media (max-width: 1000px) {
      .studio-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class RegulatoryReasoningStudioComponent {
  private http = inject(HttpClient);

  elements = signal<DocumentElement[]>([]);
  selectedElement = signal<DocumentElement | null>(null);
  linkedEntities = signal<LinkedEntity[]>([]);
  reasoningChain = signal<ReasoningStep[]>([]);
  loading = signal(false);
  expandedEntity = signal<string | null>(null);
  expandedStep = signal<number | null>(null);
  documentId = '';

  /** Load document elements (clause tree) */
  loadDocument(): void {
    if (!this.documentId) return;
    this.loading.set(true);
    this.elements.set([]);
    this.selectedElement.set(null);
    this.linkedEntities.set([]);
    this.reasoningChain.set([]);

    this.http.get<{ elements: DocumentElement[] }>(
      `/api/documents/${this.documentId}/elements`
    ).subscribe({
      next: (res) => { this.elements.set(res.elements || []); this.loading.set(false); },
      error: () => { this.elements.set([]); this.loading.set(false); },
    });
  }

  /** Select a clause and load its linked entities */
  selectElement(el: DocumentElement): void {
    this.selectedElement.set(el);
    this.linkedEntities.set([]);
    this.reasoningChain.set([]);

    // Load linked entities via the compliance assertion explain endpoint
    this.http.get<ExplainResult>(
      `/api/compliance-assertions/${el.elementId}/explain`
    ).subscribe({
      next: (res) => {
        this.linkedEntities.set(res.linkedEntities || []);
        this.reasoningChain.set(res.reasoningChain || []);
      },
      error: () => {
        this.linkedEntities.set([]);
        this.reasoningChain.set([]);
      },
    });
  }

  /** Toggle expanded state for an entity node */
  toggleEntity(entityId: string): void {
    this.expandedEntity.update(v => v === entityId ? null : entityId);
  }

  /** Toggle expanded state for a reasoning step */
  toggleStep(stepIndex: number): void {
    this.expandedStep.update(v => v === stepIndex ? null : stepIndex);
  }
}
