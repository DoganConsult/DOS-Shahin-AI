/**
 * Risk Settings Page — uses ModuleSettingsTemplateComponent
 * Story: "Here's how Risk is configured — thresholds, appetite, roles."
 */
import {
  Component, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '@app/dauth/session/session.service';
import {
  ModuleSettingsTemplateComponent,
  ModuleSettingsSection
} from '@platform/shell/templates';
import {
  ToggleModule, SliderModule, NumberModule, StructuredListModule,
  AccordionModule, InputModule, BreadcrumbModule, TagModule
} from 'carbon-components-angular';

@Component({
  selector: 'app-risk-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ModuleSettingsTemplateComponent,
    ToggleModule, SliderModule, NumberModule, StructuredListModule,
    AccordionModule, InputModule, BreadcrumbModule, TagModule,
  ],
  template: `
    <dos-module-settings
      eyebrow="RISK / SETTINGS"
      title="Risk Settings"
      aiHeadline="AI recommends risk appetite threshold of 65 for your industry"
      subtitle="Configure risk appetite, scoring model, thresholds and workflow rules"
      [sections]="sections"
      [saving]="saving()"
      [currentRole]="currentRole()"
      [writeRoles]="writeRoles"
      (save)="onSave()"
      (discard)="onDiscard()">

      <!-- Section: General -->
      <div dosSettingsSection="general" style="padding: 1.5rem;">
        <h3 style="margin-bottom:1.5rem">General Configuration</h3>
        <cds-toggle
          [checked]="autoScoring()"
          (checkedChange)="autoScoring.set($event)"
          label="AI Auto-Scoring"
          offText="Disabled" onText="Enabled">
        </cds-toggle>
        <p style="font-size:0.875rem; color:var(--cds-text-secondary); margin:0.5rem 0 1.5rem">
          Automatically score new risks using AI model based on description and category.
        </p>
        <cds-toggle
          [checked]="autoNotify()"
          (checkedChange)="autoNotify.set($event)"
          label="Critical Risk Notifications"
          offText="Disabled" onText="Enabled">
        </cds-toggle>
      </div>

      <!-- Section: Thresholds -->
      <div dosSettingsSection="thresholds" style="padding: 1.5rem;">
        <h3 style="margin-bottom:1.5rem">Risk Thresholds</h3>
        <p style="font-size:0.875rem; margin-bottom:1rem">Risk Appetite Score (0–100)</p>
        <cds-slider
          [value]="riskAppetite()"
          [min]="0" [max]="100" [step]="5"
          (valueChange)="riskAppetite.set(+$event)"
          label="Risk Appetite">
        </cds-slider>
        <p style="font-size:0.875rem; color:var(--cds-text-secondary); margin-top:0.5rem">
          Current: {{ riskAppetite() }} — risks above this score require immediate treatment.
        </p>
        <br>
        <cds-number [value]="maxOpenRisks()" (valueChange)="maxOpenRisks.set(+$event)" label="Max Open Critical Risks"></cds-number>
      </div>

      <!-- Section: Roles -->
      <div dosSettingsSection="roles" style="padding: 1.5rem;">
        <h3 style="margin-bottom:1.5rem">Role Bindings</h3>
        <cds-structured-list>
          <cds-list-header>
            <cds-list-column>Role</cds-list-column>
            <cds-list-column>Permissions</cds-list-column>
          </cds-list-header>
          @for (binding of roleBindings; track binding.role) {
            <cds-list-row>
              <cds-list-column>{{ binding.role }}</cds-list-column>
              <cds-list-column>{{ binding.permissions }}</cds-list-column>
            </cds-list-row>
          }
        </cds-structured-list>
      </div>

      <!-- Section: Audit -->
      <div dosSettingsSection="audit" style="padding: 1.5rem;">
        <h3 style="margin-bottom:1.5rem">Audit Configuration</h3>
        <cds-toggle [checked]="auditEnabled()" (checkedChange)="auditEnabled.set($event)"
          label="Audit Trail" offText="Disabled" onText="Enabled">
        </cds-toggle>
        <br><br>
        <cds-accordion>
          <cds-accordion-item title="What is audited?">
            Risk creation, modification, status change, treatment assignment, assessment completion.
          </cds-accordion-item>
          <cds-accordion-item title="Retention period">
            All audit events retained for 7 years per policy.
          </cds-accordion-item>
        </cds-accordion>
      </div>
    </dos-module-settings>
  `
})
export class RiskSettingsPageComponent {
  private auth = inject(SessionService);
  currentRole = computed(() => this.auth.currentRole?.() ?? 'standard_user');
  readonly writeRoles = ['risk_manager', 'role_risk_manager', 'tenant_admin', 'role_tenant_owner', 'platform_super_admin'];

  saving = signal(false);
  autoScoring = signal(true);
  autoNotify  = signal(true);
  riskAppetite = signal(65);
  maxOpenRisks = signal(10);
  auditEnabled = signal(true);

  readonly sections: ModuleSettingsSection[] = [
    { id: 'general',    label: 'General' },
    { id: 'thresholds', label: 'Thresholds' },
    { id: 'roles',      label: 'Roles' },
    { id: 'audit',      label: 'Audit' },
  ];

  readonly roleBindings = [
    { role: 'risk_manager', permissions: 'read, write, manage, approve, treatment.assign, assessment.*' },
    { role: 'tenant_admin', permissions: 'All risk.* permissions' },
    { role: 'standard_user', permissions: 'risk.record.submit, risk.record.update' },
  ];

  onSave()    { this.saving.set(true); setTimeout(() => this.saving.set(false), 1500); }
  onDiscard() { this.autoScoring.set(true); this.riskAppetite.set(65); }
}
