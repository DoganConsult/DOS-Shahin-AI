import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { DropdownModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { devError } from '../../core/utils/dev-logger';
import { ApiClientService } from "@app/core/services/api-client.service";

const LIFECYCLE_STATES = ['draft', 'design', 'implementation', 'testing', 'effective', 'remediation', 'retired'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-control-lifecycle',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent,
    CardModule, ButtonModule, TagModule, TimelineModule, DropdownModule, ProgressBarModule, AppDatePipe],
  template: `
    <app-page-shell
      icon="sync"
      [title]="i18n.translate('grcOs.controlLifecycle')"
      [subtitle]="'Manage control states and transitions'"
      [breadcrumbs]="['Dashboard', 'Control Lifecycle']"
      [loading]="loading">

      <div class="grid">
        <div class="col-8">
          <p-card header="Lifecycle State Machine">
            <div class="state-machine">
              @for (state of states; track state) {
                <div class="state-node" [class.active]="selectedControl?.current_state === state"
                     [class.completed]="isCompleted(state)">
                  <div class="state-icon">{{ getStateIcon(state) }}</div>
                  <div class="state-name">{{ i18n.translate('grcOs.lifecycleStates.' + state) }}</div>
                </div>
                @if (!$last) { <div class="state-arrow">→</div> }
              }
            </div>

            @if (selectedControl) {
              <div class="mt-4">
                <h4>{{ selectedControl.title_en }}</h4>
                <p>Current State: <p-tag [value]="selectedControl.current_state" [severity]="getStateSeverity(selectedControl.current_state)" /></p>
                <div class="mt-2">
                  <span class="me-2">Transition to:</span>
                  @for (t of availableTransitions; track t) {
                    <p-button [label]="t" size="small" class="me-1" (onClick)="transitionControl(t)" />
                  }
                </div>
              </div>
            }
          </p-card>

          <p-card header="Transition History" styleClass="mt-3">
            @if (history.length > 0) {
              <p-timeline [value]="history" layout="horizontal">
                <ng-template pTemplate="content" let-event>
                  <div class="text-sm">
                    <strong>{{ event.to_state }}</strong>
                    <app-status-badge [status]="event.to_state" />
                    <div class="text-xs text-color-secondary">{{ event.transitioned_at | appDate:'short' }}</div>
                    <div class="text-xs">{{ event.transitioned_by }}</div>
                  </div>
                </ng-template>
              </p-timeline>
            } @else {
              <p class="text-color-secondary">No transitions recorded</p>
            }
          </p-card>
        </div>

        <div class="col-4">
          <p-card header="Select Control">
            <p-dropdown [options]="controlOptions" [(ngModel)]="selectedControlId"
                        placeholder="Choose a control" [filter]="true" (onChange)="loadControl()" styleClass="w-full" />
          </p-card>

          <p-card header="Evidence Completeness" styleClass="mt-3">
            @if (selectedControl) {
              <div class="mb-2">{{ evidenceComplete }}% Complete</div>
              <p-progressBar [value]="evidenceComplete" [showValue]="false"
                             [style]="{'height': '12px'}" />
              <div class="text-sm text-color-secondary mt-1">
                {{ evidenceCount }} / {{ evidenceRequired }} evidence items
              </div>
            } @else {
              <p class="text-color-secondary">Select a control to view evidence</p>
            }
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .state-machine { display: flex; align-items: center; justify-content: center; gap: 0.5rem; flex-wrap: wrap; padding: 1rem; }
    .state-node { text-align: center; padding: 0.75rem 1rem; border-radius: var(--radius); background: var(--surface-ground); border: 2px solid var(--surface-border); min-width: 80px; }
    .state-node.active { border-color: var(--primary-color); background: var(--primary-color); color: white; }
    .state-node.completed { border-color: var(--green-500); }
    .state-icon { font-size: var(--font-size-body-lg); }
    .state-name { font-size: var(--font-size-sm); margin-top: 0.25rem; }
    .state-arrow { font-size: var(--font-size-body-lg); color: var(--text-color-secondary); }
  `]
})
export class ControlLifecycleComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  states = LIFECYCLE_STATES;
  controls: Record<string, any>[] = [];
  controlOptions: Record<string, any>[] = [];
  selectedControlId: string | null = null;
  selectedControl: Record<string, any> | null = null;
  history: Record<string, any>[] = [];
  availableTransitions: string[] = [];
  evidenceComplete = 0;
  evidenceCount = 0;
  evidenceRequired = 0;

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/ucf/controls').subscribe({
      next: (data: any) => {
        this.controls = data.controls || data || [];
        this.controlOptions = this.controls.map((c: Record<string, any>) => ({ label: c.title_en || c.control_id, value: c.control_id }));
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  loadControl() {
    if (!this.selectedControlId) return;
    this.selectedControl = this.controls.find(c => c.control_id === this.selectedControlId) || { control_id: this.selectedControlId, current_state: 'draft', title_en: this.selectedControlId };
    this.apiclientSvc.get(`/lifecycle/controls/${this.selectedControlId}/history`).subscribe({
      next: (data: any) => { this.history = data.history || data || []; },
      error: () => { this.history = []; }
    });
    this.computeTransitions();
    this.apiclientSvc.get(`/evidence-catalog/catalog/${this.selectedControlId}`).subscribe({
      next: (data: any) => {
        this.evidenceRequired = data.required || 0;
        this.evidenceCount = data.collected || 0;
        this.evidenceComplete = this.evidenceRequired > 0 ? Math.round(this.evidenceCount / this.evidenceRequired * 100) : 0;
      },
      error: () => { this.evidenceComplete = 0; this.evidenceCount = 0; this.evidenceRequired = 0; }
    });
  }

  computeTransitions() {
    const current = this.selectedControl?.current_state || 'draft';
    const idx = LIFECYCLE_STATES.indexOf(current);
    this.availableTransitions = [];
    if (idx < LIFECYCLE_STATES.length - 1) this.availableTransitions.push(LIFECYCLE_STATES[idx + 1]);
    if (current === 'effective') this.availableTransitions.push('remediation');
    if (current === 'remediation') this.availableTransitions.push('testing');
  }

  transitionControl(toState: string) {
    if (!this.selectedControlId) return;
    this.apiclientSvc.post(`/lifecycle/controls/${this.selectedControlId}/transition`, { toState }).subscribe({
      next: () => { this.loadControl(); },
      error: (e: unknown) => devError("[API]", e)
    });
  }

  isCompleted(state: string): boolean {
    if (!this.selectedControl) return false;
    const currentIdx = LIFECYCLE_STATES.indexOf(this.selectedControl.current_state);
    return LIFECYCLE_STATES.indexOf(state) < currentIdx;
  }

  getStateIcon(state: string): string {
    const icons: Record<string, string> = { draft: '📝', design: '🎨', implementation: '🔧', testing: '🧪', effective: '✅', remediation: '🔄', retired: '📦' };
    return icons[state] || '⚪';
  }

  getStateSeverity(state: string): "success" | "info" | "warning" | "danger" | "secondary" | "contrast" | undefined {
    const map: Record<string, any> = { draft: 'info', design: 'info', implementation: 'warning', testing: 'warning', effective: 'success', remediation: 'danger', retired: 'secondary' };
    return map[state] || 'info';
  }
}
