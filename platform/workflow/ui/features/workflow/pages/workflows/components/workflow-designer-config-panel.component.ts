/**
 * Workflow Designer Config Panel — Node and edge configuration sidebar.
 *
 * Presentational child of WorkflowDesignerComponent.
 * Displays type-specific configuration fields for the selected node or edge.
 */

import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { WorkflowNode, WorkflowEdge } from '../models/workflow.models';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-designer-config-panel',
    imports: [
        CommonModule, FormsModule,
        ButtonModule, InputTextModule, InputTextarea, DropdownModule,
    ],
    template: `
    <div class="config-panel" *ngIf="selectedNode || selectedEdgeIndex !== null">
      <!-- Node Config -->
      <ng-container *ngIf="selectedNode">
        <div class="config-header">
          <h4><i [class]="nodeIcon(selectedNode.type)"></i> {{ selectedNode.label }}</h4>
          <button aria-label="Close" class="close-btn" (click)="closeNode.emit()"><i class="pi pi-times"></i></button>
        </div>
        <div class="config-body">
          <div class="field">
            <label>Label</label>
            <input pInputText [(ngModel)]="selectedNode.label" class="w-full" />
          </div>
          <div class="field">
            <label>Operation Mode</label>
            <p-dropdown [(ngModel)]="selectedNode.config['operationMode']"
              [options]="stepOperationModeOptions"
              optionLabel="label" optionValue="value"
              placeholder="Inherit from workflow..."
              [showClear]="true"
              styleClass="w-full" />
            <small style="color:var(--text-color-secondary)">Override agent autonomy level for this step</small>
          </div>

          <!-- Trigger Config -->
          <ng-container *ngIf="selectedNode.type === 'trigger'">
            <div class="field"><label>Event Type</label>
              <p-dropdown [(ngModel)]="selectedNode.config['event']" [options]="triggerEventOptions" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
            <div class="field"><label>Filter (JSON)</label><textarea pInputTextarea [(ngModel)]="selectedNode.config['filter']" [rows]="2" class="w-full" placeholder='{"severity":"critical"}'></textarea></div>
          </ng-container>

          <!-- Condition Config -->
          <ng-container *ngIf="selectedNode.type === 'condition'">
            <div class="field"><label>Expression</label><textarea pInputTextarea [(ngModel)]="selectedNode.config['expression']" [rows]="2" class="w-full" placeholder="risk.score >= 15"></textarea></div>
            <div class="field"><label>True Branch</label><input pInputText [(ngModel)]="selectedNode.config['trueLabel']" class="w-full" placeholder="Yes" aria-label="Yes" /></div>
            <div class="field"><label>False Branch</label><input pInputText [(ngModel)]="selectedNode.config['falseLabel']" class="w-full" placeholder="No" aria-label="No" /></div>
          </ng-container>

          <!-- API Call Config -->
          <ng-container *ngIf="selectedNode.type === 'api_call'">
            <div class="field"><label>URL</label><input pInputText [(ngModel)]="selectedNode.config['url']" placeholder="https://api.example.com/endpoint" aria-label="https://api.example.com/endpoint" class="w-full" /></div>
            <div class="field"><label>Method</label>
              <p-dropdown [(ngModel)]="selectedNode.config['method']" [options]="httpMethods" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
            <div class="field"><label>Headers (JSON)</label><textarea pInputTextarea [(ngModel)]="selectedNode.config['headers']" [rows]="2" class="w-full" placeholder='{"Authorization":"Bearer ..."}'></textarea></div>
            <div class="field"><label>Body (JSON)</label><textarea pInputTextarea [(ngModel)]="selectedNode.config['body']" [rows]="3" class="w-full"></textarea></div>
          </ng-container>

          <!-- Send Email Config -->
          <ng-container *ngIf="selectedNode.type === 'send_email'">
            <div class="field"><label>To</label><input pInputText [(ngModel)]="selectedNode.config['to']" placeholder="user@org.com" aria-label="user@org.com" class="w-full" /></div>
            <div class="field"><label>Subject</label><input pInputText [(ngModel)]="selectedNode.config['subject']" class="w-full" /></div>
            <div class="field"><label>Body Template</label><textarea pInputTextarea [(ngModel)]="selectedNode.config['bodyTemplate']" [rows]="4" class="w-full"></textarea></div>
          </ng-container>

          <!-- Webhook Config -->
          <ng-container *ngIf="selectedNode.type === 'webhook'">
            <div class="field"><label>Webhook URL</label><input pInputText [(ngModel)]="selectedNode.config['url']" placeholder="https://hooks.slack.com/..." aria-label="https://hooks.slack.com/..." class="w-full" /></div>
            <div class="field"><label>Secret</label><input pInputText [(ngModel)]="selectedNode.config['secret']" class="w-full" /></div>
            <div class="field"><label>Payload (JSON)</label><textarea pInputTextarea [(ngModel)]="selectedNode.config['payload']" [rows]="3" class="w-full"></textarea></div>
          </ng-container>

          <!-- DB Query Config -->
          <ng-container *ngIf="selectedNode.type === 'db_query'">
            <div class="field"><label>SQL Query</label><textarea pInputTextarea [(ngModel)]="selectedNode.config['query']" [rows]="4" class="w-full" placeholder="SELECT * FROM ..." aria-label="SELECT * FROM ..."></textarea></div>
            <div class="field"><label>Parameters (JSON)</label><input pInputText [(ngModel)]="selectedNode.config['params']" class="w-full" placeholder='["param1"]' /></div>
          </ng-container>

          <!-- Approval Config -->
          <ng-container *ngIf="selectedNode.type === 'approval'">
            <div class="field"><label>Approver</label>
              <p-dropdown [(ngModel)]="selectedNode.config['approver']" [options]="approverOptions" optionLabel="label" optionValue="value" [filter]="true" [showClear]="true" placeholder="Select approver..." styleClass="w-full" /></div>
            <div class="field"><label>Or by Role</label>
              <p-dropdown [(ngModel)]="selectedNode.config['approverRole']" [options]="roleOptions" optionLabel="label" optionValue="value" [showClear]="true" placeholder="Any member with role..." styleClass="w-full" /></div>
            <div class="field"><label>SLA (hours)</label><input pInputText [(ngModel)]="selectedNode.config['slaHours']" type="number" class="w-full" /></div>
            <div class="field"><label>Escalation 1</label>
              <p-dropdown [(ngModel)]="selectedNode.config['escalation1']" [options]="approverOptions" optionLabel="label" optionValue="value" [filter]="true" [showClear]="true" placeholder="1st escalation..." styleClass="w-full" /></div>
            <div class="field"><label>Escalation 2</label>
              <p-dropdown [(ngModel)]="selectedNode.config['escalation2']" [options]="approverOptions" optionLabel="label" optionValue="value" [filter]="true" [showClear]="true" placeholder="2nd escalation..." styleClass="w-full" /></div>
          </ng-container>

          <!-- Notification Config -->
          <ng-container *ngIf="selectedNode.type === 'notification'">
            <div class="field"><label>Recipient</label>
              <p-dropdown [(ngModel)]="selectedNode.config['userId']" [options]="teamMemberOptions" optionLabel="label" optionValue="value" [filter]="true" [showClear]="true" placeholder="Select recipient..." styleClass="w-full" /></div>
            <div class="field"><label>Or by Role</label>
              <p-dropdown [(ngModel)]="selectedNode.config['notifyRole']" [options]="roleOptions" optionLabel="label" optionValue="value" [showClear]="true" placeholder="All with role..." styleClass="w-full" /></div>
            <div class="field"><label>Title</label><input pInputText [(ngModel)]="selectedNode.config['title']" class="w-full" /></div>
            <div class="field"><label>Body</label><textarea pInputTextarea [(ngModel)]="selectedNode.config['body']" [rows]="2" class="w-full"></textarea></div>
            <div class="field"><label>Link</label><input pInputText [(ngModel)]="selectedNode.config['link']" class="w-full" /></div>
          </ng-container>

          <!-- Create Task Config -->
          <ng-container *ngIf="selectedNode.type === 'create_task'">
            <div class="field"><label>Task Title</label><input pInputText [(ngModel)]="selectedNode.config['title']" class="w-full" /></div>
            <div class="field"><label>Assignee</label>
              <p-dropdown [(ngModel)]="selectedNode.config['assignee']" [options]="teamMemberOptions" optionLabel="label" optionValue="value" [filter]="true" [showClear]="true" placeholder="Select assignee..." styleClass="w-full" /></div>
            <div class="field"><label>Or by Role</label>
              <p-dropdown [(ngModel)]="selectedNode.config['assigneeRole']" [options]="roleOptions" optionLabel="label" optionValue="value" [showClear]="true" placeholder="Any with role..." styleClass="w-full" /></div>
            <div class="field"><label>Due (days from now)</label><input pInputText [(ngModel)]="selectedNode.config['dueDays']" type="number" class="w-full" /></div>
            <div class="field"><label>Priority</label>
              <p-dropdown [(ngModel)]="selectedNode.config['priority']" [options]="priorityOptions" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
          </ng-container>

          <!-- AI Agent Config -->
          <ng-container *ngIf="selectedNode.type === 'ai_agent'">
            <div class="field"><label>Agent</label>
              <p-dropdown [(ngModel)]="selectedNode.config['agentId']" [options]="aiAgentOptions" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
            <div class="field"><label>Prompt</label><textarea pInputTextarea [(ngModel)]="selectedNode.config['prompt']" [rows]="3" class="w-full" placeholder="Analyze the risk..." aria-label="Analyze the risk..."></textarea></div>
          </ng-container>

          <!-- Escalation Config -->
          <ng-container *ngIf="selectedNode.type === 'escalation'">
            <div class="field"><label>Level 1</label>
              <p-dropdown [(ngModel)]="selectedNode.config['level1']" [options]="approverOptions" optionLabel="label" optionValue="value" [filter]="true" [showClear]="true" styleClass="w-full" /></div>
            <div class="field"><label>Level 2</label>
              <p-dropdown [(ngModel)]="selectedNode.config['level2']" [options]="approverOptions" optionLabel="label" optionValue="value" [filter]="true" [showClear]="true" styleClass="w-full" /></div>
            <div class="field"><label>Level 3</label>
              <p-dropdown [(ngModel)]="selectedNode.config['level3']" [options]="approverOptions" optionLabel="label" optionValue="value" [filter]="true" [showClear]="true" styleClass="w-full" /></div>
            <div class="field"><label>Delay (hours)</label><input pInputText [(ngModel)]="selectedNode.config['delayHours']" type="number" class="w-full" /></div>
            <div class="field"><label>Max Levels</label><input pInputText [(ngModel)]="selectedNode.config['maxLevels']" type="number" class="w-full" /></div>
          </ng-container>

          <!-- Governance Config -->
          <ng-container *ngIf="selectedNode.type === 'governance'">
            <div class="field"><label>Governance Type</label>
              <p-dropdown [(ngModel)]="selectedNode.config['govType']" [options]="governanceTypeOptions" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
            <div class="field"><label>Committee</label><input pInputText [(ngModel)]="selectedNode.config['committee']" class="w-full" placeholder="e.g. Risk Committee" aria-label="e.g. Risk Committee" /></div>
            <div class="field"><label>Quorum Required</label><input pInputText [(ngModel)]="selectedNode.config['quorum']" type="number" class="w-full" /></div>
            <div class="field"><label>SLA (hours)</label><input pInputText [(ngModel)]="selectedNode.config['slaHours']" type="number" class="w-full" /></div>
          </ng-container>

          <!-- Delay Config -->
          <ng-container *ngIf="selectedNode.type === 'delay'">
            <div class="field"><label>Delay (hours)</label><input pInputText [(ngModel)]="selectedNode.config['delayHours']" type="number" class="w-full" /></div>
            <div class="field"><label>Or until date</label><input pInputText [(ngModel)]="selectedNode.config['untilDate']" type="date" class="w-full" /></div>
          </ng-container>

          <!-- Loop Config -->
          <ng-container *ngIf="selectedNode.type === 'loop'">
            <div class="field"><label>Max Iterations</label><input pInputText [(ngModel)]="selectedNode.config['maxIterations']" type="number" class="w-full" /></div>
            <div class="field"><label>Exit Condition</label><textarea pInputTextarea [(ngModel)]="selectedNode.config['exitCondition']" [rows]="2" class="w-full" placeholder="status === 'complete'" aria-label="status === 'complete'"></textarea></div>
          </ng-container>

          <!-- Parallel Config -->
          <ng-container *ngIf="selectedNode.type === 'parallel'">
            <div class="field"><label>Parallel Branches</label><input pInputText [(ngModel)]="selectedNode.config['branches']" type="number" class="w-full" placeholder="2" aria-label="2" /></div>
            <div class="field"><label>Wait for All</label>
              <p-dropdown [(ngModel)]="selectedNode.config['waitAll']" [options]="[{label:'Yes',value:true},{label:'No (any)',value:false}]" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
          </ng-container>
        </div>
      </ng-container>

      <!-- Edge Config -->
      <ng-container *ngIf="selectedEdgeIndex !== null && !selectedNode && edges[selectedEdgeIndex]">
        <div class="config-header">
          <h4><i class="pi pi-arrow-right"></i> Edge</h4>
          <button aria-label="Close" class="close-btn" (click)="closeEdge.emit()"><i class="pi pi-times"></i></button>
        </div>
        <div class="config-body">
          <div class="field"><label>Label / Condition</label><input pInputText [(ngModel)]="edges[selectedEdgeIndex].label" class="w-full" placeholder="e.g. approved, score >= 10" /></div>
          <p-button [label]="i18n.translate('workflows.deleteEdge')" icon="pi pi-trash" severity="danger" [text]="true" (onClick)="deleteEdge.emit()" />
        </div>
      </ng-container>
    </div>
  `,
    styleUrls: ['../workflows.component.scss']
})
export class WorkflowDesignerConfigPanelComponent {
  readonly i18n = inject(I18nService);

  @Input() selectedNode: WorkflowNode | null = null;
  @Input() selectedEdgeIndex: number | null = null;
  @Input() edges: WorkflowEdge[] = [];

  // Option lists passed from parent
  @Input() roleOptions: { label: string; value: string }[] = [];
  @Input() teamMemberOptions: { label: string; value: string }[] = [];
  @Input() approverOptions: { label: string; value: string }[] = [];

  @Output() closeNode = new EventEmitter<void>();
  @Output() closeEdge = new EventEmitter<void>();
  @Output() deleteEdge = new EventEmitter<void>();

  /** Resolve the PrimeNG icon class for a given node type */
  nodeIcon(type: string): string {
    // Delegate to parent-provided nodeTypes or fallback
    const icons: Record<string, string> = {
      trigger: 'pi pi-bolt', end: 'pi pi-stop-circle', condition: 'pi pi-question-circle',
      action: 'pi pi-cog', approval: 'pi pi-thumbs-up', governance: 'pi pi-building',
      escalation: 'pi pi-arrow-up', api_call: 'pi pi-globe', send_email: 'pi pi-envelope',
      webhook: 'pi pi-link', db_query: 'pi pi-database', notification: 'pi pi-bell',
      create_task: 'pi pi-check-square', ai_agent: 'pi pi-microchip', delay: 'pi pi-clock',
      loop: 'pi pi-replay', parallel: 'pi pi-bars',
    };
    return icons[type] || 'pi pi-circle';
  }

  // -- Static option lists --

  triggerEventOptions = [
    { label: 'Risk Created', value: 'risk.created' },
    { label: 'Risk Score Changed', value: 'risk.score_changed' },
    { label: 'Control Evidence Uploaded', value: 'control.evidence_uploaded' },
    { label: 'Policy Approved', value: 'policy.approved' },
    { label: 'Audit Finding Created', value: 'audit.finding_created' },
    { label: 'Incident Reported', value: 'incident.reported' },
    { label: 'Vendor Assessment Due', value: 'vendor.assessment_due' },
    { label: 'Evidence Expired', value: 'evidence.expired' },
    { label: 'SLA Breached', value: 'sla.breached' },
    { label: 'Compliance Gap Found', value: 'compliance.gap_found' },
  ];

  httpMethods = [
    { label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' },
    { label: 'PUT', value: 'PUT' }, { label: 'DELETE', value: 'DELETE' },
  ];

  priorityOptions = [
    { label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }, { label: 'Critical', value: 'critical' },
  ];

  stepOperationModeOptions = [
    { label: 'Human Only', value: 'human_only' },
    { label: 'Shadow (suggest only)', value: 'hybrid_shadow' },
    { label: 'Hybrid Active', value: 'hybrid_active' },
    { label: 'Autonomous', value: 'autonomous' },
    { label: 'Scheduled', value: 'scheduled' },
  ];

  governanceTypeOptions = [
    { label: 'Committee Review', value: 'committee_review' },
    { label: 'Board Approval', value: 'board_approval' },
    { label: 'Regulatory Sign-off', value: 'regulatory_signoff' },
    { label: 'Risk Acceptance', value: 'risk_acceptance' },
  ];

  aiAgentOptions = [
    { label: 'Risk Analyst (A01)', value: 'risk-analyst' },
    { label: 'Compliance Officer (A02)', value: 'compliance-officer' },
    { label: 'Policy Drafter (A05)', value: 'policy-drafter' },
    { label: 'Incident Commander (A06)', value: 'incident-commander' },
    { label: 'Audit Preparer (A08)', value: 'audit-preparer' },
  ];
}
