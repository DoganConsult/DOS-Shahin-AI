import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TabViewModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AccordionModule } from 'primeng/accordion';
import { SkeletonModule } from 'primeng/skeleton';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { RouterModule } from '@angular/router';
import { ApiClientService } from "@app/core/services/api-client.service";

interface ModuleEntry { route: string; icon: string; name_en: string; name_ar: string; description_en: string; description_ar: string; lifecyclePhase: string; }
interface ActionMatrixEntry { resource: string; resource_en: string; resource_ar: string; permissions: { read: boolean; write: boolean; delete: boolean; manage: boolean }; }
interface WorkflowEntry { templateKey: string; name_en: string; name_ar: string; description_en: string; description_ar: string; participationType: string; lifecyclePhase: string; }
interface WidgetEntry { widgetId: string; name_en: string; name_ar: string; description_en: string; description_ar: string; }
interface ReportEntry { reportId: string; name_en: string; name_ar: string; description_en: string; description_ar: string; frequency: string; }
interface NotificationEntry { type: string; name_en: string; name_ar: string; description_en: string; description_ar: string; enabled: boolean; }
interface TaskGuideStep { stepNumber: number; title_en: string; title_ar: string; description_en: string; description_ar: string; pageLink?: string; requiredPermission?: string; }
interface TaskGuide { guideId: string; title_en: string; title_ar: string; description_en: string; description_ar: string; profileIds: string[]; steps: TaskGuideStep[]; }
interface PlaybookSnapshot {
  role: string; profileId: string | null; generatedAt: string; preferArabic: boolean;
  modules: ModuleEntry[]; actionMatrix: ActionMatrixEntry[]; workflows: WorkflowEntry[];
  widgets: WidgetEntry[]; reports: ReportEntry[]; notifications: NotificationEntry[]; taskGuides: TaskGuide[];
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-playbook',
    imports: [CommonModule, PageShellComponent, TabViewModule, TableModule, TagModule, AccordionModule, SkeletonModule, AiPanelComponent, RouterModule],
    template: `
    <app-page-shell icon="book" [title]="i18n.translate('playbook.title')" [subtitle]="i18n.translate('playbook.subtitle')" [breadcrumbs]="['Dashboard', 'Playbook']" [loading]="loading">
      <p-tabView>
        <!-- Tab 1: Modules -->
        <p-tabPanel [header]="i18n.translate('playbook.modules')">
          <div class="pb-grid">
            <div *ngFor="let phase of modulePhases" class="pb-phase-group">
              <h3 class="pb-phase-label">{{ phase }}</h3>
              <div class="pb-module-list">
                <div *ngFor="let mod of modulesByPhase(phase)" class="pb-module-card">
                  <i [class]="'pi pi-' + mod.icon" class="pb-mod-icon"></i>
                  <div>
                    <div class="pb-mod-name">{{ i18n.localize(mod.name_en, mod.name_ar) }}</div>
                    <div class="pb-mod-desc">{{ i18n.localize(mod.description_en, mod.description_ar) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </p-tabPanel>

        <!-- Tab 2: Action Matrix -->
        <p-tabPanel [header]="i18n.translate('playbook.actions')">
          <p-table aria-label="Data table" [value]="playbook?.actionMatrix || []" [paginator]="false" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.translate('playbook.resource') }}</th>
                <th>{{ i18n.translate('common.read') }}</th>
                <th>{{ i18n.translate('common.write') }}</th>
                <th>{{ i18n.translate('common.delete') }}</th>
                <th>{{ i18n.translate('playbook.manage') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-entry>
              <tr>
                <td>{{ i18n.localize(entry.resource_en, entry.resource_ar) }}</td>
                <td><i [class]="entry.permissions.read ? 'pi pi-check text-success' : 'pi pi-times text-danger'"></i></td>
                <td><i [class]="entry.permissions.write ? 'pi pi-check text-success' : 'pi pi-times text-danger'"></i></td>
                <td><i [class]="entry.permissions.delete ? 'pi pi-check text-success' : 'pi pi-times text-danger'"></i></td>
                <td><i [class]="entry.permissions.manage ? 'pi pi-check text-success' : 'pi pi-times text-danger'"></i></td>
              </tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Tab 3: Workflows -->
        <p-tabPanel [header]="i18n.translate('playbook.workflows')">
          <div *ngIf="!playbook?.workflows?.length" class="pb-empty">
            <i class="pi pi-inbox"></i>
            <p>{{ i18n.translate('common.noData') }}</p>
          </div>
          <div class="pb-card-grid">
            <div *ngFor="let wf of playbook?.workflows || []" class="pb-wf-card">
              <div class="pb-wf-header">
                <span class="pb-wf-name">{{ i18n.localize(wf.name_en, wf.name_ar) }}</span>
                <p-tag [value]="wf.participationType" [severity]="wf.participationType === 'initiator' ? 'success' : wf.participationType === 'approver' ? 'warning' : 'info'" />
              </div>
              <p class="pb-wf-desc">{{ i18n.localize(wf.description_en, wf.description_ar) }}</p>
              <span class="pb-wf-phase">{{ wf.lifecyclePhase }}</span>
            </div>
          </div>
        </p-tabPanel>

        <!-- Tab 4: Dashboards -->
        <p-tabPanel [header]="i18n.translate('playbook.dashboards')">
          <div class="pb-card-grid">
            <div *ngFor="let w of playbook?.widgets || []" class="pb-widget-card">
              <div class="pb-widget-name">{{ i18n.localize(w.name_en, w.name_ar) }}</div>
              <div class="pb-widget-desc">{{ i18n.localize(w.description_en, w.description_ar) }}</div>
            </div>
          </div>
        </p-tabPanel>

        <!-- Tab 5: Reports -->
        <p-tabPanel [header]="i18n.translate('playbook.reports')">
          <div *ngIf="!playbook?.reports?.length" class="pb-empty">
            <i class="pi pi-inbox"></i>
            <p>{{ i18n.translate('common.noData') }}</p>
          </div>
          <div class="pb-card-grid">
            <div *ngFor="let r of playbook?.reports || []" class="pb-report-card">
              <div class="pb-report-name">{{ i18n.localize(r.name_en, r.name_ar) }}</div>
              <div class="pb-report-desc">{{ i18n.localize(r.description_en, r.description_ar) }}</div>
              <p-tag [value]="r.frequency" severity="info" />
            </div>
          </div>
        </p-tabPanel>

        <!-- Tab 6: Notifications -->
        <p-tabPanel [header]="i18n.translate('playbook.notifications')">
          <div *ngIf="!playbook?.notifications?.length" class="pb-empty">
            <i class="pi pi-inbox"></i>
            <p>{{ i18n.translate('common.noData') }}</p>
          </div>
          <div class="pb-card-grid">
            <div *ngFor="let n of playbook?.notifications || []" class="pb-notif-card">
              <div class="pb-notif-header">
                <span class="pb-notif-name">{{ i18n.localize(n.name_en, n.name_ar) }}</span>
                <p-tag [value]="n.enabled ? 'Enabled' : 'Disabled'" [severity]="n.enabled ? 'success' : 'secondary'" />
              </div>
              <div class="pb-notif-desc">{{ i18n.localize(n.description_en, n.description_ar) }}</div>
            </div>
          </div>
        </p-tabPanel>

        <!-- Tab 7: Task Guides -->
        <p-tabPanel [header]="i18n.translate('playbook.guides')">
          <div *ngIf="!playbook?.taskGuides?.length" class="pb-empty">
            <i class="pi pi-inbox"></i>
            <p>{{ i18n.translate('common.noData') }}</p>
          </div>
          <p-accordion *ngIf="playbook?.taskGuides?.length">
            <p-accordionTab *ngFor="let guide of playbook?.taskGuides || []" [header]="i18n.localize(guide.title_en, guide.title_ar)">
              <p class="pb-guide-desc">{{ i18n.localize(guide.description_en, guide.description_ar) }}</p>
              <ol class="pb-steps">
                <li *ngFor="let step of guide.steps" class="pb-step">
                  <div class="pb-step-title">{{ step.stepNumber }}. {{ i18n.localize(step.title_en, step.title_ar) }}</div>
                  <div class="pb-step-desc">{{ i18n.localize(step.description_en, step.description_ar) }}</div>
                  <a *ngIf="step.pageLink" [routerLink]="step.pageLink" class="pb-step-link">
                    <i class="pi pi-external-link"></i> {{ i18n.translate('playbook.goToPage') }}
                  </a>
                </li>
              </ol>
            </p-accordionTab>
          </p-accordion>
        </p-tabPanel>
      </p-tabView>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">Retry</button>
      </div>
    </app-page-shell>
    <app-ai-panel module="governance" />
  `,
    styles: [`
    .pb-grid { display: flex; flex-direction: column; gap: var(--space-lg); }
    .pb-phase-label { font-size: var(--font-size-md); font-weight: var(--font-bold); color: var(--primary-dark); text-transform: capitalize; margin: 0 0 var(--space-sm); }
    .pb-module-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-md); }
    .pb-module-card { display: flex; align-items: flex-start; gap: var(--space-md); padding: var(--space-md); background: var(--surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); }
    .pb-mod-icon { font-size: var(--font-size-xl); color: var(--primary); margin-top: 2px; }
    .pb-mod-name { font-weight: var(--font-medium); color: var(--text-heading); }
    .pb-mod-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 2px; }
    .pb-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-md); }
    .pb-wf-card, .pb-widget-card, .pb-report-card, .pb-notif-card { padding: var(--space-md); background: var(--surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); }
    .pb-wf-header, .pb-notif-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm); }
    .pb-wf-name, .pb-widget-name, .pb-report-name, .pb-notif-name { font-weight: var(--font-medium); color: var(--text-heading); }
    .pb-wf-desc, .pb-widget-desc, .pb-report-desc, .pb-notif-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: var(--space-xs); }
    .pb-wf-phase { font-size: var(--font-size-xs); color: var(--primary); text-transform: capitalize; }
    .pb-empty { text-align: center; padding: var(--space-xl); color: var(--text-muted); }
    .pb-empty .pi { font-size: var(--font-size-4xl); }
    .pb-guide-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: var(--space-md); }
    .pb-steps { padding-inline-start: 0; list-style: none; display: flex; flex-direction: column; gap: var(--space-md); }
    .pb-step { padding: var(--space-sm); background: var(--surface-ice); border-radius: var(--radius-sm); }
    .pb-step-title { font-weight: var(--font-medium); color: var(--text-heading); }
    .pb-step-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 2px; }
    .pb-step-link { font-size: var(--font-size-sm); color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; }
    .text-success { color: var(--success); }
    .text-danger { color: var(--error); }
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
    @media (max-width: 768px) { .pb-module-list, .pb-card-grid { grid-template-columns: 1fr; } }
  `]
})
export class PlaybookComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  error = '';
  playbook: PlaybookSnapshot | null = null;

  get modulePhases(): string[] {
    if (!this.playbook) return [];
    const phases: string[] = [];
    for (const mod of this.playbook.modules) {
      if (!phases.includes(mod.lifecyclePhase)) phases.push(mod.lifecyclePhase);
    }
    return phases;
  }

  modulesByPhase(phase: string): ModuleEntry[] {
    return this.playbook?.modules.filter(m => m.lifecyclePhase === phase) || [];
  }

  ngOnInit(): void {
    this.error = '';
    this.apiclientSvc.get('/playbook').subscribe({
      next: (data: Record<string, unknown>) => { this.playbook = data as any; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); },
    });
  }

}
