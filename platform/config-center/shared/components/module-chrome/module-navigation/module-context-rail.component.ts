import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextarea } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { ModuleAiPulseComponent } from '../../../widgets/presentation/pulse-refresh/module-ai-pulse.component';
import { RecentActivityTableComponent } from '../../tables-data/recent-activity-table.component';
import { EntityWorkflowPanelComponent } from '../../entity/entity-workflow-panel.component';
import type { ActivityRowVM } from '../../../models/module-overview.vm';

export interface RelatedRecord {
  id: string;
  type: string;
  label: string;
  icon: string;
  route?: string;
  severity?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface NoteEntry {
  id: string;
  author: string;
  timestamp: string;
  content: string;
  pinned?: boolean;
}

@Component({
    selector: 'app-module-context-rail',
    imports: [
        CommonModule, ButtonModule, TabViewModule, TooltipModule,
        InputTextarea, FormsModule,
        ModuleAiPulseComponent, RecentActivityTableComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <aside class="mcr" [attr.dir]="lang === 'ar' ? 'rtl' : 'ltr'" [class.mcr--collapsed]="collapsed()">
      <button class="mcr-toggle" (click)="collapsed.set(!collapsed())"
              [pTooltip]="collapsed() ? 'Expand' : 'Collapse'" tooltipPosition="left">
        <i class="pi" [ngClass]="collapsed() ? 'pi-chevron-left' : 'pi-chevron-right'"></i>
      </button>

      <div class="mcr-body" *ngIf="!collapsed()">
        <p-tabView [(activeIndex)]="activeTab" [scrollable]="true" styleClass="mcr-tabs">
          <p-tabPanel>
            <ng-template pTemplate="header">
              <i class="pi pi-sparkles"></i>
              <span>{{ lang === 'ar' ? 'AI' : 'AI' }}</span>
            </ng-template>
            <app-module-ai-pulse [moduleCode]="moduleCode" [lang]="lang" />
          </p-tabPanel>

          <p-tabPanel>
            <ng-template pTemplate="header">
              <i class="pi pi-history"></i>
              <span>{{ lang === 'ar' ? 'النشاط' : 'Activity' }}</span>
            </ng-template>
            <app-recent-activity-table [rows]="activity" [isAr]="lang === 'ar'" [pageSize]="5" />
          </p-tabPanel>

          <p-tabPanel>
            <ng-template pTemplate="header">
              <i class="pi pi-link"></i>
              <span>{{ lang === 'ar' ? 'مرتبط' : 'Related' }}</span>
            </ng-template>
            <div class="mcr-related">
              <div class="mcr-related-item" *ngFor="let r of relatedRecords"
                   [pTooltip]="r.label" tooltipPosition="left"
                   (click)="recordClick.emit(r)">
                <i class="pi" [ngClass]="'pi-' + r.icon" [style.color]="r.severity === 'danger' ? 'var(--error)' : 'var(--primary)'"></i>
                <span class="mcr-related-label">{{ r.label }}</span>
                <span class="mcr-related-type">{{ r.type }}</span>
              </div>
              <div *ngIf="relatedRecords.length === 0" class="mcr-empty">
                {{ lang === 'ar' ? 'لا توجد سجلات مرتبطة' : 'No related records' }}
              </div>
            </div>
          </p-tabPanel>

          <p-tabPanel>
            <ng-template pTemplate="header">
              <i class="pi pi-shield"></i>
              <span>{{ lang === 'ar' ? 'التدقيق' : 'Audit' }}</span>
            </ng-template>
            <div class="mcr-audit">
              <div class="mcr-audit-entry" *ngFor="let e of auditTrail">
                <div class="mcr-audit-time">{{ e.timestamp | date:'short' }}</div>
                <div class="mcr-audit-actor">{{ e.actor }}</div>
                <div class="mcr-audit-action">{{ e.action }}</div>
                <div class="mcr-audit-detail" *ngIf="e.detail">{{ e.detail }}</div>
              </div>
              <div *ngIf="auditTrail.length === 0" class="mcr-empty">
                {{ lang === 'ar' ? 'لا يوجد سجل تدقيق' : 'No audit trail' }}
              </div>
            </div>
          </p-tabPanel>

          <p-tabPanel>
            <ng-template pTemplate="header">
              <i class="pi pi-comment"></i>
              <span>{{ lang === 'ar' ? 'ملاحظات' : 'Notes' }}</span>
            </ng-template>
            <div class="mcr-notes">
              <div class="mcr-note" *ngFor="let n of notes" [class.mcr-note--pinned]="n.pinned">
                <div class="mcr-note-header">
                  <span class="mcr-note-author">{{ n.author }}</span>
                  <span class="mcr-note-time">{{ n.timestamp | date:'short' }}</span>
                  <i *ngIf="n.pinned" class="pi pi-bookmark-fill mcr-note-pin"></i>
                </div>
                <p class="mcr-note-body">{{ n.content }}</p>
              </div>
              <div class="mcr-note-add">
                <textarea pInputTextarea [(ngModel)]="newNote" [placeholder]="lang === 'ar' ? 'أضف ملاحظة...' : 'Add a note...'" rows="2"></textarea>
                <button pButton icon="pi pi-send" severity="secondary" size="small"
                        [disabled]="!newNote.trim()" (click)="addNote.emit(newNote); newNote = ''"></button>
              </div>
            </div>
          </p-tabPanel>
        </p-tabView>
      </div>
    </aside>
  `,
    styles: [`
    .mcr { width: 320px; background: var(--surface-0, #fff); border-inline-start: 1px solid var(--border-subtle, #e5e7eb); display: flex; flex-direction: column; position: relative; transition: width 0.2s; overflow: hidden; flex-shrink: 0; }
    .mcr--collapsed { width: 32px; }
    .mcr-toggle { position: absolute; top: 8px; inset-inline-start: 4px; z-index: 2; width: 24px; height: 24px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-0); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .mcr-toggle .pi { font-size: var(--font-size-xs); }
    [dir="rtl"] .mcr-toggle .pi { transform: scaleX(-1); }
    .mcr-body { padding: 40px 0 0; overflow-y: auto; flex: 1; }
    .mcr-tabs .p-tabview-nav { padding: 0 8px; }
    .mcr-tabs .p-tabview-nav li .p-tabview-nav-link { padding: 8px 10px; font-size: var(--font-size-sm); gap: 4px; }
    .mcr-tabs .p-tabview-panels { padding: 8px; }
    .mcr-related-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: var(--radius); cursor: pointer; transition: background 0.12s; }
    .mcr-related-item:hover { background: var(--surface-100, #f3f4f6); }
    .mcr-related-label { flex: 1; font-size: var(--font-size-caption); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mcr-related-type { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; }
    .mcr-empty { padding: 24px 12px; text-align: center; color: var(--text-muted); font-size: var(--font-size-caption); }
    .mcr-audit-entry { padding: 6px 0; border-bottom: 1px solid var(--surface-100, #f3f4f6); font-size: var(--font-size-sm); }
    .mcr-audit-time { color: var(--text-muted); }
    .mcr-audit-actor { font-weight: 600; }
    .mcr-audit-action { color: var(--primary); }
    .mcr-audit-detail { color: var(--text-muted); font-style: italic; }
    .mcr-note { padding: 8px; border-radius: var(--radius); background: var(--surface-ground, #f5f5f5); margin-bottom: 6px; }
    .mcr-note--pinned { border-inline-start: 3px solid var(--warning, #f59e0b); }
    .mcr-note-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .mcr-note-author { font-size: var(--font-size-sm); font-weight: 600; }
    .mcr-note-time { font-size: var(--font-size-xs); color: var(--text-muted); margin-inline-start: auto; }
    .mcr-note-pin { font-size: var(--font-size-xs); color: var(--warning); }
    .mcr-note-body { margin: 0; font-size: var(--font-size-caption); color: var(--text-body); line-height: 1.4; }
    .mcr-note-add { display: flex; gap: 6px; align-items: flex-end; margin-top: 8px; }
    .mcr-note-add textarea { flex: 1; font-size: var(--font-size-caption); resize: none; }
    @media (max-width: 1024px) { .mcr { display: none; } }
  `]
})
export class ModuleContextRailComponent {
  @Input() moduleCode = '';
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() activity: ActivityRowVM[] = [];
  @Input() relatedRecords: RelatedRecord[] = [];
  @Input() auditTrail: AuditEntry[] = [];
  @Input() notes: NoteEntry[] = [];
  @Output() recordClick = new EventEmitter<RelatedRecord>();
  @Output() addNote = new EventEmitter<string>();

  collapsed = signal(false);
  activeTab = 0;
  newNote = '';
}
