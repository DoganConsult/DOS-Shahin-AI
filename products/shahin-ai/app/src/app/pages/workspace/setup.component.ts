import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceStubComponent } from './workspace-stub.component';
import { WorkspaceShellConfigService } from '../../shell/workspace-shell-config.service';

@Component({
  selector: 'app-workspace-setup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WorkspaceStubComponent],
  template: `<app-workspace-stub eyebrow="workspace" [title]="title()" [description]="desc()"></app-workspace-stub>`,
})
export class WorkspaceSetupComponent {
  readonly cfg = inject(WorkspaceShellConfigService);
  readonly title = computed(() => this.cfg.locale() === 'ar' ? 'قائمة الإعداد' : 'Setup checklist');
  readonly desc  = computed(() => this.cfg.locale() === 'ar' ? 'فعّل العمليات: الملف الشخصي، المستأجر، الوحدات والفريق.' : 'Activate operations: profile, tenant, modules and team.');
}
